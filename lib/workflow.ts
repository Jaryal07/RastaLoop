import { destinations, findTrip, nodes, segments } from './corridor.ts'
import type { Destination } from './corridor.ts'

export const categories = {
  ramp: 'Blocked ramp',
  footpath: 'Broken footpath',
  waste: 'Waste obstruction',
  water: 'Waterlogging',
} as const
export const observations = {
  blocked: 'Passage blocked',
  difficult: 'Difficult to pass',
  uncertain: 'Needs a closer look',
} as const
export const caseStatuses = {
  reported: 'Needs verification', verified: 'Verified', assigned: 'Assigned', recheck: 'Awaiting recheck', closed: 'Closed', dismissed: 'Dismissed',
} as const
export const dismissalReasons = {
  clear: 'Passage clear on inspection',
  location: 'Report refers to a different segment',
} as const

export const actors = {
  resident: { name: 'Resident', person: 'Asha' },
  reviewer: { name: 'Reviewer', person: 'Isha' },
  operator: { name: 'Operator', person: 'Dev' },
  inspector: { name: 'Rechecker', person: 'Noor' },
} as const
export const evidence = {
  'passage-cleared': 'Passage cleared and surface checked',
  'surface-repaired': 'Surface repaired and passage checked',
} as const

type Category = keyof typeof categories
type ObservationKind = keyof typeof observations
type Status = keyof typeof caseStatuses
export type Actor = keyof typeof actors
export type Evidence = keyof typeof evidence
type EventKind = 'report' | 'observe' | 'verify' | 'assign' | 'repair' | 'pass' | 'fail' | 'dismiss'

export type Observation = { at: string; kind: ObservationKind }
export type CaseEvent = { at: string; actor: Actor; kind: EventKind; detail: string }
export type Issue = {
  id: string
  segmentId: string
  category: Category
  status: Status
  observations: Observation[]
  history: CaseEvent[]
  verifiedAt?: string
  repair?: { at: string; actor: Actor; evidence: Evidence }
}
export type DemoState = { cases: Issue[] }
export type Action =
  | { kind: 'report'; actor: 'resident'; segmentId: string; category: Category; observation: ObservationKind; duplicateChoice?: 'separate' }
  | { kind: 'observe'; actor: 'resident'; caseId: string; segmentId: string; category: Category; observation: ObservationKind }
  | { kind: 'verify' | 'assign' | 'pass' | 'fail'; actor: Actor; caseId: string }
  | { kind: 'dismiss'; actor: Actor; caseId: string; reason: keyof typeof dismissalReasons }
  | { kind: 'repair'; actor: Actor; caseId: string; evidence: Evidence }

export class WorkflowError extends Error {}

const expectedActor: Record<EventKind, Actor> = {
  report: 'resident', observe: 'resident', verify: 'reviewer', assign: 'operator', repair: 'operator', pass: 'inspector', fail: 'inspector', dismiss: 'reviewer',
}

export function seedDemo(now: Date): DemoState {
  const first = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const verified = new Date(now.getTime() - 45 * 60 * 1000).toISOString()
  return { cases: [{
    id: 'sample-service-lane', segmentId: 'service-path', category: 'waste', status: 'verified', verifiedAt: verified,
    observations: [{ at: first, kind: 'blocked' }],
    history: [
      { at: first, actor: 'resident', kind: 'report', detail: 'Passage blocked' },
      { at: verified, actor: 'reviewer', kind: 'verify', detail: 'Obstruction confirmed on the market service lane' },
    ],
  }] }
}

export function matchingCases(state: DemoState, segmentId: string, category: string): Issue[] {
  return state.cases.filter(issue => issue.segmentId === segmentId && issue.category === category && issue.status !== 'closed' && issue.status !== 'dismissed')
}

export function isBlocking(issue: Issue): boolean {
  return issue.status === 'verified' || issue.status === 'assigned' || issue.status === 'recheck'
}

export function blockedSegments(state: DemoState, except?: string): Set<string> {
  return new Set(state.cases.filter(issue => isBlocking(issue) && issue.id !== except).map(issue => issue.segmentId))
}

export type Priority = { restored: Destination[]; savedMetres: number; explanation: string }

export function rankedCases(state: DemoState): { issue: Issue; priority: Priority }[] {
  const blocked = blockedSegments(state)
  const current = destinations.map(destination => findTrip(destination, 'step-free', blocked))
  return state.cases.filter(isBlocking).map(issue => {
    const after = blockedSegments(state, issue.id)
    const restored: Destination[] = []
    let savedMetres = 0
    destinations.forEach((destination, index) => {
      const beforeTrip = current[index]
      const afterTrip = findTrip(destination, 'step-free', after)
      if (!afterTrip) return
      if (!beforeTrip) restored.push(destination)
      else savedMetres += beforeTrip.metres - afterTrip.metres
    })
    let explanation = 'No change to the surveyed step-free trips in this corridor.'
    if (restored.length) {
      explanation = `Restores step-free access to ${restored.map(destination => nodes[destination].label.toLowerCase()).join(' and ')}.`
    } else if (savedMetres) {
      explanation = `Saves ${savedMetres} m across reachable step-free trips.`
    } else if (after.has(issue.segmentId)) {
      explanation = 'Another verified obstruction still blocks this segment.'
    }
    return { issue, priority: { restored, savedMetres, explanation } }
  }).sort((left, right) => right.priority.restored.length - left.priority.restored.length
    || right.priority.savedMetres - left.priority.savedMetres
    || (left.issue.verifiedAt ?? '').localeCompare(right.issue.verifiedAt ?? '')
    || left.issue.id.localeCompare(right.issue.id))
}

