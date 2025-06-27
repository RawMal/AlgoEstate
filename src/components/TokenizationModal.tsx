import { useState } from 'react'
import { X, Coins, AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react'
import { usePropertyTokenization } from '../hooks/usePropertyTokenization'
import { PropertyDetails } from '../types/tokenization'

interface TokenizationModalProps {
  property: PropertyDetails
  onClose: () => void
  onSuccess?: (asaId: number, txId: string) => void
}

export function TokenizationModal({ property, onClose, onSuccess }: TokenizationModalProps) {
  const { tokenizeProperty, tokenizationStatus, isLoading } = usePropertyTokenization()
  const [step, setStep] = useState<'confirm' | 'processing' | 'success' | 'error'>('confirm')

  const handleTokenize = async () => {
    setStep('processing')
    
    try {
      await tokenizeProperty(property)
      
      if (tokenizationStatus.isSuccess && tokenizationStatus.data?.success) {
        setStep('success')
        onSuccess?.(
          tokenizationStatus.data.asaId!,
          tokenizationStatus.data.txId!
        )
      } else {
        setStep('error')
      }
    } catch (error) {
      setStep('error')
    }
  }

  const handleClose = () => {
    if (step !== 'processing') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-secondary-800/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full animate-slide-up border border-white/20 dark:border-secondary-700/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">
            Tokenize Property
          </h3>
          <button
            onClick={handleClose}
            disabled={step === 'processing'}
            className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 backdrop-blur-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5 text-secondary-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'confirm' && (
            <div className="space-y-6">
              {/* Property Summary */}
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4">
                <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">
                  Property Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Name</span>
                    <span className="text-secondary-900 dark:text-white font-medium">
                      {property.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Total Value</span>
                    <span className="text-secondary-900 dark:text-white font-medium">
                      ${property.totalValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Token Price</span>
                    <span className="text-secondary-900 dark:text-white font-medium">
                      ${property.tokenPrice}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Total Tokens</span>
                    <span className="text-secondary-900 dark:text-white font-medium">
                      {property.totalTokens.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tokenization Details */}
              <div className="bg-primary-50/80 dark:bg-primary-900/20 backdrop-blur-sm rounded-xl p-4">
                <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">
                  Tokenization Details
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Coins className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-secondary-900 dark:text-white text-sm">
                        Algorand Standard Asset (ASA)
                      </div>
                      <div className="text-xs text-secondary-600 dark:text-secondary-400">
                        Creates {property.totalTokens.toLocaleString()} indivisible tokens
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Info className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-secondary-900 dark:text-white text-sm">
                        Smart Contract Management
                      </div>
                      <div className="text-xs text-secondary-600 dark:text-secondary-400">
                        Enables trading, transfers, and dividend distribution
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">Important Notice</p>
                    <p>
                      This will create a permanent blockchain asset. Ensure all property details are correct before proceeding.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleTokenize}
                disabled={isLoading}
                className="w-full bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 backdrop-blur-sm text-white font-semibold py-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
              >
                Create Property Tokens
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="p-4 bg-primary-100/80 dark:bg-primary-900/30 backdrop-blur-sm rounded-full w-fit mx-auto mb-6">
                <Loader2 className="h-12 w-12 text-primary-600 dark:text-primary-400 animate-spin" />
              </div>
              <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                Creating Property Tokens
              </h4>
              <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                Please confirm the transaction in your wallet
              </p>
              <div className="text-sm text-secondary-500 dark:text-secondary-400">
                This may take a few moments...
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="p-4 bg-green-100/80 dark:bg-green-900/30 backdrop-blur-sm rounded-full w-fit mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                Tokenization Successful!
              </h4>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                Your property has been successfully tokenized on the Algorand blockchain
              </p>
              
              {tokenizationStatus.data?.asaId && (
                <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 mb-6">
                  <div className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">
                    Asset ID
                  </div>
                  <div className="font-mono text-lg font-bold text-secondary-900 dark:text-white">
                    {tokenizationStatus.data.asaId}
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full bg-primary-600/80 hover:bg-primary-700 backdrop-blur-sm text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <div className="p-4 bg-red-100/80 dark:bg-red-900/30 backdrop-blur-sm rounded-full w-fit mx-auto mb-6">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                Tokenization Failed
              </h4>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                {tokenizationStatus.error?.message || 'An error occurred during tokenization'}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 bg-secondary-200/50 dark:bg-secondary-700/50 hover:bg-secondary-300/50 dark:hover:bg-secondary-600/50 backdrop-blur-sm text-secondary-900 dark:text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-primary-600/80 hover:bg-primary-700 backdrop-blur-sm text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}