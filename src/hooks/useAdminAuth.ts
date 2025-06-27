import { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { AdminService } from '../services/adminService'
import { AdminUser } from '../types/admin'

export const useAdminAuth = () => {
  const { activeAddress } = useWallet()
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!activeAddress) {
        setAdminUser(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // For demo purposes, we'll use a mock email based on wallet address
        // In production, this would be linked to actual user accounts
        const mockEmail = activeAddress.includes('ADMIN') 
          ? 'admin@algoestate.com' 
          : 'user@example.com'

        const result = await AdminService.checkAdminPermissions(mockEmail)

        if (result.success && result.data) {
          setAdminUser(result.data)
        } else {
          setError(result.error || 'Access denied')
          setAdminUser(null)
        }
      } catch (error: any) {
        setError(error.message || 'Failed to check admin access')
        setAdminUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAccess()
  }, [activeAddress])

  const hasPermission = (resource: string, action: string): boolean => {
    if (!adminUser) return false

    const permission = adminUser.permissions.find(p => p.resource === resource)
    return permission?.actions.includes(action as any) || false
  }

  const isAdmin = (): boolean => {
    return adminUser?.role === 'admin' || adminUser?.role === 'super_admin' || false
  }

  const isSuperAdmin = (): boolean => {
    return adminUser?.role === 'super_admin' || false
  }

  return {
    adminUser,
    isLoading,
    error,
    isAdmin: isAdmin(),
    isSuperAdmin: isSuperAdmin(),
    hasPermission
  }
}