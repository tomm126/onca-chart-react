import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { dk, addD, todayStr } from '../../utils/date';
import type { AppState } from '../../types';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  scrollPaneRef: React.RefObject<HTMLDivElement | null>;
  ganttDays: Date[];
}

export const Toolbar = React.memo(function Toolbar({ scrollPaneRef, ganttDays }: ToolbarProps) {
  const {
    state,
    dispatch,
    clearHistory,
    filterMembers, setFilterMembers,
    showDone, setShowDone,
    setPanel,
  } = useAppContext();

  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';

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

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target?.result as string);

        if (!Array.isArray(d.projects) || !Array.isArray(d.members)) {
          alert('このツールのエクスポートデータではありません。');
          return;
        }
        if (d.projects.length === 0) {
          alert('案件データが空です。インポートを中止しました。');
          return;
        }

        const cur = state.projects.length;
        const imp = d.projects.length;
        if (!confirm(`現在 ${cur} 件 → インポート後 ${imp} 件に置き換えます。\nインポート前に現在のデータを自動バックアップします。よろしいですか？`)) return;

        // 現在データを自動エクスポート（バックアップ）
        const backupState = { ...state, meta: { ...state.meta, updatedAt: new Date().toISOString() } };
        const backup = new Blob([JSON.stringify(backupState, null, 2)], { type: 'application/json' });
        const ba = document.createElement('a');
        const backupUrl = URL.createObjectURL(backup);
        ba.href = backupUrl;
        ba.download = `onca-chart-backup-${new Date().toISOString().slice(0, 10)}.json`;
        ba.click();
        setTimeout(() => URL.revokeObjectURL(backupUrl), 1000);

        // インポート実行
        const yesterday = dk(addD(new Date(), -1));
        const importedState: AppState = {
          ...d,
          view: d.view ?? { archiveBefore: yesterday, days: 210 },
          customNonWorkingDays: d.customNonWorkingDays ?? [],
          removedHolidays: d.removedHolidays ?? [],
          pins: d.pins ?? {},
        };
        dispatch({ type: 'RESTORE_SNAPSHOT', snapshot: importedState });
        clearHistory();
      } catch {
        alert('JSONの読み込みに失敗しました。ファイルを確認してください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [state, dispatch, clearHistory]);

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
          onClick={e => { e.stopPropagation(); setFilterOpen(v => !v); }}
        >
          担当者フィルタ ▾
        </button>
        {filterOpen && (
          <div className={styles.filterDropdown} onClick={e => e.stopPropagation()}>
            <div
              className={styles.filterItem}
              onClick={e => { e.stopPropagation(); setFilterMembers(new Set()); }}
            >
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>すべて表示</span>
            </div>
            {state.members.map(m => (
              <div
                key={m.id}
                className={styles.filterItem}
                onClick={e => {
                  e.stopPropagation();
                  toggleMemberFilter(m.id, !filterMembers.has(m.id));
                }}
              >
                <input
                  type="checkbox"
                  checked={filterMembers.has(m.id)}
                  onChange={e => { e.stopPropagation(); toggleMemberFilter(m.id, e.target.checked); }}
                  onClick={e => e.stopPropagation()}
                />
                <span className={styles.filterDot} style={{ background: m.color }} />
                <span>{m.name}</span>
              </div>
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
      {isAdmin && (
        <button className={styles.btn} onClick={handleImport}>インポート</button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

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
