export type Status = 'active' | 'submitted' | 'testup' | 'done';

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface Row {
  id: string;
  memberId: string;
  order: number;
  cells: Record<string, true>;
}

export interface Project {
  id: string;
  name: string;
  pages: string;
  start: string;
  deadline: string;
  order: number;
  status: Status;
  pinned: boolean;
  rows: Row[];
}

export interface Pin {
  id: string;
  label: string;
  span: number;
}

export interface ViewState {
  archiveBefore: string;
  days: number;
}

export interface AppState {
  version: string;
  meta: { createdAt: string; updatedAt: string };
  members: Member[];
  projects: Project[];
  customNonWorkingDays: string[];
  removedHolidays: string[];
  pins: Record<string, Record<string, Pin[]>>;
  view: ViewState;
}

export type PanelMode =
  | { type: 'none' }
  | { type: 'addProject' }
  | { type: 'editProject'; projectId: string }
  | { type: 'editMember'; memberId: string }
  | { type: 'addMember' }
  | { type: 'addRow'; projectId: string }
  | { type: 'editRow'; projectId: string; rowId: string }
  | { type: 'bulkAdd'; projectId: string; rowId: string; startDate: string }
  | { type: 'shiftCells'; projectId: string; rowId: string };

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export interface ContextMenuItem {
  label: string;
  action?: () => void;
  danger?: boolean;
  separator?: boolean;
  subItems?: ContextMenuItem[];
}
