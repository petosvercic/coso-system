import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/e/",          // edície sú verejné
  "/api/compute", // výpočet musí byť verejný
  "/api/stripe",  // checkout+webhook musia byť verejné
];

const PRIVATE_PREFIXES = [
  "/builder",
  "/editions",
  "/",
];

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // allow public prefixes
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // only guard specific private routes (builder + editions + homepage)
  if (!PRIVATE_PREFIXES.some(p => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const need = process.env.FACTORY_KEY;
  if (!need) {
    // if no key configured, fail closed for safety
    return NextResponse.redirect(new URL("/e/demo-odomykanie", req.url));
  }

  const got = searchParams.get("key") || req.headers.get("x-factory-key");
  if (got && got === need) return NextResponse.next();

  // redirect anonymous visitors to a public edition (or landing)
  return NextResponse.redirect(new URL("/e/demo-odomykanie", req.url));
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};