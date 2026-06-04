import { useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import styles from './ContextMenu.module.css';

export function ContextMenu() {
  const { contextMenu, setContextMenu } = useAppContext();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu.visible) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [contextMenu.visible, setContextMenu]);

  // Adjust position to stay in viewport
  useEffect(() => {
    if (!contextMenu.visible || !ref.current) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth) el.style.left = (contextMenu.x - r.width) + 'px';
    if (r.bottom > window.innerHeight) el.style.top = (contextMenu.y - r.height) + 'px';
  }, [contextMenu]);

  if (!contextMenu.visible) return null;

  const close = () => setContextMenu(prev => ({ ...prev, visible: false }));

  return (
    <div
      ref={ref}
      className={styles.menu}
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {contextMenu.items.map((item, i) => {
        if (item.separator) return <div key={i} className={styles.separator} />;
        return (
          <div
            key={i}
            className={`${styles.item} ${item.danger ? styles.itemDanger : ''}`}
            onClick={() => {
              close();
              item.action?.();
            }}
          >
            {item.label}
          </div>
        );
      })}
    </div>
  );
}
