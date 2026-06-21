import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { PALETTE } from '../../constants/palette';
import { dk, getGanttStartDate, addD, isNWD } from '../../utils/date';
import styles from './SidePanel.module.css';

// ── Palette component ─────────────────────────────────────────────────────────
function PaletteGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  // sel済みスウォッチ → value（有効な6桁HEX）→ PALETTE[0] の優先順で初期値決定
  const selSwatch = PALETTE.includes(value) ? value : null;
  const safeValue = selSwatch
    ?? (value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : PALETTE[0]);

  return (
    <div>
      <div className={styles.paletteGrid}>
        {PALETTE.map(c => (
          <div
            key={c}
            className={`${styles.pswatch} ${c === safeValue ? styles.pswatchSel : ''}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
      <div className={styles.hexRow}>
        <input
          type="color"
          value={safeValue}
          onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value); }}
        />
        <input
          type="text"
          value={safeValue}
          maxLength={7}
          placeholder="#000000"
          onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value); }}
        />
      </div>
    </div>
  );
}

// ── Add / Edit project form ────────────────────────────────────────────────────
function ProjectForm({ projectId }: { projectId?: string }) {
  const { state, dispatch, saveHistory, setPanel } = useAppContext();
  const proj = projectId ? state.projects.find(p => p.id === projectId) : undefined;

  const [name, setName] = useState(proj?.name ?? '');
  const [pages, setPages] = useState(proj?.pages ?? '');
  const [start, setStart] = useState(proj?.start ?? '');
  const [deadline, setDeadline] = useState(proj?.deadline ?? '');
  const defM1 = state.members.find(m => m.id === 'm13')?.id ?? state.members[0]?.id ?? '';
  const defM2 = state.members.find(m => m.id === 'm14')?.id ?? state.members[1]?.id ?? '';
  const defM3 = state.members.find(m => m.id === 'm15')?.id ?? '';
  const [m1, setM1] = useState(defM1);
  const [m2, setM2] = useState(defM2);
  const [m3, setM3] = useState(defM3);

  const handleOk = () => {
    if (!name.trim()) return;
    saveHistory();
    if (proj) {
      dispatch({ type: 'UPDATE_PROJECT', id: proj.id, patch: { name: name.trim(), pages, start, deadline } });
    } else {
      const memberIds = [m1, m2, m3].filter(Boolean);
      dispatch({ type: 'ADD_PROJECT', name: name.trim(), pages, start, deadline, memberIds });
    }
    setPanel({ type: 'none' });
  };

  const handleDelete = () => {
    if (!proj) return;
    saveHistory();
    dispatch({ type: 'DELETE_PROJECT', id: proj.id });
    setPanel({ type: 'none' });
  };

  return (
    <>
      <div className={styles.fg}>
        <label>案件名</label>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleOk(); }} />
      </div>
      <div className={styles.fg}>
        <label>ページ数</label>
        <input value={pages} onChange={e => setPages(e.target.value)} placeholder="例：18P" />
      </div>
      <div className={styles.fg}>
        <label>制作開始</label>
        <input value={start} onChange={e => setStart(e.target.value)} placeholder="例：2025/6" />
      </div>
      <div className={styles.fg}>
        <label>期限</label>
        <input value={deadline} onChange={e => setDeadline(e.target.value)} placeholder="例：なし" />
      </div>
      {!proj && (
        <>
          <div className={styles.fg}>
            <label>担当1</label>
            <select value={m1} onChange={e => setM1(e.target.value)}>
              {state.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className={styles.fg}>
            <label>担当2</label>
            <select value={m2} onChange={e => setM2(e.target.value)}>
              {state.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className={styles.fg}>
            <label>担当3（任意）</label>
            <select value={m3} onChange={e => setM3(e.target.value)}>
              <option value="">なし</option>
              {state.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </>
      )}
      <div className={styles.footer} style={{ padding: 0, border: 'none', marginTop: 8 }}>
        {proj && <button className={styles.btnDanger} onClick={handleDelete}>削除</button>}
        <button className={styles.btnCancel} onClick={() => setPanel({ type: 'none' })}>キャンセル</button>
        <button className={styles.btnOk} onClick={handleOk}>保存</button>
      </div>
    </>
  );
}

// ── Add / Edit member form ─────────────────────────────────────────────────────
function MemberForm({ memberId }: { memberId?: string }) {
  const { state, dispatch, saveHistory, setPanel } = useAppContext();
  const mem = memberId ? state.members.find(m => m.id === memberId) : undefined;

  const [name, setName] = useState(mem?.name ?? '');
  const [color, setColor] = useState(mem?.color ?? PALETTE[state.members.length % PALETTE.length]);

  const handleOk = () => {
    if (!name.trim()) return;
    saveHistory();
    if (mem) {
      dispatch({ type: 'UPDATE_MEMBER', id: mem.id, name: name.trim(), color });
    } else {
      dispatch({ type: 'ADD_MEMBER', name: name.trim(), color });
    }
    setPanel({ type: 'none' });
  };

  const handleDelete = () => {
    if (!mem) return;
    saveHistory();
    dispatch({ type: 'DELETE_MEMBER', id: mem.id });
    setPanel({ type: 'none' });
  };

  return (
    <>
      <div className={styles.fg}>
        <label>名前</label>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleOk(); }} />
      </div>
      <div className={styles.fg}>
        <label>カラー</label>
        <PaletteGrid value={color} onChange={setColor} />
      </div>
      <div className={styles.footer} style={{ padding: 0, border: 'none', marginTop: 8 }}>
        {mem && <button className={styles.btnDanger} onClick={handleDelete}>削除</button>}
        <button className={styles.btnCancel} onClick={() => setPanel({ type: 'none' })}>キャンセル</button>
        <button className={styles.btnOk} onClick={handleOk}>保存</button>
      </div>
    </>
  );
}

// ── Add row form ───────────────────────────────────────────────────────────────
function AddRowForm({ projectId }: { projectId: string }) {
  const { state, dispatch, saveHistory, setPanel } = useAppContext();
  const proj = state.projects.find(p => p.id === projectId);
  const [memberId, setMemberId] = useState(state.members[0]?.id ?? '');

  const handleOk = () => {
    saveHistory();
    dispatch({ type: 'ADD_ROW', projectId, memberId });
    setPanel({ type: 'none' });
  };

  return (
    <>
      {proj && <div className={styles.subNote}>{proj.name}</div>}
      <div className={styles.fg}>
        <label>担当者</label>
        <select value={memberId} onChange={e => setMemberId(e.target.value)}>
          {state.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className={styles.footer} style={{ padding: 0, border: 'none', marginTop: 8 }}>
        <button className={styles.btnCancel} onClick={() => setPanel({ type: 'none' })}>キャンセル</button>
        <button className={styles.btnOk} onClick={handleOk}>追加</button>
      </div>
    </>
  );
}

// ── Edit row form ──────────────────────────────────────────────────────────────
function EditRowForm({ projectId, rowId }: { projectId: string; rowId: string }) {
  const { state, dispatch, saveHistory, setPanel } = useAppContext();
  const proj = state.projects.find(p => p.id === projectId);
  const row = proj?.rows.find(r => r.id === rowId);
  const [memberId, setMemberId] = useState(row?.memberId ?? '');

  const handleOk = () => {
    saveHistory();
    dispatch({ type: 'UPDATE_ROW', projectId, rowId, memberId });
    setPanel({ type: 'none' });
  };

  const handleDelete = () => {
    if (!proj || !row) return;
    if (proj.rows.length <= 1) { alert('最後の担当者行は削除できません。'); return; }
    saveHistory();
    dispatch({ type: 'DELETE_ROW', projectId, rowId });
    setPanel({ type: 'none' });
  };

  return (
    <>
      <div className={styles.fg}>
        <label>担当者</label>
        <select value={memberId} onChange={e => setMemberId(e.target.value)}>
          {state.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className={styles.footer} style={{ padding: 0, border: 'none', marginTop: 8 }}>
        <button className={styles.btnDanger} onClick={handleDelete}>行を削除</button>
        <button className={styles.btnCancel} onClick={() => setPanel({ type: 'none' })}>キャンセル</button>
        <button className={styles.btnOk} onClick={handleOk}>変更</button>
      </div>
    </>
  );
}

// ── Bulk add form ──────────────────────────────────────────────────────────────
function BulkAddForm({ projectId, rowId, startDate }: { projectId: string; rowId: string; startDate: string }) {
  const { state, dispatch, saveHistory, setPanel } = useAppContext();
  const proj = state.projects.find(p => p.id === projectId);
  const row = proj?.rows.find(r => r.id === rowId);
  const mem = state.members.find(m => m.id === row?.memberId);
  const [days, setDays] = useState('10');

  const handleOk = () => {
    const n = parseInt(days) || 0;
    if (n < 1) return;
    saveHistory();
    const allDays = Array.from({ length: state.view.days }, (_, i) => addD(getGanttStartDate(), i));
    const si = allDays.findIndex(d => dk(d) === startDate);
    if (si < 0) return;
    const dates: string[] = [];
    for (let i = 0; i < n; i++) {
      if (si + i >= allDays.length) break;
      const d2 = dk(allDays[si + i]);
      if (isNWD(d2, state.customNonWorkingDays, state.removedHolidays)) continue;
      if (d2 <= state.view.archiveBefore) continue;
      dates.push(d2);
    }
    dispatch({ type: 'SET_CELLS', rowId, dates, value: true });
    setPanel({ type: 'none' });
  };

  return (
    <>
      <div className={styles.subNote}>{proj?.name} — {mem?.name} / {startDate}〜</div>
      <div className={styles.fg}>
        <label>日数</label>
        <input
          autoFocus
          type="number"
          value={days}
          min="1"
          max="180"
          onChange={e => setDays(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleOk(); }}
        />
      </div>
      <div className={styles.footer} style={{ padding: 0, border: 'none', marginTop: 8 }}>
        <button className={styles.btnCancel} onClick={() => setPanel({ type: 'none' })}>キャンセル</button>
        <button className={styles.btnOk} onClick={handleOk}>追加</button>
      </div>
    </>
  );
}

// ── Shift cells form ───────────────────────────────────────────────────────────
function ShiftForm({ projectId, rowId }: { projectId: string; rowId: string }) {
  const { state, dispatch, saveHistory, setPanel } = useAppContext();
  const proj = state.projects.find(p => p.id === projectId);
  const row = proj?.rows.find(r => r.id === rowId);
  const mem = state.members.find(m => m.id === row?.memberId);
  const [days, setDays] = useState('7');

  const handleOk = () => {
    const n = parseInt(days);
    if (isNaN(n) || n === 0) return;
    saveHistory();
    dispatch({ type: 'SHIFT_CELLS', rowId, days: n });
    setPanel({ type: 'none' });
  };

  return (
    <>
      <div className={styles.subNote}>{proj?.name} — {mem?.name}</div>
      <div className={styles.fg}>
        <label>日数（マイナスで前倒し）</label>
        <input
          autoFocus
          type="number"
          value={days}
          onChange={e => setDays(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleOk(); }}
        />
      </div>
      <div className={styles.footer} style={{ padding: 0, border: 'none', marginTop: 8 }}>
        <button className={styles.btnCancel} onClick={() => setPanel({ type: 'none' })}>キャンセル</button>
        <button className={styles.btnOk} onClick={handleOk}>ずらす</button>
      </div>
    </>
  );
}

// ── Panel shell ────────────────────────────────────────────────────────────────
export function SidePanel() {
  const { panel, setPanel } = useAppContext();
  const isOpen = panel.type !== 'none';

  const titleMap: Record<string, string> = {
    addProject: '＋ 案件を追加',
    editProject: '案件を編集',
    addMember: '＋ メンバーを追加',
    editMember: 'メンバーを編集',
    addRow: '担当者を追加',
    editRow: '担当者を変更',
    bulkAdd: '日数を指定',
    shiftCells: 'スケジュールをずらす',
  };

  const title = panel.type !== 'none' ? titleMap[panel.type] ?? '' : '';

  function renderBody() {
    switch (panel.type) {
      case 'addProject': return <ProjectForm />;
      case 'editProject': return <ProjectForm projectId={panel.projectId} />;
      case 'addMember': return <MemberForm />;
      case 'editMember': return <MemberForm memberId={panel.memberId} />;
      case 'addRow': return <AddRowForm projectId={panel.projectId} />;
      case 'editRow': return <EditRowForm projectId={panel.projectId} rowId={panel.rowId} />;
      case 'bulkAdd': return <BulkAddForm projectId={panel.projectId} rowId={panel.rowId} startDate={panel.startDate} />;
      case 'shiftCells': return <ShiftForm projectId={panel.projectId} rowId={panel.rowId} />;
      default: return null;
    }
  }

  return (
    <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}>
      <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.closeBtn} onClick={() => setPanel({ type: 'none' })}>✕</button>
        </div>
        <div className={styles.body}>
          {isOpen && renderBody()}
        </div>
      </div>
    </div>
  );
}
