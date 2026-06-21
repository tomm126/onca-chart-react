import React, { useRef, useState, useCallback } from 'react';
import type { RefObject } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useVisibleProjects } from '../../hooks/useVisibleProjects';
import type { Project, Row, Status } from '../../types';
import { STATUS_LABELS } from '../../constants/palette';
import { isStartOverdue } from '../../utils/date';
import styles from './LeftPane.module.css';

interface LeftPaneProps {
  leftRowsRef: RefObject<HTMLDivElement | null>;
}

function InlineCellEdit({
  value,
  onCommit,
  onCancel,
}: {
  value: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={ref}
      className={styles.cellInlineInput}
      value={val}
      autoFocus
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) onCommit(val.trim());
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => setTimeout(onCancel, 100)}
    />
  );
}

function ProjectGroup({
  proj,
  isPinned,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverState: dragOver,
}: {
  proj: Project;
  isPinned: boolean;
  onDragStart: (projId: string) => void;
  onDragOver: (e: React.DragEvent, projId: string) => 'top' | 'bottom' | null;
  onDrop: (e: React.DragEvent, projId: string, before: boolean) => void;
  dragOverState: 'top' | 'bottom' | null;
}) {
  const { state, dispatch, saveHistory, setPanel, setContextMenu } = useAppContext();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'top' | 'bottom' | null>(null);

  // Row D&D state (#88)
  const rowDragRef = useRef<{ rowId: string } | null>(null);
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [rowDragOverMap, setRowDragOverMap] = useState<Record<string, 'top' | 'bottom'>>({});

  const getMem = useCallback((id: string) => {
    return state.members.find(m => m.id === id) ?? { id: '', name: '?', color: '#aaa' };
  }, [state.members]);

  const handleNameClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: '✏️ 編集', action: () => setPanel({ type: 'editProject', projectId: proj.id }) },
        { label: `🏷 ステータス: ${STATUS_LABELS[proj.status]}`, action: () => {} },
        ...Object.entries(STATUS_LABELS).map(([k, v]) => ({
          label: `${proj.status === k ? '✓ ' : ''}${v}`,
          action: () => {
            saveHistory();
            dispatch({ type: 'UPDATE_PROJECT', id: proj.id, patch: { status: k as Status } });
          },
        })),
        { label: '', separator: true },
        {
          label: proj.pinned ? '📌 固定を解除' : '📌 最下部に固定',
          action: () => {
            saveHistory();
            dispatch({ type: 'UPDATE_PROJECT', id: proj.id, patch: { pinned: !proj.pinned } });
          },
        },
        { label: '', separator: true },
        {
          label: '🗑 案件を削除',
          danger: true,
          action: () => { saveHistory(); dispatch({ type: 'DELETE_PROJECT', id: proj.id }); },
        },
      ],
    });
  }, [proj, dispatch, saveHistory, setPanel, setContextMenu]);

  const handleMemberTagClick = useCallback((e: React.MouseEvent, row: Row) => {
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: '✏️ 担当者を変更', action: () => setPanel({ type: 'editRow', projectId: proj.id, rowId: row.id }) },
        { label: '↔ スケジュールをずらす', action: () => setPanel({ type: 'shiftCells', projectId: proj.id, rowId: row.id }) },
        { label: '', separator: true },
        { label: '🧹 スケジュールをクリア', action: () => { saveHistory(); dispatch({ type: 'CLEAR_CELLS', rowId: row.id }); } },
        {
          label: '🗑 この行を削除',
          danger: true,
          action: () => {
            if (proj.rows.length > 1) {
              saveHistory();
              dispatch({ type: 'DELETE_ROW', projectId: proj.id, rowId: row.id });
            } else {
              alert('最後の担当者行は削除できません。');
            }
          },
        },
      ],
    });
  }, [proj, dispatch, saveHistory, setPanel, setContextMenu]);

  const commitEdit = useCallback((field: keyof Project, value: string) => {
    saveHistory();
    dispatch({ type: 'UPDATE_PROJECT', id: proj.id, patch: { [field]: value } as any });
    setEditingField(null);
  }, [proj.id, dispatch, saveHistory]);

  const statusClass = proj.status !== 'active' ? styles[`status${proj.status.charAt(0).toUpperCase() + proj.status.slice(1)}`] : '';

  const sortedRows = [...proj.rows].sort((a, b) => a.order - b.order);

  const groupClass = [
    styles.group,
    isPinned ? styles.groupPinned : '',
    statusClass,
    dragOver === 'top' ? styles.dragOverTop : '',
    dragOver === 'bottom' ? styles.dragOverBottom : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={groupClass}
      onDragOver={e => {
        const pos = onDragOver(e, proj.id);
        setDragPosition(pos);
      }}
      onDrop={e => {
        const before = dragPosition === 'top';
        setDragPosition(null);
        onDrop(e, proj.id, before);
      }}
      onDragLeave={() => setDragPosition(null)}
    >
      <div className={styles.groupInner}>
        <div
          className={styles.groupHandle}
          draggable
          onDragStart={() => onDragStart(proj.id)}
        >
          ⠿
        </div>
        <div className={styles.groupRows}>
          {sortedRows.map((row, ri) => {
            const mem = getMem(row.memberId);
            const isSecond = ri > 0;
            const statusLabelText = proj.status === 'submitted' ? 'coding' : proj.status === 'testup' ? 'test up' : '';

            const rowCls = [
              styles.row,
              draggingRowId === row.id ? styles.rowDragging : '',
              rowDragOverMap[row.id] === 'top' ? styles.rowDragOverTop : '',
              rowDragOverMap[row.id] === 'bottom' ? styles.rowDragOverBottom : '',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={row.id}
                className={rowCls}
                data-lp-row={row.id}
                onDragOver={e => {
                  if (!rowDragRef.current || rowDragRef.current.rowId === row.id) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const pos: 'top' | 'bottom' = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
                  setRowDragOverMap({ [row.id]: pos });
                }}
                onDragLeave={() => {
                  setRowDragOverMap(prev => {
                    const next = { ...prev };
                    delete next[row.id];
                    return next;
                  });
                }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const d = rowDragRef.current;
                  if (!d || d.rowId === row.id) return;
                  const pos = rowDragOverMap[row.id];
                  const before = pos === 'top';
                  setRowDragOverMap({});
                  rowDragRef.current = null;
                  setDraggingRowId(null);
                  saveHistory();
                  const rows = [...proj.rows].sort((a, b) => a.order - b.order);
                  const fi = rows.findIndex(r => r.id === d.rowId);
                  const ti = rows.findIndex(r => r.id === row.id);
                  if (fi < 0 || ti < 0) return;
                  const moved = rows.splice(fi, 1)[0];
                  const insertIdx = before
                    ? ti - (fi < ti ? 1 : 0)
                    : ti + (fi > ti ? 1 : 0);
                  rows.splice(insertIdx, 0, moved);
                  dispatch({ type: 'REORDER_ROWS', projectId: proj.id, orderedIds: rows.map(r => r.id) });
                }}
              >
                {/* 名前 */}
                <div
                  className={`${styles.cell} ${styles.cellName} ${isSecond ? styles.cellNameSecond : ''} ${editingField === `name-${proj.id}` ? styles.editing : ''}`}
                  onClick={!isSecond ? handleNameClick : undefined}
                  onDoubleClick={!isSecond ? e => { e.stopPropagation(); setEditingField(`name-${proj.id}`); } : undefined}
                  title={proj.name}
                >
                  {editingField === `name-${proj.id}` && !isSecond ? (
                    <InlineCellEdit
                      value={proj.name}
                      onCommit={v => v && commitEdit('name', v)}
                      onCancel={() => setEditingField(null)}
                    />
                  ) : (
                    <div className={styles.nameWrap}>
                      <span className={styles.nameText}>{isSecond ? '' : proj.name}</span>
                      {!isSecond && statusLabelText && (
                        <span className={styles.statusLabel}>{statusLabelText}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* ページ数 */}
                <div
                  className={`${styles.cell} ${styles.cellPages} ${isSecond ? styles.cellPagesSecond : ''} ${editingField === `pages-${proj.id}` && !isSecond ? styles.editing : ''}`}
                  onDoubleClick={!isSecond ? e => { e.stopPropagation(); setEditingField(`pages-${proj.id}`); } : undefined}
                >
                  {editingField === `pages-${proj.id}` && !isSecond ? (
                    <InlineCellEdit value={proj.pages} onCommit={v => commitEdit('pages', v)} onCancel={() => setEditingField(null)} />
                  ) : isSecond ? '' : proj.pages}
                </div>

                {/* 開始 */}
                <div
                  className={`${styles.cell} ${styles.cellStart} ${isSecond ? styles.cellStartSecond : ''} ${!isSecond && isStartOverdue(proj.start) ? styles.cellStartOverdue : ''} ${editingField === `start-${proj.id}` && !isSecond ? styles.editing : ''}`}
                  onDoubleClick={!isSecond ? e => { e.stopPropagation(); setEditingField(`start-${proj.id}`); } : undefined}
                >
                  {editingField === `start-${proj.id}` && !isSecond ? (
                    <InlineCellEdit value={proj.start} onCommit={v => commitEdit('start', v)} onCancel={() => setEditingField(null)} />
                  ) : isSecond ? '' : proj.start}
                </div>

                {/* 期限 */}
                <div
                  className={`${styles.cell} ${styles.cellDead} ${isSecond ? styles.cellDeadSecond : ''} ${editingField === `deadline-${proj.id}` && !isSecond ? styles.editing : ''}`}
                  onDoubleClick={!isSecond ? e => { e.stopPropagation(); setEditingField(`deadline-${proj.id}`); } : undefined}
                >
                  {editingField === `deadline-${proj.id}` && !isSecond ? (
                    <InlineCellEdit value={proj.deadline} onCommit={v => commitEdit('deadline', v)} onCancel={() => setEditingField(null)} />
                  ) : isSecond ? '' : proj.deadline}
                </div>

                {/* 担当 */}
                <div className={`${styles.cell} ${styles.cellMember}`}>
                  <span
                    className={styles.memberTag}
                    data-member-tag=""
                    draggable
                    style={{ color: mem.color, background: `${mem.color}18`, cursor: 'grab' }}
                    onDragStart={e => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', 'row');
                      rowDragRef.current = { rowId: row.id };
                      setTimeout(() => setDraggingRowId(row.id), 0);
                    }}
                    onDragEnd={() => {
                      rowDragRef.current = null;
                      setDraggingRowId(null);
                      setRowDragOverMap({});
                    }}
                    onClick={e => handleMemberTagClick(e, row)}
                  >
                    {mem.name}
                  </span>
                </div>
              </div>
            );
          })}

          <div className={styles.addRow} onClick={() => setPanel({ type: 'addRow', projectId: proj.id })}>
            ＋ 担当追加
          </div>
        </div>
      </div>
    </div>
  );
}

