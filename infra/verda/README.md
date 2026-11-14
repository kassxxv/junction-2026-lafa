# Gemma proxy on Verda

Gives the deployed app (Vercel) and every laptop the same Gemma endpoint, without an SSH tunnel:

```
App ──HTTPS + Bearer token──► Caddy on Verda :443 ──► Ollama 127.0.0.1:11434
```

## Set up (once, ~5 minutes)

Run these in **your own terminal**, not inside an AI chat: the last step prints the secret token.

```bash
scp infra/verda/setup-gemma-proxy.sh <user>@<verda-server>:~
ssh <user>@<verda-server> "sudo bash ~/setup-gemma-proxy.sh"
```

Then copy the two printed lines (`GEMMA_BASE_URL`, `GEMMA_API_KEY`) into:

- your local `.env`
- Vercel → Settings → Environment Variables (also add `GEMMA_MODEL=gemma3:12b`), then redeploy

Check: `GET /api/health` shows `gemma: ok`.

## Notes

- Ollama stays bound to `127.0.0.1`; only Caddy is reachable from outside (ports 80 for the certificate check, 443 for HTTPS).
- The token lives in `/root/gemma-proxy-token` on the server. Re-running the script keeps the same token; delete that file to rotate it.
- `OLLAMA_KEEP_ALIVE=2h` keeps the model in GPU memory, so requests don't wait for a reload.
- The server costs about €1.5/h. Delete it after the submission (see `docs/CONTEXT.md`).
