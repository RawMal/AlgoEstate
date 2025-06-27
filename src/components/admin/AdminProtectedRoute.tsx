import { ReactNode } from 'react'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { Shield, Lock, Loader2 } from 'lucide-react'

interface AdminProtectedRouteProps {
  children: ReactNode
  requiredPermission?: {
    resource: string
    action: string
  }
  fallback?: ReactNode
}

export function AdminProtectedRoute({ 
  children, 
  requiredPermission, 
  fallback 
}: AdminProtectedRouteProps) {
  const { adminUser, isLoading, error, isAdmin, hasPermission } = useAdminAuth()

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50 dark:from-secondary-950 dark:via-secondary-900 dark:to-secondary-800">
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-secondary-600 dark:text-secondary-400">
            Verifying admin access...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50 dark:from-secondary-950 dark:via-secondary-900 dark:to-secondary-800">
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30 max-w-md">
          <Lock className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">
            Access Denied
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 mb-6">
            {error}
          </p>
          <div className="bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Admin Access Required</p>
                <p>
                  This area is restricted to authorized administrators only. 
                  Please contact your system administrator if you believe you should have access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Not admin
  if (!isAdmin) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50 dark:from-secondary-950 dark:via-secondary-900 dark:to-secondary-800">
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30 max-w-md">
          <Lock className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">
            Admin Access Required
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 mb-6">
            You need administrator privileges to access this area.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Check specific permission if required
  if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50 dark:from-secondary-950 dark:via-secondary-900 dark:to-secondary-800">
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30 max-w-md">
          <Shield className="h-16 w-16 text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">
            Insufficient Permissions
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 mb-6">
            You don't have permission to {requiredPermission.action} {requiredPermission.resource}.
          </p>
          <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 mb-6">
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              <strong>Your Role:</strong> {adminUser?.role}
            </div>
            <div className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
              <strong>Required:</strong> {requiredPermission.action} access to {requiredPermission.resource}
            </div>
          </div>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // All checks passed, render children
  return <>{children}</>
}