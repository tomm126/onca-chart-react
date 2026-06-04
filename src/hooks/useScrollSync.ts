import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useScrollSync(
  scrollPaneRef: RefObject<HTMLDivElement | null>,
  leftRowsRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const sp = scrollPaneRef.current;
    const lr = leftRowsRef.current;
    if (!sp || !lr) return;

    const onSpScroll = () => { lr.scrollTop = sp.scrollTop; };
    const onLrWheel = (e: WheelEvent) => {
      e.preventDefault();
      sp.scrollTop += e.deltaY * (e.deltaMode === 1 ? 20 : 1);
    };

    sp.addEventListener('scroll', onSpScroll);
    lr.addEventListener('wheel', onLrWheel, { passive: false });
    return () => {
      sp.removeEventListener('scroll', onSpScroll);
      lr.removeEventListener('wheel', onLrWheel);
    };
  }, [scrollPaneRef, leftRowsRef]);
}
