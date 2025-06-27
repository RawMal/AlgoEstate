import { useState } from 'react'
import { Activity, TrendingUp, Users, Clock, Eye, EyeOff } from 'lucide-react'
import { usePropertyStateManager } from '../hooks/usePropertyStateManager'
import { PropertyStateMonitor } from './PropertyStateMonitor'

interface PropertyStateWidgetProps {
  propertyId: string
  compact?: boolean
  showMonitorButton?: boolean
}

export function PropertyStateWidget({ 
  propertyId, 
  compact = false, 
  showMonitorButton = true 
}: PropertyStateWidgetProps) {
  const [showMonitor, setShowMonitor] = useState(false)
  
  const {
    isInitialized,
    getPropertyState,
    getPropertyOwnership,
    getEventsByType
  } = usePropertyStateManager({
    autoStart: true,
    propertiesToMonitor: [propertyId]
  })

  const propertyState = getPropertyState(propertyId)
  const ownership = getPropertyOwnership(propertyId)
  const recentEvents = getEventsByType('tokens_transferred', 5)

  if (!isInitialized || !propertyState) {
    return (
      <div className="bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-secondary-200 dark:bg-secondary-600 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-secondary-200 dark:bg-secondary-600 rounded w-1/2"></div>
      </div>
    )
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (compact) {
    return (
      <>
        <div className="bg-white/20 dark:bg-secondary-700/20 backdrop-blur-sm rounded-lg p-3 border border-white/30 dark:border-secondary-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-secondary-900 dark:text-white">
                Live
              </span>
            </div>
            {showMonitorButton && (
              <button
                onClick={() => setShowMonitor(true)}
                className="p-1 hover:bg-secondary-100/50 dark:hover:bg-secondary-600/50 rounded transition-colors"
                title="View detailed monitor"
              >
                <Eye className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="text-center">
              <div className="text-sm font-bold text-primary-600 dark:text-primary-400">
                {propertyState.availableTokens.toLocaleString()}
              </div>
              <div className="text-xs text-secondary-600 dark:text-secondary-400">
                Available
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-accent-600 dark:text-accent-400">
                {propertyState.fundingPercentage.toFixed(0)}%
              </div>
              <div className="text-xs text-secondary-600 dark:text-secondary-400">
                Funded
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-green-600 dark:text-green-400">
                {ownership.length}
              </div>
              <div className="text-xs text-secondary-600 dark:text-secondary-400">
                Owners
              </div>
            </div>
          </div>
        </div>

        {showMonitor && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <PropertyStateMonitor
                propertyId={propertyId}
                onClose={() => setShowMonitor(false)}
              />
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100/50 dark:bg-primary-900/30 backdrop-blur-sm rounded-lg">
              <Activity className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h4 className="font-semibold text-secondary-900 dark:text-white">
                Real-time State
              </h4>
              <div className="flex items-center space-x-2 text-sm text-secondary-600 dark:text-secondary-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live monitoring active</span>
              </div>
            </div>
          </div>
          {showMonitorButton && (
            <button
              onClick={() => setShowMonitor(true)}
              className="inline-flex items-center px-3 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors text-sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Monitor
            </button>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-lg p-3">
            <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
              {propertyState.availableTokens.toLocaleString()}
            </div>
            <div className="text-xs text-secondary-600 dark:text-secondary-400">
              Available Tokens
            </div>
          </div>
          <div className="text-center bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-lg p-3">
            <div className="text-lg font-bold text-accent-600 dark:text-accent-400">
              {propertyState.fundingPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-secondary-600 dark:text-secondary-400">
              Funding Progress
            </div>
          </div>
          <div className="text-center bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-lg p-3">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {ownership.length}
            </div>
            <div className="text-xs text-secondary-600 dark:text-secondary-400">
              Token Holders
            </div>
          </div>
          <div className="text-center bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-lg p-3">
            <div className="text-lg font-bold text-secondary-900 dark:text-white">
              {propertyState.transactionCount}
            </div>
            <div className="text-xs text-secondary-600 dark:text-secondary-400">
              Total Transactions
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h5 className="font-medium text-secondary-900 dark:text-white mb-3">
            Recent Activity
          </h5>
          <div className="space-y-2">
            {recentEvents.slice(0, 3).map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm text-secondary-900 dark:text-white">
                    {event.data.tokenAmount} tokens transferred
                  </span>
                </div>
                <span className="text-xs text-secondary-600 dark:text-secondary-400">
                  {formatDate(event.timestamp)}
                </span>
              </div>
            ))}
            {recentEvents.length === 0 && (
              <div className="text-center py-4 text-secondary-600 dark:text-secondary-400 text-sm">
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-4 pt-4 border-t border-secondary-200/50 dark:border-secondary-700/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400">
              <Clock className="h-4 w-4" />
              <span>Last updated: {formatDate(propertyState.lastUpdated)}</span>
            </div>
            <div className="text-secondary-500 dark:text-secondary-400">
              ASA: {propertyState.asaId}
            </div>
          </div>
        </div>
      </div>

      {/* Full Monitor Modal */}
      {showMonitor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <PropertyStateMonitor
              propertyId={propertyId}
              onClose={() => setShowMonitor(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}