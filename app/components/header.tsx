import Link from 'next/link'

export function Brand() {
  return <Link className="brand" href="/" aria-label="RastaLoop home"><span className="brand-mark" aria-hidden="true" /><span>Rasta<span>Loop</span></span></Link>
}

export function Header({ demo = false }: { demo?: boolean }) {
  return <header className="site-header"><div className="container header-inner">
    <Brand />
    <nav aria-label="Main navigation">
      {demo ? <Link className="nav-link" href="/">About the project</Link> : <>
        <a className="nav-link" href="#how-it-works">How it works</a>
        <a className="nav-link optional-nav" href="#fieldwork">Fieldwork</a>
        <Link className="button button-dark button-small" href="/demo">Try the demo <span aria-hidden="true">↗</span></Link>
      </>}
    </nav>
  </div></header>
}
