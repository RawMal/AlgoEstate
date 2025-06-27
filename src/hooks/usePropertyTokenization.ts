import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { PropertyTokenizationService } from '../services/PropertyTokenizationService'
import { TokenizationIntegrationService } from '../services/tokenizationIntegration'
import { PropertyDetails, TokenizationResult, PurchaseParams } from '../types/tokenization'

// Initialize Algorand client
const algorandClient = AlgorandClient.testNet() // Use mainnet in production

export const usePropertyTokenization = () => {
  const { activeAddress, signTransactions } = useWallet()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  // Initialize services
  const tokenizationService = new PropertyTokenizationService(algorandClient)
  const integrationService = new TokenizationIntegrationService(algorandClient)

  // Tokenize property mutation
  const tokenizePropertyMutation = useMutation({
    mutationFn: async (property: PropertyDetails): Promise<TokenizationResult> => {
      if (!activeAddress) {
        throw new Error('Wallet not connected')
      }

      setIsLoading(true)

      try {
        // Create signer function
        const signer = {
          signer: async (txns: any[], indexesToSign: number[]) => {
            const txnsToSign = indexesToSign.map(i => txns[i])
            return await signTransactions(txnsToSign)
          }
        }

        // Use integration service for complete workflow
        const result = await integrationService.tokenizePropertyComplete(
          property.id,
          activeAddress,
          signer
        )

        if (result.success) {
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['properties'] })
          queryClient.invalidateQueries({ queryKey: ['property', property.id] })
        }

        return result
      } finally {
        setIsLoading(false)
      }
    }
  })

  // Purchase tokens mutation
  const purchaseTokensMutation = useMutation({
    mutationFn: async (params: {
      propertyId: string
      tokenAmount: number
      sellerAddress: string
    }): Promise<TokenizationResult> => {
      if (!activeAddress) {
        throw new Error('Wallet not connected')
      }

      setIsLoading(true)

      try {
        // Create buyer signer
        const buyerSigner = {
          signer: async (txns: any[], indexesToSign: number[]) => {
            const txnsToSign = indexesToSign.map(i => txns[i])
            return await signTransactions(txnsToSign)
          }
        }

        // For demo purposes, use the same signer for seller
        // In production, this would be handled differently
        const sellerSigner = buyerSigner

        const result = await integrationService.purchaseTokensComplete(
          params.propertyId,
          activeAddress,
          params.tokenAmount,
          buyerSigner,
          sellerSigner
        )

        if (result.success) {
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['properties'] })
          queryClient.invalidateQueries({ queryKey: ['property', params.propertyId] })
          queryClient.invalidateQueries({ queryKey: ['portfolio', activeAddress] })
          queryClient.invalidateQueries({ queryKey: ['account-assets', activeAddress] })
        }

        return result
      } finally {
        setIsLoading(false)
      }
    }
  })

  // Check if account has opted into asset
  const checkOptInRequired = async (assetId: number): Promise<boolean> => {
    if (!activeAddress) return true

    try {
      return await tokenizationService.checkOptInRequired(activeAddress, assetId)
    } catch (error) {
      console.error('Error checking opt-in status:', error)
      return true
    }
  }

  // Get token balance for specific asset
  const getTokenBalance = async (assetId: number): Promise<number> => {
    if (!activeAddress) return 0

    try {
      return await tokenizationService.getTokenBalance(activeAddress, assetId)
    } catch (error) {
      console.error('Error fetching token balance:', error)
      return 0
    }
  }

  // Verify ownership consistency
  const verifyOwnership = async (propertyId: string) => {
    if (!activeAddress) {
      throw new Error('Wallet not connected')
    }

    try {
      return await integrationService.verifyOwnership(activeAddress, propertyId)
    } catch (error) {
      console.error('Error verifying ownership:', error)
      throw error
    }
  }

  // Get asset information
  const getAssetInfo = async (assetId: number) => {
    try {
      return await tokenizationService.getAssetInfo(assetId)
    } catch (error) {
      console.error('Error fetching asset info:', error)
      throw error
    }
  }

  return {
    // State
    isLoading: isLoading || tokenizePropertyMutation.isPending || purchaseTokensMutation.isPending,
    
    // Mutations
    tokenizeProperty: tokenizePropertyMutation.mutate,
    tokenizePropertyAsync: tokenizePropertyMutation.mutateAsync,
    purchaseTokens: purchaseTokensMutation.mutate,
    purchaseTokensAsync: purchaseTokensMutation.mutateAsync,
    
    // Mutation states
    tokenizationStatus: {
      isLoading: tokenizePropertyMutation.isPending,
      isError: tokenizePropertyMutation.isError,
      isSuccess: tokenizePropertyMutation.isSuccess,
      error: tokenizePropertyMutation.error,
      data: tokenizePropertyMutation.data
    },
    
    purchaseStatus: {
      isLoading: purchaseTokensMutation.isPending,
      isError: purchaseTokensMutation.isError,
      isSuccess: purchaseTokensMutation.isSuccess,
      error: purchaseTokensMutation.error,
      data: purchaseTokensMutation.data
    },
    
    // Utility functions
    checkOptInRequired,
    getTokenBalance,
    verifyOwnership,
    getAssetInfo,
    
    // Services (for advanced usage)
    tokenizationService,
    integrationService
  }
}

export type UsePropertyTokenizationReturn = ReturnType<typeof usePropertyTokenization>