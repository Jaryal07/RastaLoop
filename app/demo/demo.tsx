'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { RepairPlanner } from './repair-planner'
import { CorridorMap } from './corridor-map'
import { destinations, findTrip, nodes, profiles, segments } from '../../lib/corridor'
import type { Destination, Profile, Trip } from '../../lib/corridor'
import { actors, blockedSegments, caseStatuses, categories, dismissalReasons, evidence, isBlocking, matchingCases, observations, rankedCases } from '../../lib/workflow'
import type { Action, Actor, DemoState, Evidence, Issue, Priority } from '../../lib/workflow'

type Snapshot = { state: DemoState; version: number }
type ResponseBody = Partial<Snapshot> & { message?: string }
type ReportFields = { segmentId: string; category: keyof typeof categories; observation: keyof typeof observations }

const initialFields: ReportFields = { segmentId: 'ramp', category: 'ramp', observation: 'blocked' }
const rolePrompts: Record<Actor, string> = {
  resident: 'Tell the team what you observed on a street segment.',
  reviewer: 'Choose a new case to confirm the barrier and recalculate access.',
  operator: 'Assign a verified case, then record the repair evidence.',
  inspector: 'Check the passage separately before reopening the route.',
}
const clock = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })

function time(value: string) {
  return <time dateTime={value}>{clock.format(new Date(value))} IST</time>
}

async function request(path = '/api/demo', input?: unknown, signal?: AbortSignal) {
  const response = await fetch(path, { signal, cache: 'no-store', ...(input === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }) })
  const data = await response.json() as ResponseBody
  return { status: response.status, data, ok: response.ok }
}

function toSnapshot(data: ResponseBody): Snapshot | null {
  return data.state && data.version !== undefined ? { state: data.state, version: data.version } : null
}

