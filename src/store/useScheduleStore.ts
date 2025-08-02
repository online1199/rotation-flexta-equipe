import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TeamMember, Assignment, PlannerParams, ScheduleState, LeaveRange } from '@/lib/types';
import { generateSchedule, generateScheduleWithLeaves, generateInitials } from '@/lib/rotation';
import { saveScheduleState, loadScheduleState } from '@/lib/storage';

interface ScheduleStore extends ScheduleState {
  // Actions
  setTeamMembers: (members: TeamMember[]) => void;
  addTeamMember: (name: string) => void;
  removeTeamMember: (id: string) => void;
  updateTeamMember: (id: string, name: string) => void;
  addLeaveToMember: (memberId: string, leave: LeaveRange) => void;
  removeLeaveFromMember: (memberId: string, leaveIndex: number) => void;
  reorderTeamMembers: (fromIndex: number, toIndex: number) => void;
  
  setPlannerParams: (params: PlannerParams) => void;
  generateSchedule: () => void;
  regenerateSchedule: () => void;
  
  lockDay: (dateISO: string, assignment: Assignment) => void;
  unlockDay: (dateISO: string) => void;
  updateAssignment: (dateISO: string, assignment: Omit<Assignment, 'dateISO'>) => void;
  
  loadFromStorage: () => void;
  clearAll: () => void;
  
  // État UI
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

const initialState: ScheduleState = {
  teamMembers: [],
  assignments: [],
  lockedDays: {},
  plannerParams: {
    startDate: new Date(),
    numberOfDays: 10,
    skipWeekends: true
  }
};

export const useScheduleStore = create<ScheduleStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      currentStep: 1,

      setTeamMembers: (members) => {
        set({ teamMembers: members });
        saveScheduleState({ teamMembers: members });
      },

      addTeamMember: (name) => {
        const { teamMembers } = get();
        if (teamMembers.length >= 5) return;
        
        const newMember: TeamMember = {
          id: crypto.randomUUID(),
          name: name.trim(),
          initials: generateInitials(name.trim()),
          leaves: []
        };
        
        const updatedMembers = [...teamMembers, newMember];
        set({ teamMembers: updatedMembers });
        saveScheduleState({ teamMembers: updatedMembers });
      },

      removeTeamMember: (id) => {
        const { teamMembers } = get();
        const updatedMembers = teamMembers.filter(member => member.id !== id);
        set({ teamMembers: updatedMembers });
        saveScheduleState({ teamMembers: updatedMembers });
      },

      updateTeamMember: (id, name) => {
        const { teamMembers } = get();
        const updatedMembers = teamMembers.map(member =>
          member.id === id
            ? { ...member, name: name.trim(), initials: generateInitials(name.trim()) }
            : member
        );
        set({ teamMembers: updatedMembers });
        saveScheduleState({ teamMembers: updatedMembers });
      },

      reorderTeamMembers: (fromIndex, toIndex) => {
        const { teamMembers } = get();
        const updatedMembers = [...teamMembers];
        const [movedMember] = updatedMembers.splice(fromIndex, 1);
        updatedMembers.splice(toIndex, 0, movedMember);
        
        set({ teamMembers: updatedMembers });
        saveScheduleState({ teamMembers: updatedMembers });
      },

      setPlannerParams: (params) => {
        set({ plannerParams: params });
        saveScheduleState({ plannerParams: params });
      },

      addLeaveToMember: (memberId, leave) => {
        const { teamMembers } = get();
        const updatedMembers = teamMembers.map(member =>
          member.id === memberId
            ? { ...member, leaves: [...member.leaves, leave] }
            : member
        );
        set({ teamMembers: updatedMembers });
        saveScheduleState({ teamMembers: updatedMembers });
      },

      removeLeaveFromMember: (memberId, leaveIndex) => {
        const { teamMembers } = get();
        const updatedMembers = teamMembers.map(member =>
          member.id === memberId
            ? { ...member, leaves: member.leaves.filter((_, index) => index !== leaveIndex) }
            : member
        );
        set({ teamMembers: updatedMembers });
        saveScheduleState({ teamMembers: updatedMembers });
      },

      generateSchedule: () => {
        const { teamMembers, plannerParams, lockedDays } = get();
        
        if (teamMembers.length !== 5) {
          throw new Error("Il faut exactement 5 personnes pour générer le planning.");
        }

        // Utiliser la nouvelle fonction avec gestion des congés
        const people = teamMembers.map(member => ({
          id: member.id,
          name: member.name,
          leaves: member.leaves
        }));

        const assignments = generateScheduleWithLeaves(
          people,
          plannerParams.startDate,
          plannerParams.numberOfDays,
          plannerParams.skipWeekends,
          lockedDays
        );

        set({ assignments });
        saveScheduleState({ assignments });
      },

      regenerateSchedule: () => {
        const { teamMembers, plannerParams, lockedDays } = get();
        
        if (teamMembers.length !== 5) {
          throw new Error("Il faut exactement 5 personnes pour générer le planning.");
        }

        // Utiliser la nouvelle fonction avec gestion des congés
        const people = teamMembers.map(member => ({
          id: member.id,
          name: member.name,
          leaves: member.leaves
        }));

        const assignments = generateScheduleWithLeaves(
          people,
          plannerParams.startDate,
          plannerParams.numberOfDays,
          plannerParams.skipWeekends,
          lockedDays
        );

        set({ assignments });
        saveScheduleState({ assignments });
      },

      lockDay: (dateISO, assignment) => {
        const { lockedDays } = get();
        const updatedLockedDays = {
          ...lockedDays,
          [dateISO]: { ...assignment, locked: true }
        };
        
        set({ lockedDays: updatedLockedDays });
        saveScheduleState({ lockedDays: updatedLockedDays });
      },

      unlockDay: (dateISO) => {
        const { lockedDays } = get();
        const updatedLockedDays = { ...lockedDays };
        delete updatedLockedDays[dateISO];
        
        set({ lockedDays: updatedLockedDays });
        saveScheduleState({ lockedDays: updatedLockedDays });
      },

      updateAssignment: (dateISO, assignmentUpdate) => {
        const { assignments } = get();
        const updatedAssignments = assignments.map(assignment =>
          assignment.dateISO === dateISO
            ? { ...assignment, ...assignmentUpdate }
            : assignment
        );
        
        set({ assignments: updatedAssignments });
        saveScheduleState({ assignments: updatedAssignments });
      },

      loadFromStorage: () => {
        const stored = loadScheduleState();
        
        // Migration: s'assurer que tous les membres ont le champ leaves
        const migratedMembers = stored.teamMembers?.map(member => ({
          ...member,
          leaves: member.leaves || []
        })) || [];

        set(state => ({ 
          ...state, 
          ...stored,
          teamMembers: migratedMembers,
          // S'assurer que plannerParams a toujours une valeur par défaut
          plannerParams: stored.plannerParams || initialState.plannerParams
        }));
      },

      clearAll: () => {
        set(initialState);
        // Note: clearAllData() sera appelé depuis le composant
      },

      setCurrentStep: (step) => set({ currentStep: step })
    }),
    { name: 'schedule-store' }
  )
);