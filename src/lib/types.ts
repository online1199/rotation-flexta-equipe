// Types pour l'application de planification de rotation

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
}

export interface Assignment {
  dateISO: string;
  eighteen: string[];
  sixteen: string[];
  locked?: boolean;
}

export interface PlannerParams {
  startDate: Date;
  numberOfDays: number;
  skipWeekends: boolean;
}

export interface ScheduleState {
  teamMembers: TeamMember[];
  assignments: Assignment[];
  lockedDays: Record<string, Assignment>;
  plannerParams: PlannerParams;
}

export interface ExportOptions {
  format: 'csv' | 'ics' | 'json';
  filename?: string;
}

export type RotationShift = '18h' | '16h';

export interface ShiftAssignment {
  memberName: string;
  shift: RotationShift;
  date: string;
}