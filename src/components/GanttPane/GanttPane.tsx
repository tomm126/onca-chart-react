import React, {
  useRef, useEffect, useCallback, useMemo,
} from 'react';
import type { RefObject } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useVisibleProjects } from '../../hooks/useVisibleProjects';
import type { Project, Pin, ContextMenuItem } from '../../types';
import { dk, todayStr, isWknd, isHol, isNWD, hexToRgb } from '../../utils/date';
import styles from './GanttPane.module.css';

const CELL_W = 26;

interface GanttPaneProps {
  scrollPaneRef: RefObject<HTMLDivElement | null>;
  ganttDays: Date[];
}

// ── Cell map for fast drag painting ──────────────────────────────────────────
type CellMap = Map<string, HTMLDivElement>;

function buildCellKey(rowId: string, dstr: string) {
  return `${rowId}__${dstr}`;
}

// ── Date header ───────────────────────────────────────────────────────────────
const DateHeader = React.memo(function DateHeader({
  days,
  archiveBefore,
  customNonWorkingDays,
  removedHolidays,
  onDayContextMenu,
}: {
  days: Date[];
  archiveBefore: string;
  customNonWorkingDays: string[];
  removedHolidays: string[];
  onDayContextMenu: (e: React.MouseEvent, dstr: string, d: Date) => void;
}) {
  const today = todayStr();

  const months = useMemo(() => {
    const result: { key: string; label: string; w: number }[] = [];
    days.forEach(d => {
      const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!result.length || result[result.length - 1].key !== key) {
        result.push({ key, label: key, w: CELL_W });
      } else {
        result[result.length - 1].w += CELL_W;
      }
    });
    return result;
  }, [days]);

  return (
    <div className={styles.dateHeader}>
      <div className={styles.monthRow}>
        {months.map(m => (
          <div key={m.key} className={styles.monthCell} style={{ width: m.w }}>
            {m.label}
          </div>
        ))}
      </div>
      <div className={styles.dayRow}>
        {days.map(d => {
          const dstr = dk(d);
          const nwd = isNWD(dstr, customNonWorkingDays, removedHolidays, d);
          const arc = dstr <= archiveBefore;
          const dw = d.getDay();
          let cls = styles.dayCell;
          if (nwd) cls += ' ' + styles.nwdHdr;
          else if (arc) cls += ' ' + styles.arcHdr;
          else {
            if (dw === 6) cls += ' ' + styles.sat;
            else if (dw === 0) cls += ' ' + styles.sun;
            else if (isHol(d)) cls += ' ' + styles.hol;
            if (dstr === today) cls += ' ' + styles.todayHdr;
          }
          return (
            <div
              key={dstr}
              className={cls}
              onContextMenu={e => { e.preventDefault(); onDayContextMenu(e, dstr, d); }}
            >
              <span>{d.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ── Pin label ─────────────────────────────────────────────────────────────────
const PinLabel = React.memo(function PinLabel({
  pin,
  rowId,
  dateStr,
  onResize,
  onDelete,
  onEdit,
}: {
  pin: Pin;
  rowId: string;
  dateStr: string;
  onResize: (rowId: string, dateStr: string, pinId: string, startX: number, origSpan: number) => void;
  onDelete: (rowId: string, dateStr: string, pinId: string) => void;
  onEdit: (rowId: string, dateStr: string, pinId: string, label: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState('');
  const committedRef = React.useRef(false);

  const handleDblClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    committedRef.current = false;
    setEditValue('');
    setEditing(true);
  };

  const commitEdit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const newLabel = editValue.trim() || pin.label;
    setEditing(false);
    if (newLabel !== pin.label) onEdit(rowId, dateStr, pin.id, newLabel);
  };

  const cancelEdit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    setEditing(false);
  };

  return (
    <div
      className={styles.pinWrap}
      style={{ width: (pin.span || 1) * CELL_W }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onDelete(rowId, dateStr, pin.id); }}
    >
      <div className={styles.pinLabelInner} onDoubleClick={handleDblClick}>{pin.label}</div>
      {editing && (
        <input
          autoFocus
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            border: 'none',
            background: 'var(--pin-color)',
            fontSize: 9,
            padding: '0 5px',
            outline: 'none',
            zIndex: 10,
            color: '#fff',
            borderRadius: 3,
            fontFamily: "'DM Mono', monospace",
          }}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) commitEdit();
            if (e.key === 'Escape') cancelEdit();
          }}
          onBlur={commitEdit}
        />
      )}
      <div
        className={styles.pinResize}
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResize(rowId, dateStr, pin.id, e.clientX, pin.span || 1); }}
      />
    </div>
  );
});

