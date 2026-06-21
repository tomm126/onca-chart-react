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
import { useAuth } from './hooks/useAuth';
import { useChartData } from './hooks/useChartData';
import { LoginPage } from './components/LoginPage/LoginPage';
import { FirestoreSync } from './components/FirestoreSync';

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

  // Height sync: align grid-group-wrap heights with lp-group heights after each render
  React.useEffect(() => {
    const timerId = setTimeout(() => {
      document.querySelectorAll<HTMLElement>('[data-lp-group]').forEach(lg => {
        const projId = lg.dataset.projId;
        if (!projId) return;
        const ggWrap = document.querySelector<HTMLElement>(`[data-grid-wrap][data-proj-id="${projId}"]`);
        if (!ggWrap) return;
        const lpH = lg.offsetHeight;
        const gg = ggWrap.querySelector<HTMLElement>('[data-grid-group]');
        const sp = ggWrap.querySelector<HTMLElement>('[data-grid-spacer]');
        if (!gg || !sp) return;
        const groupRowsEl = lg.querySelector<HTMLElement>('[data-lp-group-rows]');
        const addRowEl = lg.querySelector<HTMLElement>('[data-lp-add-row]');
        const groupRowsH = groupRowsEl?.offsetHeight ?? lpH;
        const addRowH = addRowEl?.offsetHeight ?? 18;
        const rowsH = groupRowsH - addRowH;
        gg.style.height = rowsH + 'px';
        gg.querySelectorAll<HTMLElement>('[data-grid-col]').forEach(col => {
          col.style.height = rowsH + 'px';
        });
        const currentTotal = gg.offsetHeight + sp.offsetHeight;
        const diff = lpH - currentTotal;
        sp.style.height = (sp.offsetHeight + diff) + 'px';
      });
    }, 0);
    return () => clearTimeout(timerId);
  }); // no deps — run after every render

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
  const { user, loading: authLoading, accessDenied } = useAuth();
  const { initialState, loading: dataLoading } = useChartData(user);

  if (authLoading || (user && (dataLoading || !initialState))) return <LoadingScreen />;
  if (!user) return <LoginPage accessDenied={accessDenied} />;

  return (
    <AppProvider initialState={initialState!}>
      <FirestoreSync />
      <AppInner />
    </AppProvider>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--text2)',
      fontSize: '13px',
      fontFamily: "'Noto Sans JP', sans-serif",
    }}>
      読み込み中...
    </div>
  );
}
