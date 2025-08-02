import type { ScheduleState, TeamMember, Assignment, PlannerParams } from './types';

const STORAGE_KEYS = {
  TEAM_MEMBERS: 'rotation-planner-team-members',
  ASSIGNMENTS: 'rotation-planner-assignments',
  LOCKED_DAYS: 'rotation-planner-locked-days',
  PLANNER_PARAMS: 'rotation-planner-params'
} as const;

/**
 * Sauvegarde les membres de l'équipe
 */
export function saveTeamMembers(teamMembers: TeamMember[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEAM_MEMBERS, JSON.stringify(teamMembers));
  } catch (error) {
    console.error('Erreur sauvegarde équipe:', error);
  }
}

/**
 * Charge les membres de l'équipe
 */
export function loadTeamMembers(): TeamMember[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TEAM_MEMBERS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erreur chargement équipe:', error);
    return [];
  }
}

/**
 * Sauvegarde les affectations
 */
export function saveAssignments(assignments: Assignment[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
  } catch (error) {
    console.error('Erreur sauvegarde planning:', error);
  }
}

/**
 * Charge les affectations
 */
export function loadAssignments(): Assignment[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erreur chargement planning:', error);
    return [];
  }
}

/**
 * Sauvegarde les jours verrouillés
 */
export function saveLockedDays(lockedDays: Record<string, Assignment>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCKED_DAYS, JSON.stringify(lockedDays));
  } catch (error) {
    console.error('Erreur sauvegarde jours verrouillés:', error);
  }
}

/**
 * Charge les jours verrouillés
 */
export function loadLockedDays(): Record<string, Assignment> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LOCKED_DAYS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Erreur chargement jours verrouillés:', error);
    return {};
  }
}

/**
 * Sauvegarde les paramètres du planificateur
 */
export function savePlannerParams(params: PlannerParams): void {
  try {
    const serialized = {
      ...params,
      startDate: params.startDate.toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.PLANNER_PARAMS, JSON.stringify(serialized));
  } catch (error) {
    console.error('Erreur sauvegarde paramètres:', error);
  }
}

/**
 * Charge les paramètres du planificateur
 */
export function loadPlannerParams(): PlannerParams | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PLANNER_PARAMS);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      startDate: new Date(parsed.startDate)
    };
  } catch (error) {
    console.error('Erreur chargement paramètres:', error);
    return null;
  }
}

/**
 * Sauvegarde l'état complet
 */
export function saveScheduleState(state: Partial<ScheduleState>): void {
  if (state.teamMembers) saveTeamMembers(state.teamMembers);
  if (state.assignments) saveAssignments(state.assignments);
  if (state.lockedDays) saveLockedDays(state.lockedDays);
  if (state.plannerParams) savePlannerParams(state.plannerParams);
}

/**
 * Charge l'état complet
 */
export function loadScheduleState(): Partial<ScheduleState> {
  return {
    teamMembers: loadTeamMembers(),
    assignments: loadAssignments(),
    lockedDays: loadLockedDays(),
    plannerParams: loadPlannerParams() || undefined
  };
}

/**
 * Efface toutes les données
 */
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}