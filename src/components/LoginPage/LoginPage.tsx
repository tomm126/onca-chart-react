import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../firebase';

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      setError('ログインに失敗しました。もう一度お試しください。');
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#1a1916" />
            <rect x="8" y="10" width="16" height="2" rx="1" fill="#f5f4f1" />
            <rect x="8" y="15" width="12" height="2" rx="1" fill="#f5f4f1" />
            <rect x="8" y="20" width="14" height="2" rx="1" fill="#f5f4f1" />
          </svg>
        </div>
        <h1 style={styles.title}>onca chart</h1>
        <p style={styles.subtitle}>ガントチャートで進行管理をシンプルに</p>

        <button style={styles.googleButton} onClick={handleGoogleLogin}>
          <GoogleIcon />
          <span>Googleでログイン</span>
        </button>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    fontFamily: "'Noto Sans JP', sans-serif",
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '48px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    width: '360px',
  },
  logo: {
    marginBottom: '4px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text)',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text2)',
    marginBottom: '8px',
    textAlign: 'center',
  },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 16px',
    background: 'var(--surface)',
    border: '1px solid var(--border2)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text)',
    cursor: 'pointer',
    justifyContent: 'center',
    transition: 'background 0.15s',
  },
  error: {
    fontSize: '12px',
    color: '#c0392b',
    marginTop: '4px',
    textAlign: 'center',
  },
};
