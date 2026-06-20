import type { AppState, Project, Row } from '../types';
import { uid } from '../utils/uid';
import { dk } from '../utils/date';

export type Action =
  | { type: 'ADD_PROJECT'; name: string; pages: string; start: string; deadline: string; memberIds: string[] }
  | { type: 'UPDATE_PROJECT'; id: string; patch: Partial<Pick<Project, 'name' | 'pages' | 'start' | 'deadline' | 'status' | 'pinned'>> }
  | { type: 'DELETE_PROJECT'; id: string }
  | { type: 'REORDER_PROJECTS'; pinned: boolean; orderedIds: string[] }
  | { type: 'ADD_ROW'; projectId: string; memberId: string }
  | { type: 'UPDATE_ROW'; projectId: string; rowId: string; memberId: string }
  | { type: 'DELETE_ROW'; projectId: string; rowId: string }
  | { type: 'SET_CELLS'; rowId: string; dates: string[]; value: boolean }
  | { type: 'CLEAR_CELLS'; rowId: string }
  | { type: 'SHIFT_CELLS'; rowId: string; days: number }
  | { type: 'ADD_MEMBER'; name: string; color: string }
  | { type: 'UPDATE_MEMBER'; id: string; name: string; color: string }
  | { type: 'DELETE_MEMBER'; id: string }
  | { type: 'ADD_PIN'; rowId: string; dateStr: string; label: string }
  | { type: 'RESIZE_PIN'; rowId: string; dateStr: string; pinId: string; span: number }
  | { type: 'DELETE_PIN'; rowId: string; dateStr: string; pinId: string }
  | { type: 'UPDATE_PIN_LABEL'; rowId: string; dateStr: string; pinId: string; label: string }
  | { type: 'ADD_NWD'; dateStr: string }
  | { type: 'REMOVE_NWD'; dateStr: string; isDefaultNWD: boolean }
  | { type: 'SET_ARCHIVE_BEFORE'; dateStr: string }
  | { type: 'RESTORE_SNAPSHOT'; snapshot: AppState };

