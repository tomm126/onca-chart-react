import React from 'react';
import { useAppContext } from '../../context/AppContext';

const style: React.CSSProperties = {
  position: 'fixed',
  bottom: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'var(--text)',
  color: '#fff',
  fontSize: 11,
  fontFamily: "'DM Mono', monospace",
  padding: '6px 14px',
  borderRadius: 20,
  pointerEvents: 'none',
  zIndex: 600,
  transition: 'opacity .2s',
  whiteSpace: 'nowrap',
};

export function UndoToast() {
  const { toastMessage } = useAppContext();
  return (
    <div style={{ ...style, opacity: toastMessage ? 1 : 0 }}>
      {toastMessage}
    </div>
  );
}