// ── Single gantt cell ─────────────────────────────────────────────────────────
const GanttCell = React.memo(function GanttCell({
  dstr,
  di,
  rowId,
  filled,
  color,
  isNwd,
  isArc,
  isWknd: weekend,
  isToday,
  pins,
  cellRef,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  onDblClick,
  onContextMenu,
  onPinResize,
  onPinDelete,
  onPinEdit,
}: {
  dstr: string;
  di: number;
  rowId: string;
  filled: boolean;
  color: string;
  isNwd: boolean;
  isArc: boolean;
  isWknd: boolean;
  isToday: boolean;
  pins: Pin[];
  cellRef: (el: HTMLDivElement | null) => void;
  onMouseDown: (di: number, dstr: string, rowId: string, paint: boolean) => void;
  onMouseEnter: (el: HTMLDivElement, di: number, dstr: string, rowId: string) => void;
  onMouseLeave: (el: HTMLDivElement, dstr: string) => void;
  onTouchStart: (di: number, dstr: string, rowId: string, paint: boolean) => void;
  onDblClick: (el: HTMLDivElement, rowId: string, dstr: string) => void;
  onContextMenu: (e: React.MouseEvent, rowId: string, dstr: string) => void;
  onPinResize: (rowId: string, dateStr: string, pinId: string, startX: number, origSpan: number) => void;
  onPinDelete: (rowId: string, dateStr: string, pinId: string) => void;
  onPinEdit: (rowId: string, dateStr: string, pinId: string, label: string) => void;
}) {
  let cls = styles.gridCell;
  if (isNwd) cls += ' ' + styles.nwdCell;
  else {
    if (weekend) cls += ' ' + styles.wkndCell;
    if (isToday) cls += ' ' + styles.todayCell;
    if (isArc) cls += ' ' + styles.arcCell;
  }

  const bg = filled ? `${color}cc` : undefined;

  return (
    <div
      ref={cellRef}
      className={cls}
      style={bg ? { background: bg } : undefined}
      onMouseDown={isNwd ? undefined : e => { if (e.button !== 0) return; e.preventDefault(); onMouseDown(di, dstr, rowId, !filled); }}
      onMouseEnter={isNwd ? undefined : e => onMouseEnter(e.currentTarget as HTMLDivElement, di, dstr, rowId)}
      onMouseLeave={isNwd ? undefined : e => onMouseLeave(e.currentTarget as HTMLDivElement, dstr)}
      onTouchStart={isNwd ? undefined : e => { e.preventDefault(); onTouchStart(di, dstr, rowId, !filled); }}
      onDoubleClick={isNwd ? undefined : e => { e.preventDefault(); e.stopPropagation(); onDblClick(e.currentTarget as HTMLDivElement, rowId, dstr); }}
      onContextMenu={isNwd ? undefined : e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, rowId, dstr); }}
    >
      {pins.map(pin => (
        <PinLabel
          key={pin.id}
          pin={pin}
          rowId={rowId}
          dateStr={dstr}
          onResize={onPinResize}
          onDelete={onPinDelete}
          onEdit={onPinEdit}
        />
      ))}
    </div>
  );
});

