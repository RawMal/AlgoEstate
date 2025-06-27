import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Coins,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react'
import { usePropertyTokenization } from '../../hooks/usePropertyTokenization'
import { TokenizationModal } from '../TokenizationModal'
import { TokenizationStatus } from '../../types/admin'
import { PropertyDetails } from '../../types/tokenization'

interface TokenizationPanelProps {
  property: any
  onStatusUpdate?: (status: TokenizationStatus) => void
}

export function TokenizationPanel({ property, onStatusUpdate }: TokenizationPanelProps) {
  const queryClient = useQueryClient()
  const [showTokenizationModal, setShowTokenizationModal] = useState(false)
  const [tokenizationStatus, setTokenizationStatus] = useState<TokenizationStatus>({
    status: property.asa_id ? 'completed' : 'not_started',
    asaId: property.asa_id,
    progress: property.asa_id ? 100 : 0,
    steps: [
      {
        step: 'Prepare Asset Configuration',
        status: property.asa_id ? 'completed' : 'pending'
      },
      {
        step: 'Deploy ASA to Blockchain',
        status: property.asa_id ? 'completed' : 'pending'
      },
      {
        step: 'Update Database Records',
        status: property.asa_id ? 'completed' : 'pending'
      },
      {
        step: 'Verify Deployment',
        status: property.asa_id ? 'completed' : 'pending'
      }
    ]
  })

  const { tokenizeProperty, tokenizationStatus: hookStatus } = usePropertyTokenization()

  const handleTokenize = () => {
    const propertyDetails: PropertyDetails = {
      id: property.id,
      name: property.name,
      description: `Tokenized real estate property: ${property.name}`,
      location: property.address?.city || 'Unknown',
      totalValue: Number(property.total_value),
      tokenPrice: Number(property.token_price),
      totalTokens: property.total_tokens,
      propertyType: property.address?.property_type || 'residential',
      expectedYield: 8.0
    }

    setShowTokenizationModal(true)
  }

  const handleTokenizationSuccess = (asaId: number, txId: string) => {
    const newStatus: TokenizationStatus = {
      status: 'completed',
      asaId,
      txId,
      progress: 100,
      steps: tokenizationStatus.steps.map(step => ({
        ...step,
        status: 'completed',
        timestamp: new Date().toISOString()
      }))
    }

    setTokenizationStatus(newStatus)
    onStatusUpdate?.(newStatus)
    setShowTokenizationModal(false)

    // Refresh property data
    queryClient.invalidateQueries({ queryKey: ['admin-properties'] })
    queryClient.invalidateQueries({ queryKey: ['property', property.id] })
  }

  const copyAsaId = () => {
    if (property.asa_id) {
      navigator.clipboard.writeText(property.asa_id.toString())
    }
  }

  const getStatusColor = (status: TokenizationStatus['status']) => {
    switch (status) {
      case 'not_started':
        return 'text-secondary-600 dark:text-secondary-400'
      case 'preparing':
      case 'deploying':
        return 'text-amber-600 dark:text-amber-400'
      case 'completed':
        return 'text-green-600 dark:text-green-400'
      case 'failed':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-secondary-600 dark:text-secondary-400'
    }
  }

  const getStatusIcon = (status: TokenizationStatus['status']) => {
    switch (status) {
      case 'not_started':
        return <Play className="h-5 w-5" />
      case 'preparing':
      case 'deploying':
        return <Loader2 className="h-5 w-5 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-5 w-5" />
      case 'failed':
        return <AlertCircle className="h-5 w-5" />
      default:
        return <Coins className="h-5 w-5" />
    }
  }

  return (
    <>
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100/50 dark:bg-primary-900/30 backdrop-blur-sm rounded-lg">
              <Coins className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Tokenization Control
              </h3>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Deploy and manage property ASA
              </p>
            </div>
          </div>
          <div className={`flex items-center space-x-2 ${getStatusColor(tokenizationStatus.status)}`}>
            {getStatusIcon(tokenizationStatus.status)}
            <span className="font-medium capitalize">
              {tokenizationStatus.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {property.total_tokens.toLocaleString()}
            </div>
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              Total Tokens
            </div>
          </div>
          <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-accent-600 dark:text-accent-400">
              ${property.token_price}
            </div>
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              Token Price
            </div>
          </div>
          <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${(property.total_tokens * property.token_price).toLocaleString()}
            </div>
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              Total Raise
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-secondary-600 dark:text-secondary-400">Deployment Progress</span>
            <span className="text-secondary-900 dark:text-white font-medium">
              {tokenizationStatus.progress}%
            </span>
          </div>
          <div className="w-full bg-secondary-200/50 dark:bg-secondary-700/50 backdrop-blur-sm rounded-full h-3">
            <div
              className="bg-gradient-to-r from-primary-500 to-accent-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${tokenizationStatus.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Deployment Steps */}
        <div className="space-y-3 mb-6">
          {tokenizationStatus.steps.map((step, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                  step.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900/30' :
                  step.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' :
                  'bg-secondary-200 dark:bg-secondary-600'
                }`}>
                  {step.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                  {step.status === 'in_progress' && (
                    <Loader2 className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin" />
                  )}
                  {step.status === 'failed' && (
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                  {step.status === 'pending' && (
                    <div className="w-2 h-2 bg-secondary-400 rounded-full"></div>
                  )}
                </div>
                <span className="text-secondary-900 dark:text-white font-medium">
                  {step.step}
                </span>
              </div>
              {step.timestamp && (
                <span className="text-xs text-secondary-500 dark:text-secondary-400">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ASA Information */}
        {property.asa_id && (
          <div className="bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">
              ASA Deployed Successfully
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-green-700 dark:text-green-300">Asset ID:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-green-800 dark:text-green-200">
                    {property.asa_id}
                  </span>
                  <button
                    onClick={copyAsaId}
                    className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded transition-colors"
                    title="Copy ASA ID"
                  >
                    <Copy className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </button>
                </div>
              </div>
              {tokenizationStatus.txId && (
                <div className="flex items-center justify-between">
                  <span className="text-green-700 dark:text-green-300">Transaction ID:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-green-800 dark:text-green-200 text-sm">
                      {tokenizationStatus.txId.slice(0, 8)}...{tokenizationStatus.txId.slice(-8)}
                    </span>
                    <button
                      onClick={() => window.open(`https://testnet.algoexplorer.io/tx/${tokenizationStatus.txId}`, '_blank')}
                      className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded transition-colors"
                      title="View on AlgoExplorer"
                    >
                      <ExternalLink className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {!property.asa_id ? (
            <button
              onClick={handleTokenize}
              disabled={tokenizationStatus.status === 'preparing' || tokenizationStatus.status === 'deploying'}
              className="flex-1 bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 text-white font-semibold py-3 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center"
            >
              {tokenizationStatus.status === 'preparing' || tokenizationStatus.status === 'deploying' ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Deploying ASA...
                </>
              ) : (
                <>
                  <Coins className="h-5 w-5 mr-2" />
                  Deploy ASA
                </>
              )}
            </button>
          ) : (
            <div className="flex-1 flex space-x-3">
              <button
                onClick={() => window.open(`https://testnet.algoexplorer.io/asset/${property.asa_id}`, '_blank')}
                className="flex-1 bg-secondary-600/80 hover:bg-secondary-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                View on Explorer
              </button>
              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['property', property.id] })
                }}
                className="px-4 py-3 bg-primary-600/80 hover:bg-primary-700 text-white rounded-xl transition-colors"
                title="Refresh status"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {tokenizationStatus.error && (
          <div className="mt-4 p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div className="text-red-800 dark:text-red-200">
                <div className="font-medium">Deployment Failed</div>
                <div className="text-sm">{tokenizationStatus.error}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tokenization Modal */}
      {showTokenizationModal && (
        <TokenizationModal
          property={{
            id: property.id,
            name: property.name,
            description: `Tokenized real estate property: ${property.name}`,
            location: property.address?.city || 'Unknown',
            totalValue: Number(property.total_value),
            tokenPrice: Number(property.token_price),
            totalTokens: property.total_tokens,
            propertyType: property.address?.property_type || 'residential',
            expectedYield: 8.0
          }}
          onClose={() => setShowTokenizationModal(false)}
          onSuccess={handleTokenizationSuccess}
        />
      )}
    </>
  )
}