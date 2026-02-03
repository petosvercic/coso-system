import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/e/",
  "/api/compute",
  "/api/stripe/",
  "/api/pay/",
  "/_next/",
  "/favicon.ico",
];

const PROTECTED_PREFIXES = [
  "/builder",
  "/list",
  "/editions",
  "/api/build",
  "/api/builder",
  "/api/github",
  "/api/factory",
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// ✅ Next.js Turbopack proxy entrypoint (replaces middleware)
export default function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // public product pages
  if (isPublic(pathname) || !isProtected(pathname)) {
    return NextResponse.next();
  }

  const token = (process.env.FACTORY_TOKEN || "").trim();
  if (!token) {
    // fail closed: if token not configured, don't expose factory
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};