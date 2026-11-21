import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function sameOriginJson(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  if (contentType !== 'application/json') return false
  const origin = request.headers.get('origin')
  if (!origin) return true

  // Next can normalize loopback names and see internal HTTP behind Vercel's HTTPS endpoint.
  const host = request.headers.get('host') ?? request.nextUrl.host
  const protocol = process.env.VERCEL === '1' ? 'https:' : request.nextUrl.protocol
  return origin === `${protocol}//${host}`
}

export function databaseError(error: unknown) {
  console.error('[RastaLoop] Demo storage unavailable:', error instanceof Error ? error.message : 'Unknown error')
  return reply({ message: 'Demo storage is temporarily unavailable. Try again in a moment.' }, 503)
}
