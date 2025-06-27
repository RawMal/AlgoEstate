import { useState, useEffect } from 'react'
import { X, Wallet, AlertCircle, CheckCircle, Loader2, DollarSign } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import { Property } from '../types/property'
import { 
  microAlgos,
} from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import { algorandClient } from '../services/algorandService'

interface InvestmentModalProps {
  property: Property
  onClose: () => void
}

type TransactionStatus = 'idle' | 'preparing' | 'signing' | 'submitting' | 'success' | 'error'

interface WalletBalance {
  algo: number
  isLoading: boolean
  error?: string
}

export function InvestmentModal({ property, onClose }: InvestmentModalProps) {
  const { activeAddress, signTransactions, activeWallet } = useWallet()
  const [tokenAmount, setTokenAmount] = useState(1)
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>('idle')
  const [transactionId, setTransactionId] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [walletBalance, setWalletBalance] = useState<WalletBalance>({
    algo: 0,
    isLoading: true
  })

  const totalCost = tokenAmount * property.tokenPrice
  const platformFee = totalCost * 0.02
  const totalWithFees = totalCost + platformFee
  const minTokens = Math.ceil(property.minInvestment / property.tokenPrice)
  const maxTokens = Math.min(property.availableTokens, 1000) // Max 1000 tokens per transaction

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeAddress) {
        setWalletBalance({ algo: 0, isLoading: false })
        return
      }

      try {
        setWalletBalance(prev => ({ ...prev, isLoading: true, error: undefined }))
        
        const accountInfo = await algorandClient.account.getInformation(activeAddress)
        const algoBalance = accountInfo.amount / 1_000_000 // Convert microAlgos to Algos
        
        setWalletBalance({
          algo: algoBalance,
          isLoading: false
        })
      } catch (error) {
        console.error('Error fetching balance:', error)
        setWalletBalance({
          algo: 0,
          isLoading: false,
          error: 'Failed to fetch balance'
        })
      }
    }

    fetchBalance()
  }, [activeAddress])

  const handleInvest = async () => {
    if (!activeAddress || !activeWallet) {
      setErrorMessage('Please connect your wallet first')
      return
    }

    if (walletBalance.algo < totalWithFees) {
      setErrorMessage(`Insufficient balance. You need ${totalWithFees.toFixed(2)} ALGO but only have ${walletBalance.algo.toFixed(2)} ALGO`)
      return
    }

    try {
      setTransactionStatus('preparing')
      setErrorMessage('')

      // Get suggested transaction parameters
      const suggestedParams = await algorandClient.client.getTransactionParams().do()

      // Create property token asset (in a real implementation, this would be pre-created)
      // For demo purposes, we'll simulate a payment transaction to a property escrow account
      const propertyEscrowAddress = 'PROPERTYESCROWADDRESSEXAMPLE' // This would be the actual property escrow

      // Create atomic transaction group
      const transactions = []

      // Transaction 1: Payment for tokens (to property escrow)
      const tokenPaymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: activeAddress,
        to: propertyEscrowAddress,
        amount: microAlgos(totalCost).microAlgos,
        suggestedParams,
        note: new TextEncoder().encode(`Investment in ${property.title} - ${tokenAmount} tokens`)
      })

      // Transaction 2: Platform fee payment
      const platformFeeAddress = 'PLATFORMFEEADDRESSEXAMPLE' // Platform fee collection address
      const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: activeAddress,
        to: platformFeeAddress,
        amount: microAlgos(platformFee).microAlgos,
        suggestedParams,
        note: new TextEncoder().encode(`Platform fee for property investment`)
      })

      transactions.push(tokenPaymentTxn, feeTxn)

      // Group transactions atomically
      const groupedTxns = algosdk.assignGroupID(transactions)
      
      setTransactionStatus('signing')

      // Sign transactions
      const encodedTxns = groupedTxns.map(txn => algosdk.encodeUnsignedTransaction(txn))
      const signedTxns = await signTransactions(encodedTxns)

      setTransactionStatus('submitting')

      // Submit transaction group
      const { txId } = await algorandClient.client.sendRawTransaction(signedTxns).do()
      
      // Wait for confirmation
      await algosdk.waitForConfirmation(algorandClient.client, txId, 4)
      
      setTransactionId(txId)
      setTransactionStatus('success')

      // Refresh wallet balance
      const accountInfo = await algorandClient.account.getInformation(activeAddress)
      setWalletBalance({
        algo: accountInfo.amount / 1_000_000,
        isLoading: false
      })

    } catch (error: any) {
      console.error('Investment transaction failed:', error)
      setTransactionStatus('error')
      
      if (error.message?.includes('rejected')) {
        setErrorMessage('Transaction was rejected by user')
      } else if (error.message?.includes('insufficient')) {
        setErrorMessage('Insufficient funds for transaction')
      } else if (error.message?.includes('network')) {
        setErrorMessage('Network error. Please check your connection and try again')
      } else {
        setErrorMessage(error.message || 'Transaction failed. Please try again')
      }
    }
  }

  const resetModal = () => {
    setTransactionStatus('idle')
    setTransactionId('')
    setErrorMessage('')
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  // Success state
  if (transactionStatus === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/90 dark:bg-secondary-800/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-slide-up border border-white/20 dark:border-secondary-700/30">
          <div className="p-4 bg-green-100/80 dark:bg-green-900/30 backdrop-blur-sm rounded-full w-fit mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">
            Investment Successful!
          </h3>
          <p className="text-secondary-600 dark:text-secondary-300 mb-6">
            You have successfully purchased {tokenAmount} tokens of {property.title}
          </p>
          <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 mb-6">
            <div className="text-sm text-secondary-600 dark:text-secondary-400 mb-1">
              Transaction ID
            </div>
            <div className="font-mono text-xs text-secondary-900 dark:text-white break-all">
              {transactionId}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-full bg-primary-600/80 hover:bg-primary-700 backdrop-blur-sm text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-secondary-800/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up border border-white/20 dark:border-secondary-700/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">
            Invest in {property.title}
          </h3>
          <button
            onClick={handleClose}
            disabled={transactionStatus === 'signing' || transactionStatus === 'submitting'}
            className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 backdrop-blur-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5 text-secondary-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!activeAddress ? (
            <div className="text-center py-8">
              <Wallet className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                Connect Your Wallet
              </h4>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                You need to connect your Algorand wallet to make an investment
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-primary-600/80 hover:bg-primary-700 backdrop-blur-sm text-white font-semibold rounded-xl transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Wallet Balance */}
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    <span className="font-medium text-secondary-900 dark:text-white">
                      Wallet Balance
                    </span>
                  </div>
                  <div className="text-right">
                    {walletBalance.isLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-secondary-400" />
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">Loading...</span>
                      </div>
                    ) : walletBalance.error ? (
                      <span className="text-sm text-red-600 dark:text-red-400">{walletBalance.error}</span>
                    ) : (
                      <span className="font-bold text-secondary-900 dark:text-white">
                        {walletBalance.algo.toFixed(4)} ALGO
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Property Summary */}
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <img
                    src={property.image}
                    alt={property.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <div className="font-semibold text-secondary-900 dark:text-white">
                      {property.title}
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      ${property.tokenPrice} per token
                    </div>
                  </div>
                </div>
              </div>

              {/* Investment Amount */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Number of Tokens
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={minTokens}
                    max={maxTokens}
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(Math.max(minTokens, Math.min(maxTokens, parseInt(e.target.value) || minTokens)))}
                    disabled={transactionStatus !== 'idle'}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-secondary-500">
                    tokens
                  </div>
                </div>
                <div className="flex justify-between text-sm text-secondary-600 dark:text-secondary-400 mt-2">
                  <span>Min: {minTokens} tokens</span>
                  <span>Max: {maxTokens} tokens</span>
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[minTokens, Math.floor(maxTokens / 2), maxTokens].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTokenAmount(amount)}
                    disabled={transactionStatus !== 'idle'}
                    className="px-3 py-2 bg-secondary-100/50 dark:bg-secondary-700/50 hover:bg-primary-100/50 dark:hover:bg-primary-900/30 backdrop-blur-sm text-secondary-700 dark:text-secondary-300 hover:text-primary-700 dark:hover:text-primary-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {amount}
                  </button>
                ))}
              </div>

              {/* Investment Summary */}
              <div className="bg-primary-50/80 dark:bg-primary-900/20 backdrop-blur-sm rounded-xl p-4">
                <h4 className="font-semibold text-secondary-900 dark:text-white mb-3">
                  Investment Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Tokens</span>
                    <span className="text-secondary-900 dark:text-white font-medium">
                      {tokenAmount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Price per token</span>
                    <span className="text-secondary-900 dark:text-white font-medium">
                      ${property.tokenPrice}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Subtotal</span>
                    <span className="text-secondary-900 dark:text-white font-medium">
                      ${totalCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Platform fee (2%)</span>
                    <span className="text-secondary-900 dark:text-white font-medium">
                      ${platformFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-secondary-200/50 dark:border-secondary-600/50 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-secondary-900 dark:text-white">Total (ALGO)</span>
                      <span className="font-bold text-primary-600 dark:text-primary-400">
                        {totalWithFees.toFixed(2)} ALGO
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-start space-x-3 p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm rounded-xl">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800 dark:text-red-200">
                    {errorMessage}
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start space-x-3 p-4 bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm rounded-xl">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Investment Risk Notice</p>
                  <p>Real estate investments carry risk. This is a demo transaction on Algorand TestNet.</p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleInvest}
                disabled={
                  transactionStatus !== 'idle' || 
                  walletBalance.isLoading || 
                  walletBalance.algo < totalWithFees ||
                  !activeAddress
                }
                className="w-full bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 backdrop-blur-sm text-white font-semibold py-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center"
              >
                {transactionStatus === 'preparing' && (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Preparing Transaction...
                  </>
                )}
                {transactionStatus === 'signing' && (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Please Sign Transaction...
                  </>
                )}
                {transactionStatus === 'submitting' && (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Submitting Transaction...
                  </>
                )}
                {transactionStatus === 'idle' && `Invest ${totalWithFees.toFixed(2)} ALGO`}
                {transactionStatus === 'error' && 'Try Again'}
              </button>

              {transactionStatus !== 'idle' && (
                <div className="text-center text-sm text-secondary-600 dark:text-secondary-400">
                  {transactionStatus === 'signing' && 'Please check your wallet to sign the transaction'}
                  {transactionStatus === 'submitting' && 'Transaction is being processed on the blockchain'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}