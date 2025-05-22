// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define public routes that don’t require auth:
const PUBLIC_PATHS = ["/login", "/signup", "/_next", "/favicon.ico"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public assets & login/signup pages
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Read our custom auth cookie (set this on login)
  const token = req.cookies.get("token")?.value

  // If no token, redirect to /login
  if (!token) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = "/login"
    return NextResponse.redirect(loginUrl)
  }

  // Optionally: decode token and check role, e.g. only supervisors can access /teachers/new
  // const payload = verifyJwt(token)
  // if (pathname.startsWith("/teachers/new") && payload.role !== "supervisor") {
  //   return NextResponse.redirect("/unauthorized")
  // }

  return NextResponse.next()
}
