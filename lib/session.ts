import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { seedDemo } from './workflow.ts'
import type { DemoState } from './workflow.ts'

export const sessionCookie = 'rastaloop-demo'
export const sessionAge = 24 * 60 * 60

type Session = { id: string; version: number; expires_at: string; state: DemoState }
type LocalRow = Omit<Session, 'state'> & { state: string }
type Store = {
  create: (row: Session) => Promise<void>
  read: (id: string, now: string) => Promise<Session | null>
  write: (row: Session, expectedVersion: number, now: string) => Promise<boolean>
}

let localDb: DatabaseSync | undefined

function sqlite(): DatabaseSync {
  if (localDb) return localDb
  const path = resolve(process.env.RASTALOOP_DB_PATH || '.rastaloop/demo.sqlite')
  mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA busy_timeout = 3000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS demo_sessions (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      state TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS demo_sessions_expiry ON demo_sessions (expires_at);
  `)
  localDb = db
  return db
}

const local: Store = {
  async create(row) {
    const db = sqlite()
    db.prepare('DELETE FROM demo_sessions WHERE expires_at <= ?').run(new Date().toISOString())
    db.prepare('INSERT INTO demo_sessions (id, version, expires_at, state) VALUES (?, ?, ?, ?)')
      .run(row.id, row.version, row.expires_at, JSON.stringify(row.state))
  },
  async read(id, now) {
    const row = sqlite().prepare('SELECT * FROM demo_sessions WHERE id = ? AND expires_at > ?').get(id, now) as LocalRow | undefined
    return row ? { ...row, state: JSON.parse(row.state) as DemoState } : null
  },
  async write(row, expectedVersion, now) {
    const result = sqlite().prepare('UPDATE demo_sessions SET version = ?, state = ? WHERE id = ? AND version = ? AND expires_at > ?')
      .run(row.version, JSON.stringify(row.state), row.id, expectedVersion, now)
    return result.changes === 1
  },
}

function supabase(url: string, key: string): Store {
  async function request(query: URLSearchParams, method = 'GET', data?: unknown) {
    const endpoint = new URL('/rest/v1/demo_sessions', url)
    endpoint.search = query.toString()
    const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' }
    // Legacy service-role JWTs use Bearer auth. New secret keys use the apikey header.
    if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`
    if (method === 'PATCH') headers.Prefer = 'return=representation'
    const response = await fetch(endpoint, { method, headers, body: data === undefined ? undefined : JSON.stringify(data), cache: 'no-store' })
    if (!response.ok) throw new Error(`Demo database returned ${response.status}`)
    return response
  }

  return {
    async create(row) {
      await request(new URLSearchParams(), 'POST', row)
    },
    async read(id, now) {
      const response = await request(new URLSearchParams({ id: `eq.${id}`, expires_at: `gt.${now}`, limit: '1' }))
      const [row] = await response.json() as Session[]
      return row ?? null
    },
    async write(row, expectedVersion, now) {
      const response = await request(new URLSearchParams({ id: `eq.${row.id}`, version: `eq.${expectedVersion}`, expires_at: `gt.${now}` }),
        'PATCH', { version: row.version, state: row.state })
      const updated = await response.json() as Session[]
      return updated.length === 1
    },
  }
}

function store(): Store {
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env
  if (url && key) return supabase(url, key)
  if (url || key || process.env.VERCEL === '1') throw new Error('Supabase requires a URL and server key.')
  return local
}

export async function newSession(): Promise<Session> {
  const now = new Date()
  const row = { id: randomUUID(), version: 0, state: seedDemo(now), expires_at: new Date(now.getTime() + sessionAge * 1000).toISOString() }
  await store().create(row)
  return row
}

export async function loadSession(id: string | undefined): Promise<Session | null> {
  if (!id || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)) return null
  return store().read(id, new Date().toISOString())
}

export function saveSession(row: Session, state: DemoState) {
  return store().write({ ...row, version: row.version + 1, state }, row.version, new Date().toISOString())
}
