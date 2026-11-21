import { randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { databaseError, reply, sameOriginJson } from '../../../../lib/http'
import { loadSession, saveSession, sessionCookie } from '../../../../lib/session'
import { applyAction, parseAction, WorkflowError } from '../../../../lib/workflow'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!sameOriginJson(request)) return reply({ message: 'Use a same-origin JSON request.' }, 403)
  const input = await request.json().catch(() => null)
  const parsed = parseAction(input)
  if (!parsed) return reply({ message: 'Choose a valid case action and try again.' }, 400)

  const id = request.cookies.get(sessionCookie)?.value
  try {
    const session = await loadSession(id)
    if (!session) return reply({ message: 'This session expired. Reset the demo to continue.' }, 404)
    if (session.version === parsed.version) {
      const state = applyAction(session.state, parsed.action, new Date().toISOString(), randomUUID())
      if (await saveSession(session, state)) return reply({ state, version: session.version + 1 })
    }
    const current = await loadSession(id)
    if (!current) return reply({ message: 'This session expired. Reset the demo to continue.' }, 404)
    return reply({ version: current.version, state: current.state, message: 'The demo changed in another request. The latest state is shown. Please try again.' }, 409)
  } catch (error) {
    if (error instanceof WorkflowError) return reply({ message: error.message }, 422)
    return databaseError(error)
  }
}
