import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TeamMember, Assignment, PlannerParams, ScheduleState, LeaveRange } from '@/lib/types';
import { generateSchedule, generateScheduleWithLeaves, generateInitials } from '@/lib/rotation';
import { saveScheduleState, loadScheduleState } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';

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
  
  // Supabase integration
  initializeFromSupabase: () => Promise<void>;
  loadLatestScheduleForAdmin: () => Promise<boolean>;
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

      addTeamMember: async (name) => {
        const { teamMembers } = get();
        console.log('➕ Adding member:', name, 'Current count:', teamMembers.length);
        
        if (teamMembers.length >= 5) {
          console.log('❌ Team is full, cannot add more members');
          return;
        }
        
        const newMember: TeamMember = {
          id: crypto.randomUUID(),
          name: name.trim(),
          initials: generateInitials(name.trim()),
          leaves: []
        };
        
        console.log('💾 Saving to Supabase:', newMember);
        
        try {
          // Sauvegarder dans Supabase
          const { error } = await supabase.from('members').insert([{
            id: newMember.id,
            name: newMember.name,
            user_id: (await supabase.auth.getUser()).data.user?.id
          }]);
          
          if (error) {
            console.error('❌ Error saving to Supabase:', error);
            return;
          }
          
          console.log('✅ Successfully saved to Supabase');
        } catch (err) {
          console.error('❌ Exception saving to Supabase:', err);
          return;
        }
        
        const updatedMembers = [...teamMembers, newMember];
        console.log('📊 Updated members count:', updatedMembers.length);
        
        set({ teamMembers: updatedMembers });
        saveScheduleState({ teamMembers: updatedMembers });
      },

      removeTeamMember: async (id) => {
        const { teamMembers } = get();
        
        // Supprimer de Supabase
        await supabase.from('members').delete().eq('id', id);
        
        const updatedMembers = teamMembers.filter(member => member.id !== id);
        set({ teamMembers: updatedMembers });
        saveScheduleState({ teamMembers: updatedMembers });
      },

      updateTeamMember: async (id, name) => {
        const { teamMembers } = get();
        
        // Mettre à jour dans Supabase
        await supabase.from('members').update({ name: name.trim() }).eq('id', id);
        
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
        
        console.log('🎯 Generate schedule - team members count:', teamMembers.length);
        console.log('👥 Team members:', teamMembers);
        
        if (teamMembers.length !== 5) {
          console.error('❌ Cannot generate schedule: need exactly 5 members, got', teamMembers.length);
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

      setCurrentStep: (step) => set({ currentStep: step }),

      // Supabase integration methods
      initializeFromSupabase: async () => {
        try {
          console.log('🔄 Initializing from Supabase...');
          const { data: members, error } = await supabase
            .from('members')
            .select('*')
            .order('created_at', { ascending: true });

          if (error) {
            console.error('❌ Error loading members:', error);
            return;
          }

          console.log('📦 Raw members data from Supabase:', members);

          const teamMembers: TeamMember[] = members?.map(member => ({
            id: member.id,
            name: member.name,
            initials: generateInitials(member.name),
            leaves: []
          })) || [];

          console.log('👥 Processed team members:', teamMembers);
          console.log('📊 Team members count:', teamMembers.length);

          set({ teamMembers });
          console.log('✅ Successfully loaded', teamMembers.length, 'members from Supabase');
        } catch (error) {
          console.error('❌ Error initializing from Supabase:', error);
        }
      },

      loadLatestScheduleForAdmin: async () => {
        try {
          console.log('🔄 Loading latest schedule for admin...');
          
          // Récupérer le dernier planning généré
          const { data: latestRotations, error } = await supabase
            .from('rotations')
            .select('*')
            .order('generated_at', { ascending: false })
            .limit(50); // Prendre plus de rotations pour s'assurer d'avoir une période complète
          
          if (error) {
            console.error('❌ Error loading latest rotations:', error);
            return false;
          }

          if (!latestRotations || latestRotations.length === 0) {
            console.log('📭 No rotations found');
            return false;
          }

          // Grouper par generated_at et prendre le groupe le plus récent
          const latestGeneratedAt = latestRotations[0].generated_at;
          const latestGroup = latestRotations.filter(r => r.generated_at === latestGeneratedAt);

          console.log('📅 Latest planning group:', latestGroup.length, 'days');

          // Transformer en format d'assignments
          const assignments = latestGroup
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(rotation => ({
              dateISO: rotation.date,
              eighteen: rotation.eighteen || [],
              sixteen: rotation.sixteen || [],
              absents: rotation.absents || [],
              missing: rotation.missing || 0
            }));

          // Mettre à jour le store
          set({ 
            assignments,
            currentStep: 2 // Aller directement à la vue liste/calendrier
          });

          console.log('✅ Latest schedule loaded successfully:', assignments.length, 'days');
          return true;
        } catch (error) {
          console.error('❌ Error loading latest schedule:', error);
          return false;
        }
      }
    }),
    { name: 'schedule-store' }
  )
);