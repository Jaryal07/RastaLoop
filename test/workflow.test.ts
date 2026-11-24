import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findTrip, segments } from '../lib/corridor.ts'
import { applyAction, blockedSegments, parseAction, rankedCases, seedDemo, WorkflowError } from '../lib/workflow.ts'
import type { Action, DemoState } from '../lib/workflow.ts'

const time = '2026-11-21T17:30:00.000Z'
const report = { kind: 'report', actor: 'resident', segmentId: 'ramp', category: 'ramp', observation: 'blocked' } as const
const change = (state: DemoState, action: Action, id = 'clinic-ramp') => applyAction(state, action, time, id)
const original = () => seedDemo(new Date(time))
const clinic = (state: DemoState) => findTrip('clinic', 'step-free', blockedSegments(state))?.metres

test('a verified ramp blockage removes the clinic route until a distinct rechecker passes it', () => {
  let state = original()
  assert.equal(clinic(state), 320)
  state = change(state, report)
  assert.equal(clinic(state), 320)
  state = change(state, { kind: 'verify', actor: 'reviewer', caseId: 'clinic-ramp' })
  assert.equal(clinic(state), undefined)
  assert.equal(findTrip('clinic', 'steps-allowed', blockedSegments(state))?.metres, 590)
  assert.equal(findTrip('bus', 'step-free', blockedSegments(state))?.metres, 250)
  assert.deepEqual(rankedCases(state).map(item => [item.issue.id, item.priority.restored]), [['clinic-ramp', ['clinic']], ['sample-service-lane', []]])

  const assign = { kind: 'assign', actor: 'operator', caseId: 'clinic-ramp' } as const
  const repair = { kind: 'repair', actor: 'operator', caseId: 'clinic-ramp', evidence: 'passage-cleared' } as const
  state = change(change(state, assign), repair)
  assert.equal(clinic(state), undefined)
  assert.throws(() => change(state, { kind: 'pass', actor: 'operator', caseId: 'clinic-ramp' }), WorkflowError)
  state = change(state, { kind: 'fail', actor: 'inspector', caseId: 'clinic-ramp' })
  assert.equal(state.cases[1].status, 'verified')
  assert.equal(clinic(state), undefined)
  state = change(change(state, assign), repair)
  state = change(state, { kind: 'pass', actor: 'inspector', caseId: 'clinic-ramp' })
  assert.equal(clinic(state), 320)
  assert.equal(state.cases[1].status, 'closed')
  assert.deepEqual(state.cases[1].history.map(event => event.kind), ['report', 'verify', 'assign', 'repair', 'fail', 'assign', 'repair', 'pass'])
})

test('observations attach to matching active cases and separate cases require explicit choice', () => {
  const initial = change(original(), report)
  assert.throws(() => change(initial, report, 'second'), WorkflowError)
  const observation = { ...report, kind: 'observe', caseId: 'clinic-ramp', observation: 'difficult' } as const
  const observed = change(initial, observation)
  assert.equal(observed.cases.length, initial.cases.length)
  assert.deepEqual(observed.cases[1].observations.map(item => item.kind), ['blocked', 'difficult'])
  assert.throws(() => change(initial, { ...observation, caseId: 'sample-service-lane' }), WorkflowError)
  assert.equal(change(observed, { ...report, duplicateChoice: 'separate' }, 'second').cases.length, 3)
})

test('one repair cannot reopen a segment with two verified blockers', () => {
  let state = change(original(), report)
  state = change(state, { ...report, category: 'water' }, 'second')
  state = change(state, { kind: 'verify', actor: 'reviewer', caseId: 'clinic-ramp' })
  state = change(state, { kind: 'verify', actor: 'reviewer', caseId: 'second' })
  const priority = rankedCases(state).find(item => item.issue.id === 'clinic-ramp')?.priority
  assert.equal(priority?.restored.length, 0)
  assert.match(priority?.explanation ?? '', /Another verified obstruction/)
  state = change(state, { kind: 'assign', actor: 'operator', caseId: 'clinic-ramp' })
  state = change(state, { kind: 'repair', actor: 'operator', caseId: 'clinic-ramp', evidence: 'passage-cleared' })
  state = change(state, { kind: 'pass', actor: 'inspector', caseId: 'clinic-ramp' })
  assert.equal(clinic(state), undefined)
  assert.deepEqual(rankedCases(state)[0].priority.restored, ['clinic'])
})

test('verified impact accounts for detours before oldest-first prioritization', () => {
  const state = change(change(original(), { ...report, segmentId: 'bus-path' }, 'direct-bus'),
    { kind: 'verify', actor: 'reviewer', caseId: 'direct-bus' })
  assert.equal(findTrip('bus', 'step-free', blockedSegments(state)), null)
  assert.deepEqual(rankedCases(state).map(item => item.priority.restored), [['bus'], ['bus']])
  const busDetour = { cases: state.cases.filter(issue => issue.id !== 'sample-service-lane') }
  assert.equal(findTrip('bus', 'step-free', blockedSegments(busDetour))?.metres, 460)
  assert.equal(rankedCases(busDetour)[0].priority.savedMetres, 210)
})

test('unknown step-free eligibility is excluded from the step-free profile', () => {
  const unknown = segments.map(segment => segment.id === 'ramp' ? { ...segment, stepFree: null } : segment)
  assert.equal(findTrip('clinic', 'step-free', new Set(), unknown), null)
  assert.equal(findTrip('clinic', 'steps-allowed', new Set(), unknown)?.metres, 320)
})

test('API action validation rejects invalid values and negative versions', () => {
  assert.equal(parseAction({ ...report, version: -1 }), null)
  assert.equal(parseAction({ ...report, version: 0, category: '__proto__' }), null)
  assert.equal(parseAction({ ...report, version: 0, duplicateChoice: 'yes' }), null)
  assert.equal(parseAction({ ...report, version: 0, segmentId: 'undocumented' }), null)
  assert.equal(parseAction({ ...report, version: 0, actor: 'operator' }), null)
  assert.equal(parseAction({ ...report, version: 0 })?.action.kind, 'report')
})

test('a reviewer can dismiss an unverified report and record the reason without changing access', () => {
  const state = change(original(), report)
  const action = { kind: 'dismiss', actor: 'reviewer', caseId: 'clinic-ramp', reason: 'clear' } as const
  assert.equal(parseAction({ ...action, reason: 'invalid', version: 1 }), null)
  assert.throws(() => change(state, { ...action, actor: 'operator' }), WorkflowError)
  const reviewed = change(state, action)
  assert.equal(reviewed.cases.at(-1)?.history.at(-1)?.detail, 'Passage clear on inspection')
  assert.equal(reviewed.cases.at(-1)?.status, 'dismissed')
  assert.equal(clinic(reviewed), 320)
  assert.throws(() => change(reviewed, action), WorkflowError)
  assert.equal(change(reviewed, report, 'second-report').cases.at(-1)?.status, 'reported')
})
