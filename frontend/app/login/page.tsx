import Link from 'next/link';
import { AuthForm } from '../../components/auth/AuthForm';

/** Renders the public mobile-number login page. */
export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-aside" aria-labelledby="login-aside-heading">
        <Link className="brand" href="/">
          <span className="brand-mark">B</span>
          <span>bookmyshow replica</span>
        </Link>
        <div>
          <h1 id="login-aside-heading">The previews are about to begin.</h1>
          <p>Your mobile number is the only ticket you need for this demo.</p>
        </div>
      </section>
      <section className="auth-content" aria-labelledby="login-heading">
        <div className="auth-card">
          <span className="eyebrow">Member entrance</span>
          <h2 id="login-heading">Sign in to continue.</h2>
          <p>We’ll send you a one-time password. No password to remember.</p>
          <AuthForm mode="login" />
          <Link className="back-link" href="/">
            ← Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