// ── Main GanttPane ────────────────────────────────────────────────────────────
export const GanttPane = React.memo(function GanttPane({
  scrollPaneRef,
  ganttDays,
}: GanttPaneProps) {
  const { state, dispatch, saveHistory, setPanel, setContextMenu } = useAppContext();
  const { filterMembers, showDone } = useAppContext();
  const { norm, pin: pinnedProjects } = useVisibleProjects(state.projects, filterMembers, showDone);

  const today = todayStr();
  const cellMapRef = useRef<CellMap>(new Map());

  // ── Drag paint ──────────────────────────────────────────────────────────────
  const drag = useRef<{ on: boolean; rowId: string | null; painting: boolean; lastIdx: number }>({
    on: false, rowId: null, painting: false, lastIdx: -1,
  });

  const applyCell = useCallback((rowId: string, dstr: string, paint: boolean) => {
    // Optimistic DOM update for smooth drag
    const cell = cellMapRef.current.get(buildCellKey(rowId, dstr));
    if (cell) {
      const proj = state.projects.find(p => p.rows.some(r => r.id === rowId));
      const row = proj?.rows.find(r => r.id === rowId);
      if (row) {
        const mem = state.members.find(m => m.id === row.memberId) ?? { color: '#aaa' };
        cell.style.background = paint ? `${mem.color}cc` : '';
      }
    }
    dispatch({ type: 'SET_CELLS', rowId, dates: [dstr], value: paint });
  }, [state.projects, state.members, dispatch]);

  const handleCellMouseDown = useCallback((di: number, dstr: string, rowId: string, paint: boolean) => {
    drag.current = { on: true, rowId, painting: paint, lastIdx: di };
    applyCell(rowId, dstr, paint);
  }, [applyCell]);

  const rafDragRef = useRef(false);
  const handleCellMouseEnter = useCallback((el: HTMLDivElement, di: number, dstr: string, rowId: string) => {
    if (!drag.current.on || drag.current.rowId !== rowId) {
      if (!drag.current.on) {
        const proj = state.projects.find(p => p.rows.some(r => r.id === rowId));
        const row = proj?.rows.find(r => r.id === rowId);
        if (row && !row.cells[dstr]) {
          const mem = state.members.find(m => m.id === row.memberId) ?? { color: '#aaa' };
          el.style.background = `rgba(${hexToRgb(mem.color)},.10)`;
        }
      }
      return;
    }
    if (rafDragRef.current) return;
    rafDragRef.current = true;
    requestAnimationFrame(() => {
      rafDragRef.current = false;
      const from = drag.current.lastIdx >= 0 ? drag.current.lastIdx : di;
      const to = di;
      const step = from <= to ? 1 : -1;
      for (let i = from; i !== to + step; i += step) {
        if (i < 0 || i >= ganttDays.length) continue;
        const d2 = dk(ganttDays[i]);
        if (isNWD(d2, state.customNonWorkingDays, state.removedHolidays)) continue;
        const c = cellMapRef.current.get(buildCellKey(drag.current.rowId!, d2));
        if (!c || c.classList.contains(styles.nwdCell) || c.classList.contains(styles.arcCell)) continue;
        applyCell(drag.current.rowId!, d2, drag.current.painting);
      }
      drag.current.lastIdx = di;
    });
  }, [ganttDays, state.customNonWorkingDays, state.removedHolidays, state.projects, state.members, applyCell]);

  const handleCellMouseLeave = useCallback((el: HTMLDivElement, dstr: string) => {
    if (!drag.current.on) {
      const proj = state.projects.find(p => p.rows.some(r => r.id === (el.dataset as any).rowId));
      if (!proj) { el.style.background = ''; return; }
      const rowId = (el.dataset as any).rowId;
      const row = proj.rows.find(r => r.id === rowId);
      if (row && !row.cells[dstr]) el.style.background = '';
    }
  }, [state.projects]);

  const handleCellTouchStart = useCallback((di: number, dstr: string, rowId: string, paint: boolean) => {
    drag.current = { on: true, rowId, painting: paint, lastIdx: di };
    applyCell(rowId, dstr, paint);
  }, [applyCell]);

  useEffect(() => {
    const onMouseUp = () => {
      if (drag.current.on) saveHistory();
      drag.current.on = false;
      drag.current.lastIdx = -1;
    };
    const onTouchEnd = () => {
      if (drag.current.on) saveHistory();
      drag.current.on = false;
      drag.current.lastIdx = -1;
    };
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [saveHistory]);

  // Touch move for cells
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!drag.current.on) return;
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!el) return;
      const cell = el.closest('[data-gantt-cell]') as HTMLDivElement | null;
      if (!cell) return;
      const dstr = cell.dataset.dk;
      const rowId = cell.dataset.rowId;
      const di = parseInt(cell.dataset.di ?? '-1');
      if (!dstr || rowId !== drag.current.rowId || di < 0) return;
      handleCellMouseEnter(cell, di, dstr, rowId);
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', onTouchMove);
  }, [handleCellMouseEnter]);

  // ── Pin resize ──────────────────────────────────────────────────────────────
  const pinResize = useRef<{ on: boolean; rowId: string; dateStr: string; pinId: string; startX: number; origSpan: number }>({
    on: false, rowId: '', dateStr: '', pinId: '', startX: 0, origSpan: 1,
  });

  const handlePinResizeStart = useCallback((rowId: string, dateStr: string, pinId: string, startX: number, origSpan: number) => {
    pinResize.current = { on: true, rowId, dateStr, pinId, startX, origSpan };
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!pinResize.current.on) return;
      const newSpan = Math.max(1, pinResize.current.origSpan + Math.round((e.clientX - pinResize.current.startX) / CELL_W));
      dispatch({ type: 'RESIZE_PIN', rowId: pinResize.current.rowId, dateStr: pinResize.current.dateStr, pinId: pinResize.current.pinId, span: newSpan });
    };
    const onMouseUp = () => {
      if (pinResize.current.on) { saveHistory(); pinResize.current.on = false; }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
  }, [dispatch, saveHistory]);

  const handlePinDelete = useCallback((rowId: string, dateStr: string, pinId: string) => {
    saveHistory();
    dispatch({ type: 'DELETE_PIN', rowId, dateStr, pinId });
  }, [dispatch, saveHistory]);

  const handlePinEdit = useCallback((rowId: string, dateStr: string, pinId: string, label: string) => {
    saveHistory();
    dispatch({ type: 'UPDATE_PIN_LABEL', rowId, dateStr, pinId, label });
  }, [dispatch, saveHistory]);

  // ── Inline pin input ────────────────────────────────────────────────────────
  const pinInputRef = useRef<HTMLInputElement | null>(null);
  const pinInputWrapRef = useRef<HTMLDivElement | null>(null);

  const handleCellDblClick = useCallback((cellEl: HTMLDivElement, rowId: string, dstr: string) => {
    pinInputWrapRef.current?.remove();
    const wrap = document.createElement('div');
    wrap.className = styles.pinInputWrap;
    const input = document.createElement('input');
    input.className = styles.pinInput;
    input.placeholder = 'ラベル…';
    wrap.appendChild(input);
    cellEl.appendChild(wrap);
    input.focus();
    pinInputRef.current = input;
    pinInputWrapRef.current = wrap;

    function commit() {
      const label = input.value.trim();
      wrap.remove();
      if (!label) return;
      saveHistory();
      dispatch({ type: 'ADD_PIN', rowId, dateStr: dstr, label });
    }
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') wrap.remove();
    });
    input.addEventListener('blur', () => setTimeout(() => wrap.remove(), 100));
  }, [dispatch, saveHistory]);

  // ── Archive bar drag ────────────────────────────────────────────────────────
  const arcDrag = useRef<{ on: boolean; startX: number; startDk: string; startIdx: number; startBarLeft: number }>({
    on: false, startX: 0, startDk: '', startIdx: 0, startBarLeft: 0,
  });
  const archiveBarRef = useRef<HTMLDivElement>(null);

  const getArchiveBarLeft = useCallback(() => {
    const aIdx = ganttDays.findIndex(d => dk(d) === state.view.archiveBefore);
    return aIdx >= 0 ? (aIdx + 1) * CELL_W - 0.5 : -1;
  }, [ganttDays, state.view.archiveBefore]);

  useEffect(() => {
    const bar = archiveBarRef.current;
    if (!bar) return;
    const left = getArchiveBarLeft();
    if (left >= 0) { bar.style.display = 'block'; bar.style.left = left + 'px'; }
    else bar.style.display = 'none';
  });

  useEffect(() => {
    const bar = archiveBarRef.current;
    if (!bar) return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      const aIdx = ganttDays.findIndex(d => dk(d) === state.view.archiveBefore);
      const startBarLeft = aIdx >= 0 ? (aIdx + 1) * CELL_W - 0.5 : 90 * CELL_W - 0.5;
      arcDrag.current = { on: true, startX: e.clientX, startDk: state.view.archiveBefore, startIdx: aIdx >= 0 ? aIdx : 90, startBarLeft };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!arcDrag.current.on) return;
      const dx = e.clientX - arcDrag.current.startX;
      const deltaDays = Math.round(dx / CELL_W);
      const newLeft = arcDrag.current.startBarLeft + deltaDays * CELL_W;
      if (bar) bar.style.left = newLeft + 'px';
      const baseDate = new Date(arcDrag.current.startDk.replace(/-/g, '/'));
      baseDate.setDate(baseDate.getDate() + deltaDays);
      const newDk = dk(baseDate);
      if (newDk !== state.view.archiveBefore) {
        dispatch({ type: 'SET_ARCHIVE_BEFORE', dateStr: newDk });
      }
    };

    const onMouseUp = () => { arcDrag.current.on = false; };

    bar.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      bar.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [ganttDays, state.view.archiveBefore, dispatch]);

  // ── Day context menu ────────────────────────────────────────────────────────
  const handleDayContextMenu = useCallback((e: React.MouseEvent, dstr: string, d: Date) => {
    const nwd = isNWD(dstr, state.customNonWorkingDays, state.removedHolidays, d);
    const isDefaultNWD = (isWknd(d) || isHol(d)) && !state.removedHolidays.includes(dstr);
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: '🗂 ここまでをアーカイブ', action: () => dispatch({ type: 'SET_ARCHIVE_BEFORE', dateStr: dstr }) },
        { label: '🗂 この週までをアーカイブ', action: () => {
          const dw = d.getDay();
          const eow = new Date(d);
          eow.setDate(eow.getDate() + (dw === 0 ? 0 : 7 - dw));
          dispatch({ type: 'SET_ARCHIVE_BEFORE', dateStr: dk(eow) });
        }},
        { label: '', separator: true },
        nwd
          ? { label: '✓ 非稼働日を解除', action: () => { saveHistory(); dispatch({ type: 'REMOVE_NWD', dateStr: dstr, isDefaultNWD }); } }
          : { label: '🚫 非稼働日に設定', action: () => { saveHistory(); dispatch({ type: 'ADD_NWD', dateStr: dstr }); } },
      ],
    });
  }, [state.customNonWorkingDays, state.removedHolidays, dispatch, saveHistory, setContextMenu]);

  // ── Cell context menu ───────────────────────────────────────────────────────
  const handleCellContextMenu = useCallback((e: React.MouseEvent, rowId: string, dstr: string) => {
    const proj = state.projects.find(p => p.rows.some(r => r.id === rowId));
    if (!proj) return;
    const hasPins = (state.pins[rowId]?.[dstr]?.length ?? 0) > 0;
    const isArc = dstr <= state.view.archiveBefore;
    const items: ContextMenuItem[] = [];
    if (!hasPins && !isArc) {
      items.push({
        label: '📌 ピンを追加',
        action: () => {
          const cellEl = cellMapRef.current.get(buildCellKey(rowId, dstr));
          if (cellEl) handleCellDblClick(cellEl, rowId, dstr);
        },
      });
      items.push({ label: '', separator: true });
    }
    items.push({ label: '📅 日数を指定して追加', action: () => setPanel({ type: 'bulkAdd', projectId: proj.id, rowId, startDate: dstr }) });
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, items });
  }, [state.projects, state.pins, state.view.archiveBefore, handleCellDblClick, setContextMenu, setPanel]);

  // ── Render rows ─────────────────────────────────────────────────────────────
  function renderProjectGroup(proj: Project, isPinned: boolean) {
    const sortedRows = [...proj.rows].sort((a, b) => a.order - b.order);
    return (
      <div key={proj.id} className={`${styles.gridGroup} ${isPinned ? styles.gridGroupPinned : ''}`}>
        {sortedRows.map((row, ri) => {
          const mem = state.members.find(m => m.id === row.memberId) ?? { id: '', name: '?', color: '#aaa' };
          return (
            <div key={row.id} className={`${styles.gridRow} ${ri === 0 ? styles.gridRowFirst : ''}`}>
              {ganttDays.map((d, di) => {
                const dstr = dk(d);
                const nwd = isNWD(dstr, state.customNonWorkingDays, state.removedHolidays, d);
                const arc = dstr <= state.view.archiveBefore;
                const filled = !!row.cells[dstr];
                const rowPins = state.pins[row.id]?.[dstr] ?? [];

                return (
                  <GanttCell
                    key={dstr}
                    dstr={dstr}
                    di={di}
                    rowId={row.id}
                    filled={filled}
                    color={mem.color}
                    isNwd={nwd}
                    isArc={arc}
                    isWknd={isWknd(d)}
                    isToday={dstr === today}
                    pins={rowPins}
                    cellRef={el => {
                      const key = buildCellKey(row.id, dstr);
                      if (el) {
                        cellMapRef.current.set(key, el);
                        // attach dataset for touch events
                        el.dataset['dk'] = dstr;
                        el.dataset['rowId'] = row.id;
                        el.dataset['di'] = String(di);
                        el.dataset['ganttCell'] = '1';
                      } else {
                        cellMapRef.current.delete(key);
                      }
                    }}
                    onMouseDown={handleCellMouseDown}
                    onMouseEnter={handleCellMouseEnter}
                    onMouseLeave={handleCellMouseLeave}
                    onTouchStart={handleCellTouchStart}
                    onDblClick={handleCellDblClick}
                    onContextMenu={handleCellContextMenu}
                    onPinResize={handlePinResizeStart}
                    onPinDelete={handlePinDelete}
                    onPinEdit={handlePinEdit}
                  />
                );
              })}
            </div>
          );
        })}
        <div className={styles.gridSpacer} />
      </div>
    );
  }

  return (
    <div className={styles.scrollPane} ref={scrollPaneRef}>
      <div className={styles.ganttInner}>
        <DateHeader
          days={ganttDays}
          archiveBefore={state.view.archiveBefore}
          customNonWorkingDays={state.customNonWorkingDays}
          removedHolidays={state.removedHolidays}
          onDayContextMenu={handleDayContextMenu}
        />

        <div className={styles.rowsArea}>
          {norm.map(proj => renderProjectGroup(proj, false))}
          {pinnedProjects.length > 0 && (
            <>
              <div className={styles.gridSep} style={{ width: ganttDays.length * CELL_W }} />
              {pinnedProjects.map(proj => renderProjectGroup(proj, true))}
            </>
          )}
          <div style={{ height: 36 }} />
        </div>

        <div ref={archiveBarRef} className={styles.archiveBar} />
      </div>
    </div>
  );
});
