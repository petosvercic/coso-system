import { NextRequest, NextResponse } from 'next/server';

function unauthorizedResponse() {
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"'
    }
  });
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/cron')) {
    return NextResponse.next();
  }

  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASS;

  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Basic ')) {
    return unauthorizedResponse();
  }

  const base64Credentials = authHeader.split(' ')[1] ?? '';
  const credentials = Buffer.from(base64Credentials, 'base64').toString();
  const [user, pass] = credentials.split(':');

  if (user !== expectedUser || pass !== expectedPass) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
