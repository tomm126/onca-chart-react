import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase';

const ALLOWED_EMAILS = new Set(
  (import.meta.env.VITE_ALLOWED_EMAILS as string ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean),
);

function isAllowed(email: string | null): boolean {
  if (ALLOWED_EMAILS.size === 0) return true;
  return ALLOWED_EMAILS.has(email ?? '');
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u && !isAllowed(u.email)) {
        await signOut(auth);
        setUser(null);
        setAccessDenied(true);
      } else {
        setUser(u);
        setAccessDenied(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading, accessDenied };
}
