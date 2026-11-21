import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './styles.css'

export const metadata: Metadata = {
  title: { default: 'RastaLoop | A clearer way to get there', template: '%s | RastaLoop' },
  description: 'See how a verified street obstruction affects step-free trips, and which repair would restore access.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>
}
