import Image from 'next/image'
import Link from 'next/link'
import { Brand, Header } from './components/header'

const steps = [
  { icon: 'pin', title: 'Report a barrier', body: 'Pick a street segment and say what you observed. If there’s already a case, add your observation there.' },
  { icon: 'route', title: 'See which trips change', body: 'When a reviewer confirms the barrier, compare the remaining routes and see which repair would restore access.' },
  { icon: 'check', title: 'Recheck the repair', body: 'A second person checks the passage. When it’s clear, the route returns and the case history shows why.' },
]

export default function Home() {
  return <>
    <Header />
    <main>
      <section className="hero container" aria-labelledby="main">
        <div className="hero-content">
          <p className="eyebrow"><span className="status-dot" /> A CityFix buildathon prototype</p>
          <h1 id="main" tabIndex={-1}>Can you still get<br className="hero-break" /> to the <em>clinic?</em></h1>
          <p className="hero-text">A blocked ramp can change an entire trip. RastaLoop shows which destinations you can still reach and which repairs would open the way.</p>
          <div className="hero-actions"><Link className="button button-dark" href="/demo">Try the demo <span aria-hidden="true">↗</span></Link><a className="text-link" href="#how-it-works">How it works <span aria-hidden="true">↓</span></a></div>
        </div>
        <figure className="hero-photo">
          <Image src="/corridor.webp" alt="Illustrative neighborhood sidewalk with an obstruction across a curb ramp" fill sizes="(max-width: 760px) 100vw, 52vw" preload unoptimized />
          <figcaption>Illustrative scene</figcaption>
          <div className="photo-insight">
            <span className="insight-icon" aria-hidden="true">+</span>
            <div><strong>Community clinic</strong><span>Step-free trip</span></div>
            <span className="badge badge-warning">Barrier reported</span>
          </div>
        </figure>
      </section>

      <section className="how-section" id="how-it-works" aria-labelledby="how-title">
        <div className="container">
          <p className="eyebrow section-kicker">How it works</p>
          <h2 id="how-title">From a street report to an open route.</h2>
          <div className="steps-grid">
            {steps.map(step => <article className="step-card" key={step.title}>
              <span className={`step-icon icon-${step.icon}`} aria-hidden="true" />
              <h3>{step.title}</h3><p>{step.body}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="field-section container" id="fieldwork" aria-labelledby="field-title">
        <div><p className="eyebrow section-kicker">Pilot and research</p><h2 id="field-title">Start with one neighborhood.</h2></div>
        <div><p>The demo models a synthetic corridor between a market, a clinic and a bus stop. Field validation will check where people change their trips and what evidence they need before using a route again.</p><p>Community interviews and usability results are pending.</p><Link href="/demo" className="text-link">Open the synthetic corridor <span aria-hidden="true">↗</span></Link></div>
      </section>
    </main>
    <footer className="site-footer"><div className="container footer-inner"><Brand /><p>CityFix buildathon prototype · Simulated operations</p></div></footer>
  </>
}
