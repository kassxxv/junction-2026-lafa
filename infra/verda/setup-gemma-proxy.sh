#!/usr/bin/env bash
# Puts an authenticated HTTPS proxy (Caddy) in front of Ollama on the Verda server.
#
#   Internet ──HTTPS + "Authorization: Bearer <token>"──► Caddy :443 ──► Ollama 127.0.0.1:11434
#
# Run ON THE SERVER as root:   sudo bash setup-gemma-proxy.sh [hostname]
# Without a hostname it uses <public-ip>.sslip.io (free DNS that points to your IP).
#
# The token is generated here and printed only in YOUR terminal. Never paste it into
# a chat or commit it: put it in .env (GEMMA_API_KEY) and in Vercel's environment settings.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "Run as root: sudo bash $0" >&2; exit 1; fi

HOST="${1:-}"
if [[ -z "$HOST" ]]; then
  IP="$(curl -4 -fsS https://api.ipify.org)"
  HOST="${IP//./-}.sslip.io"
fi
echo "==> Proxy hostname: $HOST"

echo "==> Checking Ollama listens only on localhost"
if ss -ltn | grep -qE '(0\.0\.0\.0|\[::\]|\*):11434'; then
  echo "WARNING: Ollama listens on all interfaces. Set OLLAMA_HOST=127.0.0.1:11434 so only Caddy can reach it." >&2
fi

echo "==> Keeping the model loaded between requests (OLLAMA_KEEP_ALIVE=2h)"
if systemctl list-unit-files | grep -q '^ollama.service'; then
  mkdir -p /etc/systemd/system/ollama.service.d
  cat > /etc/systemd/system/ollama.service.d/keepalive.conf <<'EOF'
[Service]
Environment="OLLAMA_KEEP_ALIVE=2h"
Environment="OLLAMA_HOST=127.0.0.1:11434"
EOF
  systemctl daemon-reload
  systemctl restart ollama
else
  echo "    (no ollama systemd service found; set OLLAMA_KEEP_ALIVE=2h where you start Ollama)"
fi

echo "==> Installing Caddy"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get update -y
  if ! apt-get install -y caddy; then
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y
    apt-get install -y caddy
  fi
fi

echo "==> Creating the access token"
TOKEN_FILE=/root/gemma-proxy-token
if [[ ! -s "$TOKEN_FILE" ]]; then
  umask 077
  openssl rand -hex 32 > "$TOKEN_FILE"
fi
TOKEN="$(cat "$TOKEN_FILE")"

echo "==> Writing /etc/caddy/Caddyfile"
cat > /etc/caddy/Caddyfile <<EOF
$HOST {
	@authorized header Authorization "Bearer $TOKEN"
	handle @authorized {
		reverse_proxy 127.0.0.1:11434 {
			# Ollama on localhost rejects foreign Host headers (403), so present it as local.
			header_up Host localhost:11434
			header_up -Origin
			flush_interval -1
			transport http {
				read_timeout 300s
			}
		}
	}
	handle {
		respond "Unauthorized" 401
	}
}
EOF
chown root:caddy /etc/caddy/Caddyfile
chmod 640 /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null

echo "==> Opening ports 80 (certificate check) and 443 (HTTPS)"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp
  ufw allow 443/tcp
fi

systemctl enable caddy >/dev/null 2>&1 || true
systemctl restart caddy

echo "==> Waiting for the HTTPS certificate"
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "https://$HOST/v1/models" -H "Authorization: Bearer $TOKEN" 2>/dev/null; then break; fi
  sleep 2
done

WITH=$(curl -s -o /dev/null -w "%{http_code}" "https://$HOST/v1/models" -H "Authorization: Bearer $TOKEN" || true)
WITHOUT=$(curl -s -o /dev/null -w "%{http_code}" "https://$HOST/v1/models" || true)
echo "==> Check: with token HTTP $WITH (want 200), without token HTTP $WITHOUT (want 401)"

cat <<EOF

Done. Put these two lines in your local .env AND in Vercel → Settings → Environment Variables
(keep GEMMA_MODEL=gemma3:12b). Do not paste them into any chat.

GEMMA_BASE_URL=https://$HOST/v1
GEMMA_API_KEY=$TOKEN

If the check above is not 200/401: make sure ports 80 and 443 are open in the Verda
firewall / security group, then run:  journalctl -u caddy -n 50
EOF
