import type { NextRequest } from 'next/server'
import { databaseError, reply, sameOriginJson } from '../../../lib/http'
import { loadSession, newSession, sessionAge, sessionCookie } from '../../../lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await loadSession(request.cookies.get(sessionCookie)?.value)
    if (!session) return reply({ message: 'Start a new demo session.' }, 404)
    return reply({ version: session.version, state: session.state })
  } catch (error) {
    return databaseError(error)
  }
}

export async function POST(request: NextRequest) {
  if (!sameOriginJson(request)) return reply({ message: 'Use a same-origin JSON request.' }, 403)
  try {
    const session = await newSession()
    const response = reply({ version: session.version, state: session.state }, 201)
    response.cookies.set(sessionCookie, session.id, {
      httpOnly: true, sameSite: 'lax', secure: process.env.VERCEL === '1' || request.nextUrl.protocol === 'https:', maxAge: sessionAge, path: '/api/demo',
    })
    return response
  } catch (error) {
    return databaseError(error)
  }
}
