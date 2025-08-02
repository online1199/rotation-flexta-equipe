// Types pour l'application de planification de rotation

export type DateISO = string; // "YYYY-MM-DD"

export type LeaveRange = { start: DateISO; end: DateISO }; // inclusif

export type Person = {
  id: string;
  name: string;
  leaves: LeaveRange[];
};

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  leaves: LeaveRange[];
}

export interface Assignment {
  dateISO: DateISO;
  eighteen: string[]; // ≤ 3
  sixteen: string[];  // ≤ 2
  absents: string[];  // noms en congé ce jour
  missing: number;    // postes non pourvus (0..5)
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