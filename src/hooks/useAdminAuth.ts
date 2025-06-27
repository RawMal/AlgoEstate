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

        // Admin wallet addresses - Your wallet is now included
        const adminWallets = [
          // Your actual wallet address
          'WX3BSTBIHAEO5FV3VRA22AFXIHCQWNR7U7G3KWERNPMUFCVCXMS4GQAWQ4',
          
          // Additional admin wallets can be added here
          'ADMINWALLETADDRESSEXAMPLEALGORANDTESTNET123456789ABCDEF',
          
          // Any wallet containing 'ADMIN' (for demo wallets)
          ...(activeAddress.includes('ADMIN') ? [activeAddress] : []),
        ]

        // Check if the current wallet is in the admin list
        const isAdminWallet = adminWallets.includes(activeAddress)

        if (!isAdminWallet) {
          setError('Access denied. Admin privileges required.')
          setAdminUser(null)
          setIsLoading(false)
          return
        }

        // Determine admin email and role based on wallet
        let mockEmail = 'admin@algoestate.com'
        let role: 'admin' | 'super_admin' | 'property_manager' = 'super_admin' // Give you super admin access

        // Your wallet gets super admin privileges
        if (activeAddress === 'WX3BSTBIHAEO5FV3VRA22AFXIHCQWNR7U7G3KWERNPMUFCVCXMS4GQAWQ4') {
          mockEmail = 'super@algoestate.com'
          role = 'super_admin'
        } else if (activeAddress.includes('SUPER')) {
          mockEmail = 'super@algoestate.com'
          role = 'super_admin'
        } else if (activeAddress.includes('MANAGER')) {
          mockEmail = 'manager@algoestate.com'
          role = 'property_manager'
        }

        const result = await AdminService.checkAdminPermissions(mockEmail)

        if (result.success && result.data) {
          // Override the role based on wallet address
          const adminUserData = {
            ...result.data,
            role,
            email: mockEmail
          }
          setAdminUser(adminUserData)
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
    return adminUser?.role === 'admin' || adminUser?.role === 'super_admin' || adminUser?.role === 'property_manager' || false
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