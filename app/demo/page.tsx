import type { Metadata } from 'next'
import { Header } from '../components/header'
import { Demo } from './demo'

export const metadata: Metadata = { title: 'Interactive demo' }

export default function DemoPage() {
  return <div className="demo-page"><Header demo /><main className="container demo-main"><Demo /></main></div>
}
