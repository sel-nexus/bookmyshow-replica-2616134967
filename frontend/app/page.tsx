import Link from 'next/link';

/** Renders the public landing page for the focused authentication slice. */
export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="BookMyShow Replica home"><span className="brand-mark">B</span><span>bookmyshow replica</span></Link>
        <span className="header-note">Cinema, considered</span>
      </header>
      <section className="hero" aria-labelledby="home-heading">
        <div>
          <span className="eyebrow">Your night starts here</span>
          <h1 id="home-heading">Make room for a great story.</h1>
          <p className="hero-copy">Sign in with your mobile number and keep your cinema plans close. A simple, secure entry to the BookMyShow Replica experience.</p>
          <div className="hero-actions"><Link className="primary-button" href="/login">Enter the cinema</Link><span className="text-link">OTP-powered access</span></div>
        </div>
        <aside className="focal-panel" aria-label="Authentication details">
          <span className="panel-kicker">Tonight’s feature</span>
          <h2>A better way to begin your booking journey.</h2>
          <div className="panel-rule" />
          <div className="panel-list"><div><span>01</span> Mobile number sign-in</div><div><span>02</span> One-time password verification</div><div><span>03</span> Ready for the big screen</div></div>
        </aside>
      </section>
    </main>
  );
}
