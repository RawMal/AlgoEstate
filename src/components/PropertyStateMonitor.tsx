import { useState, useEffect } from 'react'
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Clock, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Zap,
  BarChart3,
  Eye,
  X
} from 'lucide-react'
import { usePropertyStateManager } from '../hooks/usePropertyStateManager'
import { PropertyStateEvent } from '../types/propertyState'

interface PropertyStateMonitorProps {
  propertyId: string
  onClose?: () => void
  showTransactions?: boolean
  showOwnership?: boolean
  autoRefresh?: boolean
}

export function PropertyStateMonitor({ 
  propertyId, 
  onClose, 
  showTransactions = true, 
  showOwnership = true,
  autoRefresh = true 
}: PropertyStateMonitorProps) {
  const {
    isInitialized,
    isLoading,
    error,
    events,
    getPropertyState,
    getPropertyOwnership,
    getOwnershipSummary,
    getPropertyTransactions,
    syncProperty,
    addProperty,
    getEventsByType
  } = usePropertyStateManager({
    autoStart: true,
    propertiesToMonitor: [propertyId]
  })

  const [activeTab, setActiveTab] = useState<'overview' | 'ownership' | 'transactions' | 'events'>('overview')
  const [isSyncing, setIsSyncing] = useState(false)

  const propertyState = getPropertyState(propertyId)
  const ownership = getPropertyOwnership(propertyId)
  const ownershipSummary = getOwnershipSummary(propertyId)
  const transactions = getPropertyTransactions(propertyId, 20)
  const recentEvents = getEventsByType('tokens_transferred', 10)

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !isInitialized) return

    const interval = setInterval(async () => {
      try {
        await syncProperty(propertyId)
      } catch (error) {
        console.error('Auto-refresh failed:', error)
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, isInitialized, propertyId, syncProperty])

  // Add property to monitoring if not already added
  useEffect(() => {
    if (isInitialized && !propertyState) {
      addProperty(propertyId).catch(console.error)
    }
  }, [isInitialized, propertyState, propertyId, addProperty])

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      await syncProperty(propertyId)
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-secondary-600 dark:text-secondary-400">
          Initializing property state monitor...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
        <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!propertyState) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
        <Activity className="h-8 w-8 text-secondary-400 mx-auto mb-4" />
        <p className="text-secondary-600 dark:text-secondary-400">
          Property not found or not tokenized
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-secondary-700/30">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100/50 dark:bg-primary-900/30 backdrop-blur-sm rounded-lg">
            <Activity className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Property State Monitor
            </h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              Real-time blockchain monitoring
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 backdrop-blur-sm rounded-lg transition-colors disabled:opacity-50"
            title="Sync now"
          >
            <RefreshCw className={`h-4 w-4 text-secondary-600 dark:text-secondary-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 backdrop-blur-sm rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200/50 dark:border-secondary-700/50">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'ownership', label: 'Ownership', icon: Users },
            { id: 'transactions', label: 'Transactions', icon: Activity },
            { id: 'events', label: 'Events', icon: Zap }
          ].map((tab) => (
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

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {propertyState.availableTokens.toLocaleString()}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Available Tokens
                </div>
              </div>
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-accent-600 dark:text-accent-400">
                  {propertyState.fundingPercentage.toFixed(1)}%
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Funded
                </div>
              </div>
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {ownership.length}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Investors
                </div>
              </div>
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {propertyState.transactionCount}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Transactions
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <div className="font-medium text-secondary-900 dark:text-white">
                      Real-time Monitoring Active
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      Last updated: {formatDate(propertyState.lastUpdated)}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  ASA ID: {propertyState.asaId}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">
                Recent Activity
              </h4>
              <div className="space-y-2">
                {recentEvents.slice(0, 5).map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Activity className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      <div>
                        <div className="text-sm font-medium text-secondary-900 dark:text-white">
                          Token Transfer
                        </div>
                        <div className="text-xs text-secondary-600 dark:text-secondary-400">
                          {event.data.tokenAmount} tokens
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-secondary-500 dark:text-secondary-400">
                      {formatDate(event.timestamp)}
                    </div>
                  </div>
                ))}
                {recentEvents.length === 0 && (
                  <div className="text-center py-4 text-secondary-600 dark:text-secondary-400">
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ownership' && ownershipSummary && (
          <div className="space-y-6">
            {/* Ownership Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-xl font-bold text-secondary-900 dark:text-white">
                  {ownershipSummary.distributionStats.averageOwnership.toFixed(2)}%
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Average Ownership
                </div>
              </div>
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-xl font-bold text-secondary-900 dark:text-white">
                  {ownershipSummary.distributionStats.medianOwnership.toFixed(2)}%
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Median Ownership
                </div>
              </div>
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-xl font-bold text-secondary-900 dark:text-white">
                  {ownershipSummary.distributionStats.concentrationRatio.toFixed(1)}%
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Top 10% Concentration
                </div>
              </div>
            </div>

            {/* Top Owners */}
            <div>
              <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">
                Top Token Holders
              </h4>
              <div className="space-y-2">
                {ownershipSummary.topOwners.slice(0, 10).map((owner, index) => (
                  <div
                    key={owner.walletAddress}
                    className="flex items-center justify-between p-3 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-xs font-medium text-primary-600 dark:text-primary-400">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-mono text-sm text-secondary-900 dark:text-white">
                          {owner.walletAddress.slice(0, 8)}...{owner.walletAddress.slice(-8)}
                        </div>
                        <div className="text-xs text-secondary-600 dark:text-secondary-400">
                          {owner.tokenAmount.toLocaleString()} tokens
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-secondary-900 dark:text-white">
                        {owner.ownershipPercentage.toFixed(2)}%
                      </div>
                      <div className="text-xs text-secondary-600 dark:text-secondary-400">
                        {formatCurrency(owner.tokenAmount * propertyState.tokenPrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-secondary-900 dark:text-white">
              Recent Transactions
            </h4>
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.txId}
                  className="flex items-center justify-between p-3 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      tx.type === 'purchase' ? 'bg-green-100 dark:bg-green-900/30' :
                      tx.type === 'transfer' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      'bg-gray-100 dark:bg-gray-900/30'
                    }`}>
                      <Activity className={`h-4 w-4 ${
                        tx.type === 'purchase' ? 'text-green-600 dark:text-green-400' :
                        tx.type === 'transfer' ? 'text-blue-600 dark:text-blue-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <div className="font-medium text-secondary-900 dark:text-white capitalize">
                        {tx.type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">
                        {tx.tokenAmount} tokens • Block {tx.blockNumber}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-secondary-900 dark:text-white">
                      {formatDate(tx.timestamp)}
                    </div>
                    <div className="text-xs text-secondary-600 dark:text-secondary-400 font-mono">
                      {tx.txId.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-8 text-secondary-600 dark:text-secondary-400">
                  No transactions found
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-secondary-900 dark:text-white">
              System Events
            </h4>
            <div className="space-y-2">
              {events.slice(-20).reverse().map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Zap className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    <div>
                      <div className="font-medium text-secondary-900 dark:text-white">
                        {event.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">
                        Property: {event.propertyId.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-secondary-500 dark:text-secondary-400">
                    {formatDate(event.timestamp)}
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center py-8 text-secondary-600 dark:text-secondary-400">
                  No events recorded
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}