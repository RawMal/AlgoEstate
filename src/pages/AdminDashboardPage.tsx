import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Settings,
  BarChart3,
  Shield,
  FileText,
  Activity,
  Eye,
  Coins
} from 'lucide-react'
import { AdminProtectedRoute } from '../components/admin/AdminProtectedRoute'
import { PropertyUploadForm } from '../components/admin/PropertyUploadForm'
import { TokenizationPanel } from '../components/admin/TokenizationPanel'
import { PropertyDistributionView } from '../components/admin/PropertyDistributionView'
import { KYCReviewInterface } from '../components/admin/KYCReviewInterface'
import { AdminService } from '../services/adminService'
import { useAdminAuth } from '../hooks/useAdminAuth'

export function AdminDashboardPage() {
  return (
    <AdminProtectedRoute>
      <AdminDashboardContent />
    </AdminProtectedRoute>
  )
}

function AdminDashboardContent() {
  const { adminUser } = useAdminAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'kyc' | 'analytics'>('overview')
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<any>(null)

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => AdminService.getDashboardStats(),
    select: (result) => result.success ? result.data : null,
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Fetch all properties
  const { data: properties, isLoading: propertiesLoading, refetch: refetchProperties } = useQuery({
    queryKey: ['admin-properties'],
    queryFn: () => AdminService.getAllProperties(),
    select: (result) => result.success ? result.data : []
  })

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'kyc', label: 'KYC Review', icon: Shield },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ]

  const handlePropertyCreated = (propertyId: string) => {
    setShowPropertyForm(false)
    refetchProperties()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

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
              Welcome back, {adminUser?.email}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-2 bg-primary-100/50 dark:bg-primary-900/30 rounded-lg">
              <Shield className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300 capitalize">
                {adminUser?.role?.replace('_', ' ')}
              </span>
            </div>
            <button
              onClick={() => setShowPropertyForm(true)}
              className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Property
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-100/50 dark:bg-primary-900/30 rounded-xl">
                  <Building2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-sm text-accent-600 dark:text-accent-400 font-medium">
                  {stats.properties.active} active
                </span>
              </div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
                {stats.properties.total}
              </div>
              <div className="text-secondary-600 dark:text-secondary-400">
                Total Properties
              </div>
            </div>

            <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100/50 dark:bg-green-900/30 rounded-xl">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {stats.users.verified} verified
                </span>
              </div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
                {stats.users.total}
              </div>
              <div className="text-secondary-600 dark:text-secondary-400">
                Total Users
              </div>
            </div>

            <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-xl">
                  <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {stats.transactions.last24h} today
                </span>
              </div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
                {stats.transactions.total}
              </div>
              <div className="text-secondary-600 dark:text-secondary-400">
                Transactions
              </div>
            </div>

            <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-100/50 dark:bg-amber-900/30 rounded-xl">
                  <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  {stats.kyc.pending} pending
                </span>
              </div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
                {stats.kyc.approved + stats.kyc.pending + stats.kyc.rejected}
              </div>
              <div className="text-secondary-600 dark:text-secondary-400">
                KYC Applications
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-secondary-700/30">
          <div className="border-b border-secondary-200/50 dark:border-secondary-700/50">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setShowPropertyForm(true)}
                    className="p-6 bg-primary-50/80 dark:bg-primary-900/20 hover:bg-primary-100/80 dark:hover:bg-primary-900/30 rounded-xl transition-colors text-left"
                  >
                    <Plus className="h-8 w-8 text-primary-600 dark:text-primary-400 mb-3" />
                    <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">
                      Add New Property
                    </h3>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      Create and tokenize a new real estate property
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab('kyc')}
                    className="p-6 bg-amber-50/80 dark:bg-amber-900/20 hover:bg-amber-100/80 dark:hover:bg-amber-900/30 rounded-xl transition-colors text-left"
                  >
                    <Shield className="h-8 w-8 text-amber-600 dark:text-amber-400 mb-3" />
                    <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">
                      Review KYC Applications
                    </h3>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {stats?.kyc.pending || 0} applications pending review
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="p-6 bg-green-50/80 dark:bg-green-900/20 hover:bg-green-100/80 dark:hover:bg-green-900/30 rounded-xl transition-colors text-left"
                  >
                    <BarChart3 className="h-8 w-8 text-green-600 dark:text-green-400 mb-3" />
                    <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">
                      View Analytics
                    </h3>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      Platform performance and insights
                    </p>
                  </button>
                </div>

                {/* Recent Activity */}
                <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Activity className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        <span className="text-secondary-600 dark:text-secondary-400">New property added</span>
                      </div>
                      <span className="text-sm text-secondary-500">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-secondary-600 dark:text-secondary-400">KYC application approved</span>
                      </div>
                      <span className="text-sm text-secondary-500">4 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Coins className="h-5 w-5 text-accent-600 dark:text-accent-400" />
                        <span className="text-secondary-600 dark:text-secondary-400">Property tokenization completed</span>
                      </div>
                      <span className="text-sm text-secondary-500">6 hours ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Properties Tab */}
            {activeTab === 'properties' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                    Property Management
                  </h3>
                  <button
                    onClick={() => setShowPropertyForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </button>
                </div>

                {propertiesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-secondary-600 dark:text-secondary-400">Loading properties...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {properties?.map((property: any) => (
                      <div
                        key={property.id}
                        className="border border-secondary-200/50 dark:border-secondary-700/50 rounded-xl p-6"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-semibold text-secondary-900 dark:text-white">
                                {property.name}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                property.asa_id 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                              }`}>
                                {property.asa_id ? 'Tokenized' : 'Not Tokenized'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-secondary-600 dark:text-secondary-400">Total Value:</span>
                                <span className="ml-2 font-medium text-secondary-900 dark:text-white">
                                  {formatCurrency(property.total_value)}
                                </span>
                              </div>
                              <div>
                                <span className="text-secondary-600 dark:text-secondary-400">Token Price:</span>
                                <span className="ml-2 font-medium text-secondary-900 dark:text-white">
                                  ${property.token_price}
                                </span>
                              </div>
                              <div>
                                <span className="text-secondary-600 dark:text-secondary-400">Funding:</span>
                                <span className="ml-2 font-medium text-secondary-900 dark:text-white">
                                  {property.fundingPercentage?.toFixed(1) || 0}%
                                </span>
                              </div>
                              <div>
                                <span className="text-secondary-600 dark:text-secondary-400">Investors:</span>
                                <span className="ml-2 font-medium text-secondary-900 dark:text-white">
                                  {property.totalInvestors || 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedProperty(property)}
                              className="inline-flex items-center px-3 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors text-sm"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* KYC Tab */}
            {activeTab === 'kyc' && (
              <KYCReviewInterface onStatusUpdate={() => {
                // Refresh stats when KYC status is updated
                // This would trigger a refetch of the dashboard stats
              }} />
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  Analytics Dashboard
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  Advanced analytics and reporting features coming soon
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Property Upload Form Modal */}
        {showPropertyForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <PropertyUploadForm
                onSuccess={handlePropertyCreated}
                onCancel={() => setShowPropertyForm(false)}
              />
            </div>
          </div>
        )}

        {/* Property Details Modal */}
        {selectedProperty && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto space-y-6">
              {/* Tokenization Panel */}
              <TokenizationPanel
                property={selectedProperty}
                onStatusUpdate={(status) => {
                  console.log('Tokenization status updated:', status)
                  refetchProperties()
                }}
              />
              
              {/* Distribution View */}
              {selectedProperty.asa_id && (
                <PropertyDistributionView
                  propertyId={selectedProperty.id}
                  propertyName={selectedProperty.name}
                />
              )}
              
              {/* Close Button */}
              <div className="text-center">
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="px-6 py-3 bg-secondary-600 hover:bg-secondary-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}