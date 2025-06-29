import { useState, useEffect } from 'react'
import { X, Wallet, AlertCircle, CheckCircle, Loader2, DollarSign, User } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Property } from '../types/property'
import { 
  microAlgos,
} from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import { algorandClient, DEMO_ADDRESSES } from '../services/algorandService'
import { TokenOwnershipService } from '../services/tokenOwnershipService'
import { supabase } from '../lib/supabase'

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
  const queryClient = useQueryClient()
  const [tokenAmount, setTokenAmount] = useState(1)
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>('idle')
  const [transactionId, setTransactionId] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [user, setUser] = useState<any>(null)
  const [walletBalance, setWalletBalance] = useState<WalletBalance>({
    algo: 0,
    isLoading: true
  })

  // Check authentication status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 1 ALGO = $10,000 conversion rate
  const ALGO_TO_USD = 10000
  const tokenPriceInUSD = property.token_price || 100 // $100 per token
  const tokenPriceInALGO = tokenPriceInUSD / ALGO_TO_USD // 0.01 ALGO per token
  
  const totalCostALGO = tokenAmount * tokenPriceInALGO
  const platformFeeALGO = totalCostALGO * 0.02 // 2% platform fee
  const totalWithFees = totalCostALGO + platformFeeALGO
  
  // Token limits
  const minTokens = 1 // Minimum 1 token (0.01 ALGO)
  const maxTokens = Math.min(property.available_tokens || 1000, 1000) // Max 1000 tokens per transaction

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeAddress) {
        setWalletBalance({ algo: 0, isLoading: false })
        return
      }

      try {
        setWalletBalance(prev => ({ ...prev, isLoading: true, error: undefined }))
        
        // Use the direct algod client for better compatibility
        const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')
        const accountInfo = await algodClient.accountInformation(activeAddress).do()
        const algoBalance = Number(accountInfo.amount) / 1_000_000 // Convert microAlgos to Algos and handle BigInt
        
        setWalletBalance({
          algo: algoBalance,
          isLoading: false
        })
      } catch (error: any) {
        console.error('Error fetching balance:', error)
        let errorMessage = 'Failed to fetch balance'
        
        // More specific error messages
        if (error.status === 404) {
          errorMessage = 'Wallet not found on network'
        } else if (error.status === 429) {
          errorMessage = 'Too many requests, try again later'
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = 'Network connection error'
        }
        
        setWalletBalance({
          algo: 0,
          isLoading: false,
          error: errorMessage
        })
      }
    }

    fetchBalance()
  }, [activeAddress])

  const handleInvest = async () => {
    if (!user) {
      setErrorMessage('Please sign in first to make an investment')
      return
    }

    if (!activeAddress || !activeWallet) {
      setErrorMessage('Please connect your wallet first')
      return
    }

    if (walletBalance.algo < totalWithFees) {
      setErrorMessage(`Insufficient balance. You need ${totalWithFees.toFixed(2)} ALGO but only have ${walletBalance.algo.toFixed(2)} ALGO. Get free TestNet ALGO at: https://bank.testnet.algorand.network/`)
      return
    }

    try {
      setTransactionStatus('preparing')
      setErrorMessage('')

      // Use the direct algod client for transaction parameters
      const directAlgodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')
      const suggestedParams = await directAlgodClient.getTransactionParams().do()
      
      // Validate that we're on TestNet
      if (suggestedParams.genesisID !== 'testnet-v1.0') {
        throw new Error('Network mismatch: This app is configured for Algorand TestNet. Please switch your wallet to TestNet.')
      }

      // Use valid TestNet addresses for demo purposes
      // In production, these would be actual smart contract addresses
      const propertyEscrowAddress = DEMO_ADDRESSES.PROPERTY_ESCROW || 'BH4L5VMHHXBW6SNV2Y7TLMZIW57PBEG4FDL2BR5PAHAZW6CBVSEJJKG2ZU'
      const platformFeeAddress = DEMO_ADDRESSES.PLATFORM_FEE || '5J3GH27ZF2CQBDWSCQNQMBDITWLJOU6ZAJFAWDDHTFPHQZPLXSAZIXJSR4'

      // Validate addresses and parameters

      // Validate all addresses before creating transactions
      if (!activeAddress) {
        throw new Error('Active wallet address is null or undefined')
      }
      if (!propertyEscrowAddress) {
        throw new Error('Property escrow address is null or undefined')
      }
      if (!platformFeeAddress) {
        throw new Error('Platform fee address is null or undefined')
      }

      // Create atomic transaction group
      const transactions = []

      // Transaction 1: Payment for tokens (to property escrow)
      const tokenPaymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: propertyEscrowAddress,
        amount: Math.round(totalCostALGO * 1_000_000), // Convert to microAlgos
        suggestedParams,
        note: new TextEncoder().encode(`Investment in ${property.name || 'Unknown Property'} - ${tokenAmount} tokens`)
      })

      // Transaction 2: Platform fee payment
      const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: platformFeeAddress,
        amount: Math.round(platformFeeALGO * 1_000_000), // Convert to microAlgos
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

      // Submit transaction group - filter out any null values and get the correct response format
      const validSignedTxns = signedTxns.filter(txn => txn !== null) as Uint8Array[]
      const response = await directAlgodClient.sendRawTransaction(validSignedTxns).do()
      const txId = response.txid // Use the correct property name
      
      // Wait for confirmation
      await algosdk.waitForConfirmation(directAlgodClient, txId, 4)
      
      setTransactionId(txId)
      
      // Record the purchase in the database
      console.log('Recording token purchase in database...')
      try {
        // Get current available tokens first to avoid race conditions
        const { data: currentProperty, error: fetchError } = await supabase
          .from('properties')
          .select('available_tokens')
          .eq('id', property.id)
          .single()

        if (fetchError) {
          console.error('Failed to fetch current property data:', fetchError)
          throw new Error('Could not get current property data')
        }

        const currentAvailable = parseInt(String(currentProperty.available_tokens)) || 0
        const newAvailable = Math.max(0, currentAvailable - tokenAmount)
        
        console.log(`Updating tokens: ${currentAvailable} -> ${newAvailable} (buying ${tokenAmount})`)

        // For demo purposes, directly update the available_tokens count
        // In production, this would be handled by the TokenOwnershipService with proper auth
        const { data: updateResult, error: updateError } = await supabase
          .from('properties')
          .update({ 
            available_tokens: newAvailable
          })
          .eq('id', property.id)
          .select()

        if (updateError) {
          console.error('Failed to update available tokens:', updateError)
          throw new Error('Database update failed: ' + updateError.message)
        } else {
          console.log('Successfully updated available tokens. Result:', updateResult)
          if (!updateResult || updateResult.length === 0) {
            console.warn('⚠️ Update succeeded but no rows were affected - this indicates RLS policy is blocking the update')
            throw new Error('Database update was blocked - likely due to Row Level Security policies')
          }
        }

        // Try to record token ownership (will fail due to RLS but that's ok for demo)
        const ownershipResult = await TokenOwnershipService.recordTokenPurchase({
          property_id: property.id,
          wallet_address: activeAddress,
          token_amount: tokenAmount,
          transaction_id: txId,
          blockchain_confirmed: true
        })

        if (!ownershipResult.success) {
          console.log('Token ownership recording failed (expected due to RLS):', ownershipResult.error)
          // This is expected in demo mode due to RLS policies
        }
      } catch (error) {
        console.error('Database update error:', error)
      }

      // Invalidate and refetch property data to update UI
      console.log('🔄 Starting cache invalidation after successful transaction')
      console.log('📊 Property updated:', property.name, 'Tokens purchased:', tokenAmount)
      
      // Debug current cache state
      const currentPropertiesCache = queryClient.getQueryData(['properties'])
      console.log('📱 Current properties cache length:', Array.isArray(currentPropertiesCache) ? currentPropertiesCache.length : 'not array')
      
      // Force aggressive cache invalidation
      console.log('🗑️ Removing all property cache...')
      queryClient.removeQueries({ queryKey: ['properties'] })
      queryClient.removeQueries({ queryKey: ['property'] })
      
      // Wait for cache clear
      await new Promise(resolve => setTimeout(resolve, 200))
      
      console.log('🔄 Invalidating queries...')
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['property', property.id] })
      
      // Force immediate refetch
      console.log('⚡ Forcing immediate refetch...')
      try {
        await queryClient.refetchQueries({ queryKey: ['properties'] })
        console.log('✅ Properties refetch completed')
        
        await queryClient.refetchQueries({ queryKey: ['property', property.id] })
        console.log('✅ Property detail refetch completed')
        
        // Check if cache was updated
        const newPropertiesCache = queryClient.getQueryData(['properties'])
        console.log('📱 New properties cache length:', Array.isArray(newPropertiesCache) ? newPropertiesCache.length : 'not array')
        
        if (Array.isArray(newPropertiesCache)) {
          const updatedProperty = newPropertiesCache.find((p: any) => p.id === property.id)
          if (updatedProperty) {
            console.log('🎯 Updated property in cache:', updatedProperty.name, 'Available tokens:', updatedProperty.available_tokens)
          }
        }
        
      } catch (refetchError) {
        console.error('❌ Refetch failed:', refetchError)
      }
      
      console.log('✅ Cache invalidation process completed')
      
      setTransactionStatus('success')

      // Refresh wallet balance
      const accountInfo = await directAlgodClient.accountInformation(activeAddress).do()
      setWalletBalance({
        algo: Number(accountInfo.amount) / 1_000_000,
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

  const handleClose = async () => {
    // If we're closing after a successful transaction, ensure UI is updated
    if (transactionStatus === 'success') {
      console.log('Final cache refresh on modal close after successful transaction')
      // One final refresh to ensure the UI shows updated data
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['property', property.id] })
    }
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
            You have successfully purchased {tokenAmount} tokens of {property.name}
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
            Invest in {property.name}
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
          {!user ? (
            <div className="text-center py-8">
              <User className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                Sign In Required
              </h4>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                You need to sign in to make an investment. This ensures secure tracking of your property ownership.
              </p>
              <Link
                to="/auth"
                onClick={handleClose}
                className="inline-flex items-center justify-center px-6 py-3 bg-primary-600/80 hover:bg-primary-700 backdrop-blur-sm text-white font-semibold rounded-xl transition-colors"
              >
                Go to Sign In
              </Link>
            </div>
          ) : !activeAddress ? (
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
              {/* TestNet Notice */}
              <div className="bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">ℹ</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      TestNet Required
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      This app uses Algorand TestNet. Make sure your wallet is set to TestNet mode. 
                      Get free TestNet ALGO at <a href="https://bank.testnet.algorand.network/" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">bank.testnet.algorand.network</a>
                    </p>
                  </div>
                </div>
              </div>

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

              {/* TestNet ALGO Notice - Show when balance is zero */}
              {walletBalance.algo === 0 && !walletBalance.isLoading && (
                <div className="flex items-start space-x-3 p-4 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm rounded-xl">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Need TestNet ALGO?</p>
                    <p className="mb-2">Get free TestNet ALGO to try the demo:</p>
                    <a 
                      href="https://bank.testnet.algorand.network/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      🔗 Algorand TestNet Dispenser
                    </a>
                  </div>
                </div>
              )}

              {/* Property Summary */}
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <img
                    src={property.image_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}
                    alt={property.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <div className="font-semibold text-secondary-900 dark:text-white">
                      {property.name}
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      ${property.token_price} per token
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
                      ${property.token_price}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Subtotal</span>
                    <span className="text-secondary-900 dark:text-white font-medium">
                      {totalCostALGO.toFixed(4)} ALGO
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Platform fee (2%)</span>
                    <span className="text-secondary-900 dark:text-white font-medium">
                      {platformFeeALGO.toFixed(4)} ALGO
                    </span>
                  </div>
                  <div className="border-t border-secondary-200/50 dark:border-secondary-600/50 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-secondary-900 dark:text-white">Total</span>
                      <span className="font-bold text-primary-600 dark:text-primary-400">
                        {totalWithFees.toFixed(4)} ALGO
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-secondary-500 dark:text-secondary-400 mt-2 text-center">
                    ≈ ${(totalWithFees * ALGO_TO_USD).toFixed(2)} USD @ $10,000/ALGO
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
                  <p className="mb-2">Real estate investments carry risk. This is a demo transaction on Algorand TestNet.</p>
                  <p className="text-xs opacity-75">Demo transactions are sent to valid TestNet addresses for demonstration purposes.</p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleInvest}
                disabled={
                  transactionStatus !== 'idle' || 
                  walletBalance.isLoading || 
                  walletBalance.algo < totalWithFees ||
                  !activeAddress ||
                  !user
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
                {transactionStatus === 'idle' && `Invest ${totalWithFees.toFixed(4)} ALGO`}
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