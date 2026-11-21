export type Profile = 'step-free' | 'steps-allowed'
export type NodeId = 'start' | 'junction' | 'crossing' | 'clinic' | 'bus'
export type Destination = 'clinic' | 'bus'

export const nodes: Record<NodeId, { label: string; point: [number, number] }> = {
  start: { label: 'Market entrance', point: [94, 212] },
  junction: { label: 'Clinic junction', point: [389, 206] },
  crossing: { label: 'Market crossing', point: [251, 87] },
  clinic: { label: 'Community clinic', point: [548, 105] },
  bus: { label: 'Market bus stop', point: [553, 269] },
}

export type Segment = {
  id: string
  label: string
  from: NodeId
  to: NodeId
  metres: number
  stepFree: boolean | null
  observedAt: string
  bends?: [number, number][]
}

const observedAt = '2026-11-21T14:00:00.000Z'
export const segments: Segment[] = [
  { id: 'ramp', label: 'Clinic curb ramp', from: 'start', to: 'junction', metres: 120, stepFree: true, observedAt },
  { id: 'clinic-path', label: 'Clinic footpath', from: 'junction', to: 'clinic', metres: 200, stepFree: true, observedAt },
  { id: 'market-path', label: 'Market footpath', from: 'start', to: 'crossing', metres: 210, stepFree: true, observedAt },
  { id: 'stairs', label: 'Junction steps', from: 'crossing', to: 'junction', metres: 180, stepFree: false, observedAt },
  { id: 'bus-path', label: 'Bus stop footpath', from: 'start', to: 'bus', metres: 250, stepFree: true, observedAt, bends: [[143, 269]] },
  { id: 'service-path', label: 'Market service lane', from: 'crossing', to: 'bus', metres: 250, stepFree: true, observedAt, bends: [[307, 46], [610, 46], [610, 239]] },
]

export const destinations: Destination[] = ['clinic', 'bus']
export const profiles: Record<Profile, string> = { 'step-free': 'Step-free', 'steps-allowed': 'Steps allowed' }

export type Trip = { metres: number; segments: string[] } | null

export function findTrip(
  destination: Destination,
  profile: Profile,
  blocked: ReadonlySet<string>,
  graph: Segment[] = segments,
): Trip {
  const distances = new Map<NodeId, number>([['start', 0]])
  const previous = new Map<NodeId, { node: NodeId; segment: string }>()
  const remaining = new Set<NodeId>(Object.keys(nodes) as NodeId[])
  const eligible = graph.filter(segment => !blocked.has(segment.id) && (profile !== 'step-free' || segment.stepFree === true))

  while (remaining.size) {
    let closest: NodeId | undefined
    let best = Infinity
    for (const node of remaining) {
      const distance = distances.get(node) ?? Infinity
      if (distance < best) {
        closest = node
        best = distance
      }
    }
    if (!closest) return null
    if (closest === destination) break
    remaining.delete(closest)

    for (const segment of eligible) {
      const next = segment.from === closest ? segment.to : segment.to === closest ? segment.from : undefined
      if (!next || !remaining.has(next)) continue
      const distance = best + segment.metres
      if (distance < (distances.get(next) ?? Infinity)) {
        distances.set(next, distance)
        previous.set(next, { node: closest, segment: segment.id })
      }
    }
  }

  const metres = distances.get(destination)
  if (metres === undefined) return null
  const path: string[] = []
  let node: NodeId = destination
  while (node !== 'start') {
    const link = previous.get(node)
    if (!link) return null
    path.unshift(link.segment)
    node = link.node
  }
  return { metres, segments: path }
}