export const LeftPane = React.memo(function LeftPane({ leftRowsRef }: LeftPaneProps) {
  const { state, dispatch, saveHistory, setPanel, filterMembers, showDone } = useAppContext();
  const { norm, pin } = useVisibleProjects(state.projects, filterMembers, showDone);

  const draggingId = useRef<string | null>(null);
  const draggingPinned = useRef<boolean>(false);
  const [dragOverMap, setDragOverMap] = useState<Record<string, 'top' | 'bottom' | null>>({});

  const handleDragStart = useCallback((projId: string) => {
    const proj = state.projects.find(p => p.id === projId);
    if (!proj) return;
    draggingId.current = projId;
    draggingPinned.current = proj.pinned;
  }, [state.projects]);

  const handleDragOver = useCallback((e: React.DragEvent, projId: string) => {
    if (!draggingId.current || draggingId.current === projId) return null;
    const src = state.projects.find(p => p.id === draggingId.current);
    const tgt = state.projects.find(p => p.id === projId);
    if (!src || !tgt || src.pinned !== tgt.pinned) return null;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
    setDragOverMap(prev => ({ ...prev, [projId]: pos }));
    return pos;
  }, [state.projects]);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string, before: boolean) => {
    e.preventDefault();
    setDragOverMap({});
    if (!draggingId.current || draggingId.current === targetId) return;

    const arr = draggingPinned.current ? [...pin] : [...norm];
    const fi = arr.findIndex(p => p.id === draggingId.current);
    const ti = arr.findIndex(p => p.id === targetId);
    if (fi < 0 || ti < 0) return;

    const moved = arr.splice(fi, 1)[0];
    const insertIdx = before ? (ti - (fi < ti ? 1 : 0)) : (ti + (fi > ti ? 1 : 0));
    arr.splice(insertIdx, 0, moved);

    saveHistory();
    dispatch({ type: 'REORDER_PROJECTS', pinned: draggingPinned.current, orderedIds: arr.map(p => p.id) });
    draggingId.current = null;
  }, [norm, pin, dispatch, saveHistory]);

  return (
    <div className={styles.pane}>
      <div className={styles.header}>
        <div className={styles.lhHandle} />
        <div className={`${styles.lhCol} ${styles.lhName}`}>案件名</div>
        <div className={`${styles.lhCol} ${styles.lhPages}`}>P数</div>
        <div className={`${styles.lhCol} ${styles.lhStart}`}>制作開始</div>
        <div className={`${styles.lhCol} ${styles.lhDead}`}>期限</div>
        <div className={`${styles.lhCol} ${styles.lhMember}`}>担当</div>
      </div>

      <div className={styles.rows} ref={leftRowsRef}>
        {norm.map(proj => (
          <ProjectGroup
            key={proj.id}
            proj={proj}
            isPinned={false}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragOverState={dragOverMap[proj.id] ?? null}
          />
        ))}

        {pin.length > 0 && (
          <>
            <div className={styles.pinnedSep}>固定案件</div>
            {pin.map(proj => (
              <ProjectGroup
                key={proj.id}
                proj={proj}
                isPinned
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                dragOverState={dragOverMap[proj.id] ?? null}
              />
            ))}
          </>
        )}

        <div style={{ height: 36, flexShrink: 0 }} />
      </div>

      <div className={styles.footer}>
        <button className={styles.addProjBtn} onClick={() => setPanel({ type: 'addProject' })}>
          ＋ 案件を追加
        </button>
      </div>
    </div>
  );
});
