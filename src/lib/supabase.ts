import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  if (error?.message) {
    // Handle common Supabase errors
    if (error.message.includes('duplicate key')) {
      return 'This record already exists'
    }
    if (error.message.includes('foreign key')) {
      return 'Referenced record not found'
    }
    if (error.message.includes('check constraint')) {
      return 'Invalid data provided'
    }
    if (error.message.includes('not found')) {
      return 'Record not found'
    }
    if (error.message.includes('permission denied')) {
      return 'You do not have permission to perform this action'
    }
    
    return error.message
  }
  
  return 'An unexpected error occurred'
}

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper function to sign out (Supabase only)
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Complete logout function that also disconnects wallet
// Note: This should be used from components that have access to wallet context
export const createLogoutHandler = (disconnectWallet?: () => Promise<void>) => {
  return async () => {
    try {
      // Disconnect wallet first if available
      if (disconnectWallet) {
        await disconnectWallet()
      }
      // Then sign out from Supabase
      await signOut()
    } catch (error) {
      console.error('Error during logout:', error)
      // Still attempt to sign out from Supabase even if wallet disconnection fails
      await signOut()
    }
  }
}

export type { Database }