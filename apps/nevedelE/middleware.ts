import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/builder",
  "/list",
  "/api/build",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const token = process.env.FACTORY_TOKEN;
  if (!token) {
    // fail closed: if token missing, do NOT expose factory routes
    return new NextResponse("FACTORY_TOKEN_MISSING", { status: 401 });
  }

  const cookieOk = req.cookies.get("factory")?.value === "1";
  const headerOk = req.headers.get("x-factory-token") === token;

  if (cookieOk || headerOk) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/factory-login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/builder", "/builder/:path*", "/list", "/list/:path*", "/api/build/:path*"],
};