export function Demo() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [actor, setActor] = useState<Actor>('resident')
  const [profile, setProfile] = useState<Profile>('step-free')
  const [destination, setDestination] = useState<Destination>('clinic')
  const [selectedId, setSelectedId] = useState('')
  const [fields, setFields] = useState<ReportFields>(initialFields)
  const [busy, setBusy] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function initialize() {
      try {
        let response = await request('/api/demo', undefined, controller.signal)
        if (response.status === 404) response = await request('/api/demo', {}, controller.signal)
        const loaded = toSnapshot(response.data)
        if (!loaded) throw new Error(response.data.message || 'The demo could not start.')
        setSnapshot(loaded)
      } catch (problem) {
        if (!controller.signal.aborted) setError(problem instanceof Error ? problem.message : 'The demo could not start.')
      } finally {
        if (!controller.signal.aborted) setBusy(false)
      }
    }
    void initialize()
    return () => controller.abort()
  }, [])

  async function reset() {
    setBusy(true); setNotice(''); setError('')
    try {
      const { data } = await request('/api/demo', {})
      const loaded = toSnapshot(data)
      if (!loaded) throw new Error(data.message || 'The demo could not reset.')
      setSnapshot(loaded); setActor('resident'); setProfile('step-free'); setDestination('clinic')
      setSelectedId(''); setFields(initialFields); setNotice('The corridor has been reset.')
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The demo could not reset.')
    } finally {
      setBusy(false)
    }
  }

  async function send(action: Action) {
    if (busy || !snapshot) return
    setBusy(true); setNotice(''); setError('')
    try {
      const { data, ok } = await request('/api/demo/actions', { ...action, version: snapshot.version })
      const changed = toSnapshot(data)
      if (changed) setSnapshot(changed)
      if (!ok || !changed) throw new Error(data.message || 'The case could not be updated.')
      if (action.kind === 'report') setSelectedId(changed.state.cases.at(-1)?.id ?? '')
      else setSelectedId(action.caseId)
      const feedback = {
        report: 'Report saved. Switch to Reviewer to verify the barrier.', observe: 'Observation added to the existing case.',
        dismiss: 'Report dismissed. The review reason is in the case history.', verify: 'Barrier verified. Check the routes and the repair queue.', assign: 'Case assigned. You can now record repair evidence.',
        repair: 'Repair recorded. Switch to Rechecker to inspect the passage.',
        fail: 'Passage is still blocked. The case has returned to the repair queue.', pass: 'Passage is clear. The case is closed and routes have been recalculated.',
      }
      setNotice(feedback[action.kind])
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The case could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  const state = snapshot?.state
  const active = state ? rankedCases(state) : []
  const cases = state ? [...active.map(item => item.issue), ...state.cases.filter(issue => !isBlocking(issue)).reverse()] : []
  const selected = cases.find(issue => issue.id === selectedId) ?? cases.find(issue => issue.status === 'reported') ?? cases[0]
  const priority = active.find(item => item.issue.id === selected?.id)?.priority
  const blocked = state ? blockedSegments(state) : new Set<string>()
  const trips = Object.fromEntries(destinations.map(target => [target, findTrip(target, profile, blocked)])) as Record<Destination, Trip>
  const chosenTrip = trips[destination]
  const matches = state ? matchingCases(state, fields.segmentId, fields.category) : []

  function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!matches.length) void send({ kind: 'report', actor: 'resident', ...fields })
  }

  return <>
    <div className="demo-intro">
      <div><p className="eyebrow"><span className="status-dot" /> Corridor operations</p><h1 id="main" tabIndex={-1}>Market corridor</h1><p>Review access to the clinic and bus stop, then prioritize repairs.</p></div>
      <button className="button button-outline button-small" type="button" onClick={reset} disabled={busy}><span aria-hidden="true">↻</span> {snapshot ? 'Reset demo' : 'Start demo'}</button>
    </div>

    <div className="demo-context"><strong>Synthetic corridor</strong><span>Sample evidence and simulated roles. For demonstration only.</span></div>
    <div className="feedback" role="status">{notice}</div>
    {error && <div className="error" role="alert">{error}</div>}
    {!state ? <p className="loading-state" role="status">{busy ? 'Opening the demo corridor…' : 'Start a new demo session to continue.'}</p> : <>
      <dl className="workspace-stats">
        <div><dt>Reports to review</dt><dd>{state.cases.filter(issue => issue.status === 'reported').length}</dd></div>
        <div><dt>Blocked segments</dt><dd>{blocked.size}</dd></div>
        <div><dt>Awaiting recheck</dt><dd>{state.cases.filter(issue => issue.status === 'recheck').length}</dd></div>
      </dl>
      <div className="dashboard-grid">
        <section className="panel route-panel" aria-labelledby="routes-title">
          <div className="panel-top"><div><h2 id="routes-title">Corridor routes</h2><p>From Market entrance</p></div>
            <div className="segmented" role="group" aria-label="Choose a route profile">
              {(Object.entries(profiles) as [Profile, string][]).map(([id, label]) => <button type="button" aria-pressed={profile === id} onClick={() => setProfile(id)} key={id}>{label}</button>)}
            </div>
          </div>
          <CorridorMap highlighted={chosenTrip?.segments ?? []} blocked={blocked} destination={destination} />
          <div className="trip-grid" aria-label="Destinations">{destinations.map(target => <button key={target} type="button" aria-pressed={destination === target} className="trip-card" onClick={() => setDestination(target)}>
            <strong>{nodes[target].label}</strong><span className={trips[target] ? 'trip-available' : 'trip-unavailable'}>{trips[target] ? `${trips[target].metres} m` : profile === 'step-free' ? 'No surveyed step-free route' : 'No surveyed route'}</span>
          </button>)}</div>
          <div className="route-text" aria-live="polite">
            <h3>{nodes[destination].label} <span>· {profiles[profile]}</span></h3>
            {chosenTrip ? <ol>{chosenTrip.segments.map(id => <li key={id}>{segments.find(segment => segment.id === id)?.label}</li>)}</ol> : <p>Verified barriers and surveyed segment conditions leave this trip unavailable for the selected profile.</p>}
            <p className="observation-time">Sample corridor observed {time(segments[0].observedAt)}</p>
          </div>
        </section>

        <section className="panel work-panel" aria-labelledby="workflow-title">
          <div className="panel-top"><div><h2 id="workflow-title">Work the case</h2><p>Choose a demo role</p></div></div>
          <div className="role-grid" role="group" aria-label="Demo role">
            {(Object.entries(actors) as [Actor, (typeof actors)[Actor]][]).map(([id, role]) => <button type="button" aria-pressed={actor === id} disabled={busy} onClick={() => setActor(id)} key={id}><strong>{role.name}</strong><span>{role.person}</span></button>)}
          </div>
          <p className="role-prompt">{rolePrompts[actor]}</p>
          {actor === 'resident' ? <form onSubmit={report} className="report-form">
            <label>Street segment<select value={fields.segmentId} onChange={event => setFields({ ...fields, segmentId: event.target.value })}>
              {segments.map(segment => <option key={segment.id} value={segment.id}>{segment.label}</option>)}
            </select></label>
            <label>Barrier type<select value={fields.category} onChange={event => setFields({ ...fields, category: event.target.value as ReportFields['category'] })}>
              {Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></label>
            <label>Your observation<select value={fields.observation} onChange={event => setFields({ ...fields, observation: event.target.value as ReportFields['observation'] })}>
              {Object.entries(observations).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></label>
            {matches.length ? <div className="match-box"><strong>{matches.length === 1 ? 'A matching case is already open' : `${matches.length} matching cases are open`}</strong>
              {matches.map((match, index) => <button type="button" className="button button-dark" disabled={busy} key={match.id} onClick={() => send({ kind: 'observe', actor: 'resident', caseId: match.id, ...fields })}>
                {matches.length === 1 ? 'Add to existing case' : `Add to case ${index + 1} · ${caseStatuses[match.status]}`}
              </button>)}
              <button type="button" className="button button-outline" disabled={busy} onClick={() => send({ kind: 'report', actor: 'resident', duplicateChoice: 'separate', ...fields })}>Start a separate case</button>
            </div> : <button className="button button-dark form-submit" type="submit" disabled={busy}>Submit report <span aria-hidden="true">→</span></button>}
          </form> : selected ? <RoleActions key={selected.id} issue={selected} actor={actor} busy={busy} send={send} /> : <p>Submit a report to begin.</p>}
        </section>
      </div>

      <RepairPlanner issues={state.cases} />
      <div className="dashboard-grid queue-grid">
        <section className="panel list-panel" aria-labelledby="queue-title">
          <div className="panel-top"><div><h2 id="queue-title">Repair queue</h2><p>Ordered by step-free trips restored, detour metres saved, then time verified.</p></div></div>
          <div className="case-list">{cases.map(issue => {
            const rank = active.findIndex(item => item.issue.id === issue.id)
            return <button className="case-row" type="button" aria-pressed={selected?.id === issue.id} key={issue.id} onClick={() => setSelectedId(issue.id)}>
              <span className="queue-rank" aria-label={rank >= 0 ? `Priority ${rank + 1}` : 'Case'}>{rank >= 0 ? rank + 1 : '·'}</span>
              <span><strong>{segments.find(segment => segment.id === issue.segmentId)?.label}</strong><span>{categories[issue.category]} · {issue.observations.length} {issue.observations.length === 1 ? 'observation' : 'observations'}</span>{rank >= 0 && <span className="priority-reason">{active[rank].priority.explanation}</span>}</span>
              <span className={`badge ${isBlocking(issue) ? 'badge-warning' : 'badge-neutral'}`}>{caseStatuses[issue.status]}</span>
            </button>
          })}</div>
        </section>
        {selected && <CaseDetails issue={selected} priority={priority} />}
      </div>
    </>}
  </>
}

function RoleActions({ issue, actor, busy, send }: { issue: Issue; actor: Actor; busy: boolean; send: (action: Action) => void }) {
  const [repair, setRepair] = useState<Evidence>('passage-cleared')
  const [reason, setReason] = useState<keyof typeof dismissalReasons>('clear')
  const segment = segments.find(candidate => candidate.id === issue.segmentId)
  let action = <p className="action-hint">Choose a case in the repair queue that is ready for this role.</p>
  if (actor === 'reviewer' && issue.status === 'reported') action = <div className="report-form"><button type="button" className="button button-dark" disabled={busy} onClick={() => send({ kind: 'verify', actor, caseId: issue.id })}>Verify barrier</button>
    <details><summary>Dismiss report</summary><label>Review reason<select value={reason} onChange={event => setReason(event.target.value as keyof typeof dismissalReasons)}>{Object.entries(dismissalReasons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <button className="button button-outline" disabled={busy} onClick={() => send({ kind: 'dismiss', actor, caseId: issue.id, reason })}>Confirm dismissal</button></details></div>
  if (actor === 'operator' && issue.status === 'verified') action = <button type="button" className="button button-dark" disabled={busy} onClick={() => send({ kind: 'assign', actor, caseId: issue.id })}>Assign maintenance</button>
  if (actor === 'operator' && issue.status === 'assigned') action = <form className="report-form" onSubmit={event => { event.preventDefault(); send({ kind: 'repair', actor, caseId: issue.id, evidence: repair }) }}>
    <label>Sample repair evidence<select value={repair} onChange={event => setRepair(event.target.value as Evidence)}>{Object.entries(evidence).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <button type="submit" className="button button-dark form-submit" disabled={busy}>Record repair evidence</button>
  </form>
  if (actor === 'inspector' && issue.status === 'recheck') action = <div className="recheck-actions">
    <p>Does a new inspection confirm the passage is clear?</p>
    <button type="button" className="button button-dark" disabled={busy} onClick={() => send({ kind: 'pass', actor, caseId: issue.id })}>Pass recheck</button>
    <button type="button" className="button button-outline" disabled={busy} onClick={() => send({ kind: 'fail', actor, caseId: issue.id })}>Still blocked</button>
  </div>
  return <div className="role-actions"><div className="selected-case"><strong>{segment?.label}</strong><span>{caseStatuses[issue.status]}</span></div>{action}</div>
}

function CaseDetails({ issue, priority }: { issue: Issue; priority?: Priority }) {
  return <section className="panel history-panel" aria-labelledby="history-title">
    <div className="panel-top"><div><h2 id="history-title">Case history</h2><p>{segments.find(segment => segment.id === issue.segmentId)?.label}</p></div>
      <button className="button button-outline button-small" type="button" onClick={() => window.print()}>Print handoff</button>
    </div>
    <div className="handoff-summary"><strong>{categories[issue.category]}</strong> · {caseStatuses[issue.status]}
      <p>{priority?.explanation ?? (issue.status === 'dismissed' ? 'Report dismissed during review.' : issue.status === 'closed' ? 'Independent recheck complete.' : 'Priority is calculated after verification.')}</p>
      <p>Latest observation: {observations[issue.observations.at(-1)!.kind]} · {time(issue.observations.at(-1)!.at)}</p>
    </div>
    {issue.repair && issue.segmentId === 'ramp' && <details className="sample-evidence"><summary>View sample repair photo</summary><figure>
      <Image src="/corridor-clear.webp" alt="Illustrative photo of a clear curb ramp after the barricade was removed" width={1100} height={733} unoptimized />
      <figcaption>Simulated operator evidence. The independent recheck determines closure.</figcaption>
    </figure></details>}
    <ol className="case-history">{[...issue.history].reverse().map((event, index) => <li key={`${event.at}-${index}`}><span className="history-dot" aria-hidden="true" /><div><strong>{event.detail}</strong><span>{actors[event.actor].person} · {actors[event.actor].name} · {time(event.at)}</span></div></li>)}</ol>
  </section>
}
