import { NextResponse, type NextRequest } from "next/server";
import { gateMode, LOGIN_PATH, ORGANISER_COOKIE, verifySessionToken } from "./lib/organiser-session";

/**
 * Shared-password gate for the organiser workspace and its API (docs/HANDOFF.md §5).
 * This is the first line only: Server Actions are POSTs to whatever page calls them, so every
 * organiser action and the export route check the session again themselves (lib/auth.ts).
 */
export async function proxy(request: NextRequest) {
  const password = process.env.ORGANISER_PASSWORD;
  const mode = gateMode(password, process.env.NODE_ENV);
  if (mode === "open") return NextResponse.next();
  if (mode === "password" && (await verifySessionToken(password!, request.cookies.get(ORGANISER_COOKIE)?.value))) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return new NextResponse("Sign in as an organiser first.", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const login = request.nextUrl.clone();
  login.pathname = LOGIN_PATH;
  login.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/organiser/:path*", "/api/organiser/:path*"],
};
