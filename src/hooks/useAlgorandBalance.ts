import { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { getAccountInfo, formatAlgoAmount } from '../services/algorandService'

interface BalanceState {
  algo: number
  assets: Array<{
    assetId: number
    amount: number
    name?: string
    unitName?: string
  }>
  isLoading: boolean
  error?: string
}

export const useAlgorandBalance = () => {
  const { activeAddress } = useWallet()
  const [balance, setBalance] = useState<BalanceState>({
    algo: 0,
    assets: [],
    isLoading: true
  })

  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeAddress) {
        setBalance({
          algo: 0,
          assets: [],
          isLoading: false
        })
        return
      }

      try {
        setBalance(prev => ({ ...prev, isLoading: true, error: undefined }))
        
        const accountInfo = await getAccountInfo(activeAddress)
        const algoBalance = formatAlgoAmount(accountInfo.amount)
        
        // Get asset holdings
        const assets = accountInfo.assets?.map(asset => ({
          assetId: asset['asset-id'],
          amount: asset.amount,
          name: asset.name,
          unitName: asset['unit-name']
        })) || []
        
        setBalance({
          algo: algoBalance,
          assets,
          isLoading: false
        })
      } catch (error: any) {
        console.error('Error fetching balance:', error)
        setBalance({
          algo: 0,
          assets: [],
          isLoading: false,
          error: error.message || 'Failed to fetch balance'
        })
      }
    }

    fetchBalance()
    
    // Set up polling for balance updates
    const interval = setInterval(fetchBalance, 30000) // Poll every 30 seconds
    
    return () => clearInterval(interval)
  }, [activeAddress])

  const refetch = async () => {
    if (activeAddress) {
      try {
        const accountInfo = await getAccountInfo(activeAddress)
        const algoBalance = formatAlgoAmount(accountInfo.amount)
        
        const assets = accountInfo.assets?.map(asset => ({
          assetId: asset['asset-id'],
          amount: asset.amount,
          name: asset.name,
          unitName: asset['unit-name']
        })) || []
        
        setBalance({
          algo: algoBalance,
          assets,
          isLoading: false
        })
      } catch (error: any) {
        setBalance(prev => ({
          ...prev,
          error: error.message || 'Failed to fetch balance'
        }))
      }
    }
  }

  return {
    ...balance,
    refetch
  }
}