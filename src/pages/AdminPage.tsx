import { useState } from 'react'
import { Plus, Building2, Users, DollarSign, TrendingUp } from 'lucide-react'

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview')

  const stats = [
    { label: 'Total Properties', value: '24', icon: Building2, change: '+3 this month' },
    { label: 'Active Investors', value: '1,247', icon: Users, change: '+89 this week' },
    { label: 'Total Value Locked', value: '$12.4M', icon: DollarSign, change: '+15% this month' },
    { label: 'Average Yield', value: '8.2%', icon: TrendingUp, change: '+0.3% this quarter' },
  ]

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'properties', label: 'Properties' },
    { id: 'users', label: 'Users' },
    { id: 'transactions', label: 'Transactions' },
  ]

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-secondary-900 dark:text-white mb-4">
              Admin Dashboard
            </h1>
            <p className="text-lg text-secondary-600 dark:text-secondary-300">
              Manage your tokenized real estate platform
            </p>
          </div>
          <button className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors">
            <Plus className="h-5 w-5 mr-2" />
            Add Property
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-secondary-800 rounded-2xl shadow-lg p-6 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                  <stat.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-sm text-accent-600 dark:text-accent-400 font-medium">
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
                {stat.value}
              </div>
              <div className="text-secondary-600 dark:text-secondary-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-lg">
          <div className="border-b border-secondary-200 dark:border-secondary-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-secondary-50 dark:bg-secondary-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                      Recent Activity
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-600 dark:text-secondary-400">New property listed</span>
                        <span className="text-sm text-secondary-500">2 hours ago</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-600 dark:text-secondary-400">User KYC approved</span>
                        <span className="text-sm text-secondary-500">4 hours ago</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-600 dark:text-secondary-400">Investment completed</span>
                        <span className="text-sm text-secondary-500">6 hours ago</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-secondary-50 dark:bg-secondary-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                      Pending Actions
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-600 dark:text-secondary-400">KYC reviews pending</span>
                        <span className="bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 px-2 py-1 rounded-full text-sm font-medium">
                          12
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-600 dark:text-secondary-400">Property approvals</span>
                        <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-1 rounded-full text-sm font-medium">
                          3
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  Property Management
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  Property management interface coming soon
                </p>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  User Management
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  User management interface coming soon
                </p>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  Transaction History
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  Transaction management interface coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}