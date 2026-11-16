import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Fast, optimistic gate only: no cookie -> sign in. Pages verify the real session
// on the server (a leftover cookie for a deleted/expired session must never loop).
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/sign-in" || path === "/sign-up";

  if (!isAuthPage && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|icon|apple-icon|icons|manifest.webmanifest|favicon.ico).*)",
  ],
};
