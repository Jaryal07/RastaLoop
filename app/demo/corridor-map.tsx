'use client'

import { useEffect, useRef } from 'react'
import { nodes, segments } from '../../lib/corridor'
import type { Destination } from '../../lib/corridor'

type Props = { highlighted: string[]; blocked: ReadonlySet<string>; destination: Destination }

export function CorridorMap({ highlighted, blocked, destination }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const context = ref.current?.getContext('2d')
    if (!context) return
    context.setTransform(2, 0, 0, 2, 0, 0)
    context.clearRect(0, 0, 660, 334)
    context.fillStyle = '#e8efe5'
    context.fillRect(0, 0, 660, 334)

    // A schematic grid provides landmarks without implying map accuracy or scale.
    context.strokeStyle = '#d5e3d7'
    context.lineWidth = 1
    for (let x = 0; x < 660; x += 24) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 334); context.stroke()
    }
    for (let y = 0; y < 334; y += 24) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(660, y); context.stroke()
    }

    context.lineJoin = 'round'
    context.lineCap = 'round'
    for (const segment of segments) {
      const from = nodes[segment.from].point
      const to = nodes[segment.to].point
      const unavailable = blocked.has(segment.id)
      const active = highlighted.includes(segment.id)
      context.beginPath()
      context.moveTo(...from)
      for (const bend of segment.bends ?? []) context.lineTo(...bend)
      context.lineTo(...to)
      context.strokeStyle = '#f8faf2'
      context.lineWidth = 16
      context.setLineDash([])
      context.stroke()
      context.strokeStyle = unavailable ? '#93510d' : active ? '#147869' : '#7e948e'
      context.lineWidth = active ? 8 : 4
      context.setLineDash(unavailable ? [4, 10] : segment.stepFree === false ? [10, 7] : [])
      context.stroke()
      context.setLineDash([])

      if (unavailable) {
        const [x, y] = segment.bends?.[0] ?? [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
        context.beginPath(); context.arc(x, y, 12, 0, Math.PI * 2)
        context.fillStyle = '#ffdeb2'; context.fill()
        context.fillStyle = '#654007'; context.font = 'bold 17px system-ui'; context.textAlign = 'center'
        context.fillText('!', x, y + 6)
      }
    }

    for (const [id, node] of Object.entries(nodes)) {
      const [x, y] = node.point
      const endpoint = id === destination || id === 'start'
      context.beginPath(); context.arc(x, y, endpoint ? 10 : 6, 0, Math.PI * 2)
      context.fillStyle = endpoint ? '#123d38' : '#fafaf4'; context.fill()
      context.strokeStyle = '#44675c'; context.lineWidth = 2; context.stroke()
      if (id === 'junction') continue
      const labelY = id === 'start' || id === 'bus' ? y + 33 : y - 23
      context.font = '700 17px system-ui'; context.textAlign = 'center'
      context.lineWidth = 6; context.strokeStyle = '#e8efe5'; context.strokeText(node.label, x, labelY)
      context.fillStyle = '#173830'; context.fillText(node.label, x, labelY)
    }

    context.font = '600 14px system-ui'; context.textAlign = 'center'; context.fillStyle = '#435a53'
    context.lineWidth = 5; context.strokeStyle = '#e8efe5'; context.strokeText('Steps', 344, 131); context.fillText('Steps', 344, 131)
  }, [highlighted, blocked, destination])

  return <figure className="corridor-figure">
    <canvas ref={ref} width={1320} height={668} aria-hidden="true" />
    <figcaption><span><i className="legend-line legend-route" /> Selected route</span><span><i className="legend-line legend-barrier" /> Verified barrier</span><span className="map-scale">Schematic · not to scale</span></figcaption>
  </figure>
}
