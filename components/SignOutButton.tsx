'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--ink-3)',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.1em',
        padding: '4px 10px',
        cursor: 'pointer',
        borderRadius: 2,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--red)';
        e.currentTarget.style.color = 'var(--red)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--ink-3)';
      }}
    >
      SIGN OUT
    </button>
  );
}
