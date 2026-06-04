import React, { useRef } from 'react';
import { AppProvider } from './context/AppContext';
import { Toolbar } from './components/Toolbar/Toolbar';
import { LeftPane } from './components/LeftPane/LeftPane';
import { GanttPane } from './components/GanttPane/GanttPane';
import { SidePanel } from './components/SidePanel/SidePanel';
import { ContextMenu } from './components/ContextMenu/ContextMenu';
import { UndoToast } from './components/UndoToast/UndoToast';
import { useScrollSync } from './hooks/useScrollSync';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useGanttDays } from './hooks/useGanttDays';
import { useAppContext } from './context/AppContext';
import { dk, todayStr } from './utils/date';

function AppInner() {
  const { state } = useAppContext();
  const scrollPaneRef = useRef<HTMLDivElement>(null);
  const leftRowsRef = useRef<HTMLDivElement>(null);

  const ganttDays = useGanttDays(state.view.days);

  useScrollSync(scrollPaneRef, leftRowsRef);
  useUndoRedo();

  // Scroll to archive/today on mount
  React.useEffect(() => {
    const sp = scrollPaneRef.current;
    if (!sp) return;
    const aIdx = ganttDays.findIndex(d => dk(d) === state.view.archiveBefore);
    const focusIdx = aIdx >= 0 ? aIdx + 1 : ganttDays.findIndex(d => dk(d) === todayStr());
    if (focusIdx >= 0) sp.scrollLeft = Math.max(0, focusIdx * 26 - 80);
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Toolbar scrollPaneRef={scrollPaneRef} ganttDays={ganttDays} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftPane leftRowsRef={leftRowsRef} />
        <GanttPane scrollPaneRef={scrollPaneRef} ganttDays={ganttDays} />
      </div>
      <SidePanel />
      <ContextMenu />
      <UndoToast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
