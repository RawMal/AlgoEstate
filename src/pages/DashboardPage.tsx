import { UserDashboard } from '../components/UserDashboard'

export function DashboardPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-secondary-900 dark:text-white mb-4">
            Dashboard
          </h1>
          <p className="text-lg text-secondary-600 dark:text-secondary-300">
            Monitor your real estate investments and portfolio performance
          </p>
        </div>
        
        <UserDashboard />
      </div>
    </div>
  )
}