export function applyAction(state: DemoState, action: Action, at: string, newId: string): DemoState {
  if (expectedActor[action.kind] !== action.actor) throw new WorkflowError('Switch to the appropriate demo role for this action.')
  if (state.cases.reduce((count, issue) => count + issue.history.length, 0) >= 100) {
    throw new WorkflowError('This demo has reached its action limit. Reset to start over.')
  }

  if (action.kind === 'report') {
    if (matchingCases(state, action.segmentId, action.category).length && action.duplicateChoice !== 'separate') {
      throw new WorkflowError('An active match exists. Add an observation or choose to start a separate case.')
    }
    return { cases: [...state.cases, {
      id: newId, segmentId: action.segmentId, category: action.category, status: 'reported',
      observations: [{ at, kind: action.observation }],
      history: [{ at, kind: action.kind, actor: action.actor, detail: observations[action.observation] }],
    }] }
  }

  const issue = state.cases.find(candidate => candidate.id === action.caseId)
  if (!issue) throw new WorkflowError('This case is no longer available. Choose a case from the current queue.')
  let update: Partial<Issue>
  let detail: string

  switch (action.kind) {
    case 'observe':
      if (!matchingCases(state, action.segmentId, action.category).some(candidate => candidate.id === issue.id)) {
        throw new WorkflowError('Choose an active case with the same segment and category.')
      }
      update = { observations: [...issue.observations, { at, kind: action.observation }] }
      detail = observations[action.observation]
      break
    case 'dismiss':
      requireStatus(issue, 'reported')
      update = { status: 'dismissed' }
      detail = dismissalReasons[action.reason]
      break
    case 'verify':
      requireStatus(issue, 'reported')
      update = { status: 'verified', verifiedAt: at }
      detail = 'Obstruction verified. Trip availability recalculated.'
      break
    case 'assign':
      requireStatus(issue, 'verified')
      update = { status: 'assigned' }
      detail = 'Assigned to the simulated maintenance team.'
      break
    case 'repair':
      requireStatus(issue, 'assigned')
      update = { status: 'recheck', repair: { at, actor: action.actor, evidence: action.evidence } }
      detail = evidence[action.evidence]
      break
    case 'pass':
    case 'fail':
      requireStatus(issue, 'recheck')
      if (!issue.repair || issue.repair.actor === action.actor) throw new WorkflowError('A different person must recheck the repair.')
      update = { status: action.kind === 'pass' ? 'closed' : 'verified' }
      detail = action.kind === 'pass' ? 'Passage rechecked and clear. Trip availability recalculated.' : 'Passage remains blocked. Case returned to the repair queue.'
      break
  }

  const next = { ...issue, ...update, history: [...issue.history, { at, actor: action.actor, kind: action.kind, detail }] }
  return { cases: state.cases.map(candidate => candidate.id === issue.id ? next : candidate) }
}

function requireStatus(issue: Issue, status: Status) {
  if (issue.status !== status) throw new WorkflowError('This action is unavailable for the current case status.')
}

function hasKey<T extends object>(object: T, key: unknown): key is keyof T {
  return typeof key === 'string' && Object.hasOwn(object, key)
}

export function parseAction(input: unknown): { version: number; action: Action } | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Record<string, unknown>
  const { version, kind, actor, caseId, segmentId, category, observation } = value
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0 || !hasKey(expectedActor, kind) || !hasKey(actors, actor)) return null

  if (kind === 'report' || kind === 'observe') {
    if (actor !== 'resident' || typeof segmentId !== 'string' || !segments.some(segment => segment.id === segmentId)
      || !hasKey(categories, category) || !hasKey(observations, observation)) return null
    if (kind === 'report') {
      if (value.duplicateChoice !== undefined && value.duplicateChoice !== 'separate') return null
      return { version, action: { kind, actor, segmentId, category, observation, duplicateChoice: value.duplicateChoice } }
    }
    if (typeof caseId !== 'string' || caseId.length > 64) return null
    return { version, action: { kind, actor, segmentId, category, observation, caseId } }
  }

  if (typeof caseId !== 'string' || caseId.length > 64) return null
  if (kind === 'dismiss') {
    if (!hasKey(dismissalReasons, value.reason)) return null
    return { version, action: { kind, actor, caseId, reason: value.reason } }
  }
  if (kind === 'repair') {
    if (!hasKey(evidence, value.evidence)) return null
    return { version, action: { kind, actor, caseId, evidence: value.evidence } }
  }
  return { version, action: { kind, actor, caseId } }
}
