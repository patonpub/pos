'use client'

import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { supabase, UserProfile } from '@/lib/supabase'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isOwner: boolean
  isEmployee: boolean
  initialized: boolean
}

interface AuthActions {
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
  setLoading: (loading: boolean) => void
  // Legacy support
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  user: null,
  profile: null,
  loading: true,
  isOwner: false,
  isEmployee: false,
  initialized: false,

  // Actions
  initialize: async () => {
    const state = get()
    if (state.initialized) return // Prevent double initialization
    
    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Try to get cached profile first
        const cachedProfile = localStorage.getItem(`profile_${session.user.id}`)
        if (cachedProfile) {
          const profile = JSON.parse(cachedProfile)
          set({
            user: session.user,
            profile,
            isOwner: profile.role === 'owner',
            isEmployee: profile.role === 'employee',
            loading: false,
            initialized: true
          })
          // Fetch fresh profile in background
          get().fetchProfile(session.user.id)
        } else {
          set({ user: session.user, initialized: true })
          await get().fetchProfile(session.user.id)
        }
      } else {
        set({ user: null, loading: false, initialized: true })
      }

      // Listen for auth changes (only set up once)
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const currentState = get()
          if (!currentState.profile || currentState.user?.id !== session.user.id) {
            set({ user: session.user })
            await get().fetchProfile(session.user.id)
          }
        } else {
          // Clear cached profile on logout
          const currentState = get()
          if (currentState.user?.id) {
            localStorage.removeItem(`profile_${currentState.user.id}`)
          }
          set({
            user: null,
            profile: null,
            loading: false,
            isOwner: false,
            isEmployee: false
          })
        }
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ loading: false, initialized: true })
    }
  },

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      
      // Cache profile in localStorage
      localStorage.setItem(`profile_${userId}`, JSON.stringify(data))
      
      set({
        profile: data,
        isOwner: data.role === 'owner',
        isEmployee: data.role === 'employee',
        loading: false
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      set({ loading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('SignOut error:', error)
      }
      console.log('Successfully signed out')
    } catch (error) {
      console.error('SignOut error:', error)
    } finally {
      set({
        user: null,
        profile: null,
        loading: false,
        isOwner: false,
        isEmployee: false
      })
    }
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  // Legacy support
  login: async (email: string, password: string): Promise<boolean> => {
    try {
      await get().signIn(email, password)
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  },

  logout: async () => {
    await get().signOut()
  },
}))

// Note: Initialization happens in AuthProvider to avoid double init