import { supabase } from '../lib/supabase'
import { Database, ApiResponse } from '../types/database'

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

export class UserService {
  /**
   * Get user by wallet address
   */
  static async getUserByWallet(walletAddress: string): Promise<ApiResponse<User>> {
    try {
      if (!walletAddress) {
        throw new Error('Wallet address is required')
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch user: ${error.message}`)
      }

      return {
        data: user,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching user by wallet:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch user',
        success: false
      }
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<ApiResponse<User>> {
    try {
      if (!email) {
        throw new Error('Email is required')
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch user: ${error.message}`)
      }

      return {
        data: user,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching user by email:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch user',
        success: false
      }
    }
  }

  /**
   * Create or update user profile
   */
  static async upsertUser(userData: UserInsert): Promise<ApiResponse<User>> {
    try {
      if (!userData.email && !userData.wallet_address) {
        throw new Error('Either email or wallet address is required')
      }

      const { data: user, error } = await supabase
        .from('users')
        .upsert(userData, {
          onConflict: userData.email ? 'email' : 'wallet_address'
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to upsert user: ${error.message}`)
      }

      return {
        data: user,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error upserting user:', error)
      return {
        data: null,
        error: error.message || 'Failed to upsert user',
        success: false
      }
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(
    userId: string, 
    updates: UserUpdate
  ): Promise<ApiResponse<User>> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update user: ${error.message}`)
      }

      return {
        data: user,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error updating user:', error)
      return {
        data: null,
        error: error.message || 'Failed to update user',
        success: false
      }
    }
  }

  /**
   * Update user KYC status
   */
  static async updateKYCStatus(
    walletAddress: string, 
    status: 'pending' | 'verified' | 'rejected'
  ): Promise<ApiResponse<User>> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .update({ kyc_status: status })
        .eq('wallet_address', walletAddress)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update KYC status: ${error.message}`)
      }

      return {
        data: user,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error updating KYC status:', error)
      return {
        data: null,
        error: error.message || 'Failed to update KYC status',
        success: false
      }
    }
  }

  /**
   * Get users with KYC status filter
   */
  static async getUsersByKYCStatus(
    status: 'pending' | 'verified' | 'rejected'
  ): Promise<ApiResponse<User[]>> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('kyc_status', status)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch users by KYC status: ${error.message}`)
      }

      return {
        data: users || [],
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching users by KYC status:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch users by KYC status',
        success: false
      }
    }
  }

  /**
   * Link wallet address to existing user
   */
  static async linkWalletToUser(
    email: string, 
    walletAddress: string
  ): Promise<ApiResponse<User>> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .update({ wallet_address: walletAddress })
        .eq('email', email)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to link wallet: ${error.message}`)
      }

      return {
        data: user,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error linking wallet to user:', error)
      return {
        data: null,
        error: error.message || 'Failed to link wallet to user',
        success: false
      }
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<ApiResponse<{
    totalUsers: number
    verifiedUsers: number
    pendingKYC: number
    rejectedKYC: number
  }>> {
    try {
      const { data: stats, error } = await supabase
        .from('users')
        .select('kyc_status')

      if (error) {
        throw new Error(`Failed to fetch user stats: ${error.message}`)
      }

      const userStats = {
        totalUsers: stats?.length || 0,
        verifiedUsers: stats?.filter(u => u.kyc_status === 'verified').length || 0,
        pendingKYC: stats?.filter(u => u.kyc_status === 'pending').length || 0,
        rejectedKYC: stats?.filter(u => u.kyc_status === 'rejected').length || 0
      }

      return {
        data: userStats,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching user stats:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch user stats',
        success: false
      }
    }
  }
}