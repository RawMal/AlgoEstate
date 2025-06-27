import { 
  AlgorandClient,
  Config,
  microAlgos,
  getTransactionParams
} from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'

// Algorand client configuration
export const algorandClient = AlgorandClient.testNet()

// Property token configuration
export interface PropertyToken {
  assetId: number
  name: string
  unitName: string
  total: number
  decimals: number
  url?: string
  metadataHash?: Uint8Array
}

// Investment transaction parameters
export interface InvestmentParams {
  propertyId: string
  tokenAmount: number
  tokenPrice: number
  investorAddress: string
  propertyEscrowAddress: string
  platformFeeAddress: string
  platformFeeRate: number
}

// Create property token asset
export const createPropertyToken = async (
  creatorAddress: string,
  propertyData: {
    name: string
    unitName: string
    total: number
    url?: string
    metadataHash?: Uint8Array
  }
): Promise<{ assetId: number; txId: string }> => {
  try {
    const suggestedParams = await algorandClient.client.getTransactionParams().do()
    
    const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: creatorAddress,
      total: propertyData.total,
      decimals: 0,
      assetName: propertyData.name,
      unitName: propertyData.unitName,
      assetURL: propertyData.url,
      assetMetadataHash: propertyData.metadataHash,
      defaultFrozen: false,
      freeze: creatorAddress,
      manager: creatorAddress,
      clawback: creatorAddress,
      reserve: creatorAddress,
      suggestedParams
    })

    return {
      assetId: 0, // This would be returned from the actual transaction
      txId: 'mock-transaction-id'
    }
  } catch (error) {
    console.error('Error creating property token:', error)
    throw error
  }
}

// Create investment transaction group
export const createInvestmentTransactionGroup = async (
  params: InvestmentParams
): Promise<algosdk.Transaction[]> => {
  try {
    const suggestedParams = await algorandClient.client.getTransactionParams().do()
    
    const totalCost = params.tokenAmount * params.tokenPrice
    const platformFee = totalCost * params.platformFeeRate
    
    const transactions: algosdk.Transaction[] = []

    // Transaction 1: Payment for tokens to property escrow
    const tokenPaymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: params.investorAddress,
      to: params.propertyEscrowAddress,
      amount: microAlgos(totalCost).microAlgos,
      suggestedParams,
      note: new TextEncoder().encode(`Investment in property ${params.propertyId} - ${params.tokenAmount} tokens`)
    })

    // Transaction 2: Platform fee payment
    const feeTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: params.investorAddress,
      to: params.platformFeeAddress,
      amount: microAlgos(platformFee).microAlgos,
      suggestedParams,
      note: new TextEncoder().encode(`Platform fee for property investment`)
    })

    transactions.push(tokenPaymentTxn, feeTxn)

    // Group transactions atomically
    return algosdk.assignGroupID(transactions)
  } catch (error) {
    console.error('Error creating investment transaction group:', error)
    throw error
  }
}

// Get account information
export const getAccountInfo = async (address: string) => {
  try {
    return await algorandClient.account.getInformation(address)
  } catch (error) {
    console.error('Error fetching account info:', error)
    throw error
  }
}

// Get asset information
export const getAssetInfo = async (assetId: number) => {
  try {
    return await algorandClient.client.getAssetByID(assetId).do()
  } catch (error) {
    console.error('Error fetching asset info:', error)
    throw error
  }
}

// Wait for transaction confirmation
export const waitForConfirmation = async (txId: string, maxRounds = 4) => {
  try {
    return await algosdk.waitForConfirmation(algorandClient.client, txId, maxRounds)
  } catch (error) {
    console.error('Error waiting for confirmation:', error)
    throw error
  }
}

// Format microAlgos to Algos - updated to handle BigInt
export const formatAlgoAmount = (microAlgos: number | bigint): number => {
  return Number(microAlgos) / 1_000_000
}

// Format Algos to microAlgos
export const formatMicroAlgos = (algos: number): number => {
  return Math.round(algos * 1_000_000)
}

// Validate Algorand address
export const isValidAddress = (address: string): boolean => {
  try {
    algosdk.decodeAddress(address)
    return true
  } catch {
    return false
  }
}

// Mock property escrow addresses (in production, these would be actual smart contract addresses)
export const MOCK_ADDRESSES = {
  PROPERTY_ESCROW: 'PROPERTYESCROWADDRESSEXAMPLEALGORANDTESTNET123456789',
  PLATFORM_FEE: 'PLATFORMFEEADDRESSEXAMPLEALGORANDTESTNET123456789',
  PROPERTY_MANAGER: 'PROPERTYMANAGERADDRESSEXAMPLEALGORANDTESTNET123456789'
}