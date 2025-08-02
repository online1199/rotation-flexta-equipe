import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Person, LeaveRange } from '@/lib/types';

interface SupabaseStore {
  // Members
  members: Person[];
  loadMembers: () => Promise<void>;
  addMember: (name: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  updateMember: (id: string, name: string) => Promise<void>;
  
  // Leaves
  addLeave: (memberId: string, leave: LeaveRange) => Promise<void>;
  removeLeave: (memberId: string, leaveIndex: number) => Promise<void>;
  
  // Locked days
  saveLockedDay: (dateISO: string, assignment: any) => Promise<void>;
  loadLockedDays: () => Promise<Record<string, any>>;
  
  // Loading states
  loading: boolean;
  error: string | null;
}

export const useSupabaseStore = create<SupabaseStore>((set, get) => ({
  members: [],
  loading: false,
  error: null,

  loadMembers: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (error) throw error;

      // Get leaves for each member
      const membersWithLeaves = await Promise.all(
        (members || []).map(async (member) => {
          const { data: leaves } = await supabase
            .from('leaves')
            .select('*')
            .eq('member_id', member.id)
            .order('start_date');

          return {
            id: member.id,
            name: member.name,
            leaves: (leaves || []).map(leave => ({
              start: leave.start_date,
              end: leave.end_date
            }))
          };
        })
      );

      set({ members: membersWithLeaves, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addMember: async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('members')
        .insert({
          user_id: user.id,
          name
        })
        .select()
        .single();

      if (error) throw error;

      const newMember: Person = {
        id: data.id,
        name: data.name,
        leaves: []
      };

      set(state => ({
        members: [...state.members, newMember]
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  removeMember: async (id: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        members: state.members.filter(m => m.id !== id)
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  updateMember: async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ name })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        members: state.members.map(m => 
          m.id === id ? { ...m, name } : m
        )
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addLeave: async (memberId: string, leave: LeaveRange) => {
    try {
      const { error } = await supabase
        .from('leaves')
        .insert({
          member_id: memberId,
          start_date: leave.start,
          end_date: leave.end
        });

      if (error) throw error;

      set(state => ({
        members: state.members.map(m => 
          m.id === memberId 
            ? { ...m, leaves: [...m.leaves, leave] }
            : m
        )
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  removeLeave: async (memberId: string, leaveIndex: number) => {
    try {
      const member = get().members.find(m => m.id === memberId);
      if (!member) return;

      const leave = member.leaves[leaveIndex];
      if (!leave) return;

      const { error } = await supabase
        .from('leaves')
        .delete()
        .eq('member_id', memberId)
        .eq('start_date', leave.start)
        .eq('end_date', leave.end);

      if (error) throw error;

      set(state => ({
        members: state.members.map(m => 
          m.id === memberId 
            ? { 
                ...m, 
                leaves: m.leaves.filter((_, index) => index !== leaveIndex)
              }
            : m
        )
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  saveLockedDay: async (dateISO: string, assignment: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { error } = await supabase
        .from('locked_days')
        .upsert({
          user_id: user.id,
          date_iso: dateISO,
          eighteen: assignment.eighteen,
          sixteen: assignment.sixteen,
          absents: assignment.absents,
          missing: assignment.missing
        });

      if (error) throw error;
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  loadLockedDays: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('locked_days')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const lockedDays: Record<string, any> = {};
      (data || []).forEach(day => {
        lockedDays[day.date_iso] = {
          dateISO: day.date_iso,
          eighteen: day.eighteen,
          sixteen: day.sixteen,
          absents: day.absents,
          missing: day.missing,
          locked: true
        };
      });

      return lockedDays;
    } catch (error: any) {
      set({ error: error.message });
      return {};
    }
  }
}));