function updateRow(projects: Project[], rowId: string, updater: (row: Row) => Row): Project[] {
  return projects.map(p => ({
    ...p,
    rows: p.rows.map(r => (r.id === rowId ? updater(r) : r)),
  }));
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_PROJECT': {
      const rows: Row[] = action.memberIds.map((mid, i) => ({
        id: uid('r'),
        memberId: mid,
        order: i,
        cells: {},
      }));
      const newProj: Project = {
        id: uid('p'),
        name: action.name,
        pages: action.pages,
        start: action.start,
        deadline: action.deadline || 'なし',
        order: state.projects.filter(p => !p.pinned).length,
        status: 'active',
        pinned: false,
        rows,
      };
      return { ...state, projects: [...state.projects, newProj] };
    }

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.id ? { ...p, ...action.patch } : p,
        ),
      };

    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.id),
      };

    case 'REORDER_PROJECTS': {
      const { pinned, orderedIds } = action;
      const reordered = orderedIds.map((id, i) => {
        const proj = state.projects.find(p => p.id === id)!;
        return { ...proj, order: i };
      });
      const others = state.projects.filter(
        p => p.pinned !== pinned || !orderedIds.includes(p.id),
      );
      return { ...state, projects: [...others, ...reordered] };
    }

    case 'ADD_ROW': {
      return {
        ...state,
        projects: state.projects.map(p => {
          if (p.id !== action.projectId) return p;
          const newRow: Row = {
            id: uid('r'),
            memberId: action.memberId,
            order: p.rows.length,
            cells: {},
          };
          return { ...p, rows: [...p.rows, newRow] };
        }),
      };
    }

    case 'UPDATE_ROW':
      return {
        ...state,
        projects: state.projects.map(p => {
          if (p.id !== action.projectId) return p;
          return {
            ...p,
            rows: p.rows.map(r =>
              r.id === action.rowId ? { ...r, memberId: action.memberId } : r,
            ),
          };
        }),
      };

    case 'DELETE_ROW':
      return {
        ...state,
        projects: state.projects.map(p => {
          if (p.id !== action.projectId) return p;
          return { ...p, rows: p.rows.filter(r => r.id !== action.rowId) };
        }),
      };

    case 'SET_CELLS': {
      const { rowId, dates, value } = action;
      return {
        ...state,
        projects: updateRow(state.projects, rowId, row => {
          const cells = { ...row.cells };
          dates.forEach(d => {
            if (value) cells[d] = true;
            else delete cells[d];
          });
          return { ...row, cells };
        }),
      };
    }

    case 'CLEAR_CELLS':
      return {
        ...state,
        projects: updateRow(state.projects, action.rowId, row => ({
          ...row,
          cells: {},
        })),
      };

    case 'SHIFT_CELLS':
      return {
        ...state,
        projects: updateRow(state.projects, action.rowId, row => {
          const newCells: Record<string, true> = {};
          Object.keys(row.cells).forEach(dstr => {
            const d = new Date(dstr.replace(/-/g, '/'));
            d.setDate(d.getDate() + action.days);
            newCells[dk(d)] = true;
          });
          return { ...row, cells: newCells };
        }),
      };

    case 'ADD_MEMBER':
      return {
        ...state,
        members: [...state.members, { id: uid('m'), name: action.name, color: action.color }],
      };

    case 'UPDATE_MEMBER':
      return {
        ...state,
        members: state.members.map(m =>
          m.id === action.id ? { ...m, name: action.name, color: action.color } : m,
        ),
      };

    case 'DELETE_MEMBER':
      return {
        ...state,
        members: state.members.filter(m => m.id !== action.id),
      };

    case 'ADD_PIN': {
      const pins = JSON.parse(JSON.stringify(state.pins)) as AppState['pins'];
      if (!pins[action.rowId]) pins[action.rowId] = {};
      if (!pins[action.rowId][action.dateStr]) pins[action.rowId][action.dateStr] = [];
      pins[action.rowId][action.dateStr].push({ id: uid('pin'), label: action.label, span: 1 });
      return { ...state, pins };
    }

    case 'RESIZE_PIN': {
      const pins = JSON.parse(JSON.stringify(state.pins)) as AppState['pins'];
      const list = pins[action.rowId]?.[action.dateStr];
      if (list) {
        const pin = list.find(p => p.id === action.pinId);
        if (pin) pin.span = action.span;
      }
      return { ...state, pins };
    }

    case 'DELETE_PIN': {
      const pins = JSON.parse(JSON.stringify(state.pins)) as AppState['pins'];
      if (pins[action.rowId]?.[action.dateStr]) {
        pins[action.rowId][action.dateStr] = pins[action.rowId][action.dateStr].filter(
          p => p.id !== action.pinId,
        );
        if (!pins[action.rowId][action.dateStr].length) {
          delete pins[action.rowId][action.dateStr];
        }
      }
      return { ...state, pins };
    }

    case 'UPDATE_PIN_LABEL': {
      const pins = JSON.parse(JSON.stringify(state.pins)) as AppState['pins'];
      const list = pins[action.rowId]?.[action.dateStr];
      if (list) {
        const pin = list.find(p => p.id === action.pinId);
        if (pin) pin.label = action.label;
      }
      return { ...state, pins };
    }

    case 'ADD_NWD':
      if (state.customNonWorkingDays.includes(action.dateStr)) return state;
      return {
        ...state,
        customNonWorkingDays: [...state.customNonWorkingDays, action.dateStr],
        // removedHolidays から除去して土日/祝日を非稼働日に戻せるようにする
        removedHolidays: state.removedHolidays.filter(d => d !== action.dateStr),
      };

    case 'REMOVE_NWD': {
      const customNonWorkingDays = state.customNonWorkingDays.filter(d => d !== action.dateStr);
      const removedHolidays = action.isDefaultNWD && !state.removedHolidays.includes(action.dateStr)
        ? [...state.removedHolidays, action.dateStr]
        : state.removedHolidays;
      return { ...state, customNonWorkingDays, removedHolidays };
    }

    case 'SET_ARCHIVE_BEFORE':
      return { ...state, view: { ...state.view, archiveBefore: action.dateStr } };

    case 'RESTORE_SNAPSHOT':
      return action.snapshot;

    default:
      return state;
  }
}

export function cloneState(s: AppState): AppState {
  return JSON.parse(JSON.stringify(s));
}
