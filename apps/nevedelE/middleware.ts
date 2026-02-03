import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Factory"' },
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // PUBLIC: product pages + editions runtime
  if (
    pathname === "/" ||
    pathname.startsWith("/e/") ||
    pathname.startsWith("/api/compute") ||
    pathname.startsWith("/api/stripe/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/public/")
  ) {
    return NextResponse.next();
  }

  // PRIVATE: factory/admin surface
  const isFactory =
    pathname.startsWith("/builder") ||
    pathname.startsWith("/editions") ||
    pathname.startsWith("/api/builder") ||
    pathname.startsWith("/api/github");

  if (!isFactory) return NextResponse.next();

  const user = process.env.FACTORY_USER || "";
  const pass = process.env.FACTORY_PASS || "";
  if (!user || !pass) return unauthorized();

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) return unauthorized();

  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
  const [u, p] = decoded.split(":");

  if (u === user && p === pass) return NextResponse.next();
  return unauthorized();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};