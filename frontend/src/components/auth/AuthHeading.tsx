/**
 * The form panel's heading: a small label, the one large line, a short support line, and
 * the disclaimer. The disclaimer sits here, above the fields, so it is read before any
 * credential is typed and is always in the first screenful, on every screen size.
 */
export function AuthHeading({ label, title, intro }: { label: string; title: string; intro: string }) {
  return (
    <header className="auth-in auth-in--2">
      <p className="type-label m-0 text-[var(--fg-subtle)]">{label}</p>
      <h1 className="auth-title">{title}</h1>
      <p className="m-0 mt-[var(--space-3)] text-[1rem] text-[var(--fg-muted)]">{intro}</p>
      <p role="note" className="auth-note">
        Independent redesign. Not affiliated with Goodreads or Amazon. Use credentials created for this demo, not
        your Goodreads password.
      </p>
    </header>
  );
}
