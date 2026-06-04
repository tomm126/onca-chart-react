import { useMemo } from 'react';
import type { Project } from '../types';

export function useVisibleProjects(
  projects: Project[],
  filterMembers: Set<string>,
  showDone: boolean,
): { norm: Project[]; pin: Project[] } {
  return useMemo(() => {
    let projs = projects;
    if (filterMembers.size > 0) {
      projs = projs
        .filter(p => p.rows.some(r => filterMembers.has(r.memberId)))
        .map(p => ({
          ...p,
          rows: p.rows.filter(r => filterMembers.has(r.memberId)).map(r => ({ ...r, cells: { ...r.cells } })),
        }));
    }
    const norm = projs
      .filter(p => !p.pinned && (showDone || p.status !== 'done'))
      .sort((a, b) => a.order - b.order);
    const pin = projs
      .filter(p => p.pinned && (showDone || p.status !== 'done'))
      .sort((a, b) => a.order - b.order);
    return { norm, pin };
  }, [projects, filterMembers, showDone]);
}
