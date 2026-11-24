'use client'

import { useState } from 'react'
import { destinations, findTrip, nodes, segments } from '../../lib/corridor'
import { categories, isBlocking } from '../../lib/workflow'
import type { Issue } from '../../lib/workflow'

export function RepairPlanner({ issues }: { issues: Issue[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const active = issues.filter(isBlocking)
  const current = new Set(active.map(issue => issue.segmentId))
  const remaining = new Set(active.filter(issue => !selected.includes(issue.id)).map(issue => issue.segmentId))

  return <section className="planner panel" aria-labelledby="planner-title">
    <div className="planner-input"><h2 id="planner-title">Repair planner</h2>
      <p>Preview step-free access if the selected repairs pass recheck.</p>
      <fieldset><legend>Include in scenario</legend>
        {active.map((issue, index) => <label key={issue.id}>
          <input type="checkbox" checked={selected.includes(issue.id)} onChange={event => {
            const checked = event.target.checked
            setSelected(ids => checked ? [...ids, issue.id] : ids.filter(id => id !== issue.id))
          }} />
          <span>Case {index + 1} · {segments.find(segment => segment.id === issue.segmentId)?.label} · {categories[issue.category]}</span>
        </label>)}
        {!active.length && <p>No verified obstructions to model.</p>}
      </fieldset>
    </div>
    <div className="planner-results" aria-live="polite"><table>
      <caption>Step-free trips from Market entrance</caption>
      <thead><tr><th>Destination</th><th>Current</th><th>After repairs</th></tr></thead>
      <tbody>{destinations.map(destination => {
        const before = findTrip(destination, 'step-free', current)
        const after = findTrip(destination, 'step-free', remaining)
        return <tr key={destination}><th scope="row">{nodes[destination].label}</th>
          <td>{before ? before.metres + ' m' : 'Unavailable'}</td>
          <td>{after ? after.metres + ' m' : 'Unavailable'}{after && !before && <strong>Restored</strong>}</td></tr>
      })}</tbody>
    </table></div>
  </section>
}
