import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { dk, todayStr } from '../../utils/date';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  scrollPaneRef: React.RefObject<HTMLDivElement | null>;
  ganttDays: Date[];
}

export const Toolbar = React.memo(function Toolbar({ scrollPaneRef, ganttDays }: ToolbarProps) {
  const {
    state,
    filterMembers, setFilterMembers,
    showDone, setShowDone,
    setPanel,
  } = useAppContext();

  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleToday = useCallback(() => {
    const idx = ganttDays.findIndex(d => dk(d) === todayStr());
    if (idx >= 0 && scrollPaneRef.current) {
      scrollPaneRef.current.scrollLeft = Math.max(0, idx * 26 - 100);
    }
  }, [ganttDays, scrollPaneRef]);

  const handleExport = useCallback(() => {
    const exportState = { ...state, meta: { ...state.meta, updatedAt: new Date().toISOString() } };
    const blob = new Blob([JSON.stringify(exportState, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = 'onca-chart.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [state]);

  const toggleMemberFilter = useCallback((id: string, checked: boolean) => {
    setFilterMembers(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, [setFilterMembers]);

  const isFilterActive = filterMembers.size > 0;

  return (
    <div className={styles.toolbar}>
      <span className={styles.appName}>ONCA CHART</span>

      <div className={styles.divider} />
      <button className={styles.todayBtn} onClick={handleToday}>TODAY</button>

      <div className={styles.divider} />
      <button
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={() => setPanel({ type: 'addProject' })}
      >
        ＋ 案件
      </button>
      <button
        className={styles.btn}
        onClick={() => setPanel({ type: 'addMember' })}
      >
        ＋ メンバー
      </button>

      <div className={styles.filterWrap} ref={filterRef}>
        <button
          className={`${styles.btn} ${isFilterActive ? styles.btnFilterActive : ''}`}
          onClick={() => setFilterOpen(v => !v)}
        >
          担当者フィルタ ▾
        </button>
        {filterOpen && (
          <div className={styles.filterDropdown}>
            <div
              className={styles.filterItem}
              onClick={() => { setFilterMembers(new Set()); }}
            >
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>すべて表示</span>
            </div>
            {state.members.map(m => (
              <label key={m.id} className={styles.filterItem}>
                <input
                  type="checkbox"
                  checked={filterMembers.has(m.id)}
                  onChange={e => toggleMemberFilter(m.id, e.target.checked)}
                />
                <span className={styles.filterDot} style={{ background: m.color }} />
                <span>{m.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        className={`${styles.btn} ${showDone ? styles.btnToggleOn : ''}`}
        onClick={() => setShowDone(v => !v)}
      >
        完了済みを表示
      </button>

      <div className={styles.divider} />
      <button className={styles.btn} onClick={handleExport}>エクスポート</button>

      <div className={styles.spacer}>
        <div className={styles.legend}>
          {state.members.map(m => (
            <div
              key={m.id}
              className={styles.legWrap}
              onClick={() => setPanel({ type: 'editMember', memberId: m.id })}
            >
              <div className={styles.legDot} style={{ background: m.color }} />
              <div className={styles.legTip}>{m.name}</div>
            </div>
          ))}
        </div>
        <button
          className={styles.legAdd}
          title="メンバー追加"
          onClick={() => setPanel({ type: 'addMember' })}
        >
          ＋
        </button>
      </div>
    </div>
  );
});
