import { useState, useEffect } from 'react'
import { X, DollarSign, Home, Building2, MapPin, Upload, Image as ImageIcon, Trash2 } from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import { supabase } from '../lib/supabase'
import algosdk from 'algosdk'

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface PropertyFormData {
  name: string
  description: string
  street: string
  city: string
  state: string
  country: string
  zipCode: string
  propertyType: 'house' | 'apartment' | 'commercial'
  bedrooms: number
  bathrooms: number
  squarefoot: number
  totalValue: number
  images: File[]
}

export function AddPropertyModal({ isOpen, onClose, onSuccess }: AddPropertyModalProps) {
  const { activeAddress, signTransactions } = useWallet()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debug wallet connection and auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('AddPropertyModal - Auth Debug:', {
        activeAddress,
        addressType: typeof activeAddress,
        addressLength: activeAddress?.length,
        signTransactions: !!signTransactions,
        supabaseSession: !!session,
        supabaseUser: session?.user?.email || 'not logged in'
      })
    }
    checkAuth()
  }, [activeAddress, signTransactions])
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    description: '',
    street: '',
    city: '',
    state: '',
    country: 'USA',
    zipCode: '',
    propertyType: 'house',
    bedrooms: 0,
    bathrooms: 0,
    squarefoot: 0,
    totalValue: 100000,
    images: []
  })

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleInputChange = (field: keyof PropertyFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Property name is required'
    if (!formData.description.trim()) return 'Description is required'
    if (!formData.street.trim()) return 'Street address is required'
    if (!formData.city.trim()) return 'City is required'
    if (!formData.state.trim()) return 'State is required'
    if (!formData.zipCode.trim()) return 'ZIP code is required'
    if (formData.totalValue <= 0) return 'Total value must be greater than 0'
    if (formData.tokenPrice <= 0) return 'Token price must be greater than 0'
    if (formData.bedrooms < 0) return 'Bedrooms cannot be negative'
    if (formData.bathrooms < 0) return 'Bathrooms cannot be negative'
    if (formData.squarefoot <= 0) return 'Square footage must be greater than 0'
    
    return null
  }

  const FIXED_TOKEN_PRICE = 100 // $100 per token
  
  const calculateTokens = () => {
    return Math.floor(formData.totalValue / FIXED_TOKEN_PRICE)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newImages = Array.from(files).filter(file => 
        file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
      )
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }))
    }
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const uploadImagesToSupabase = async (images: File[]): Promise<string[]> => {
    const imageUrls: string[] = []
    
    for (const image of images) {
      const fileExt = image.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `property-images/${fileName}`

      const { data, error } = await supabase.storage
        .from('properties')
        .upload(filePath, image)

      if (error) {
        console.error('Error uploading image:', error)
        throw new Error(`Failed to upload image: ${error.message}`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('properties')
        .getPublicUrl(filePath)

      imageUrls.push(publicUrl)
    }

    return imageUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activeAddress) {
      setError('Please connect your wallet to list a property')
      return
    }

    // Additional address validation
    if (typeof activeAddress !== 'string' || activeAddress.trim().length === 0) {
      setError('Invalid wallet address. Please disconnect and reconnect your wallet.')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Calculate total tokens based on value and fixed token price
      const totalTokens = calculateTokens()
      
      // Upload images to Supabase storage
      let imageUrls: string[] = []
      let coverImageUrl = ''
      
      if (formData.images.length > 0) {
        console.log('Uploading images to Supabase...')
        imageUrls = await uploadImagesToSupabase(formData.images)
        coverImageUrl = imageUrls[0] // First image is the cover image
        console.log('Images uploaded successfully:', imageUrls)
      }
      
      // Create property address object
      const address = {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        zip: formData.zipCode,
        property_type: formData.propertyType === 'house' ? 'residential' as const : 
                      formData.propertyType === 'apartment' ? 'residential' as const : 
                      'commercial' as const,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        squarefoot: formData.squarefoot,
        description: formData.description
      }

      // Step 1: Create ASA (Algorand Standard Asset) for the property
      console.log('Creating property token on Algorand...')
      console.log('Active address:', activeAddress)
      console.log('Total tokens:', totalTokens)
      
      // Validate activeAddress is a proper Algorand address
      try {
        algosdk.decodeAddress(activeAddress)
      } catch (err) {
        throw new Error('Invalid Algorand address format. Please reconnect your wallet.')
      }
      
      // Create Algod client for TestNet
      const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')
      const suggestedParams = await algodClient.getTransactionParams().do()

      // Generate unit name from property name (max 8 characters for Algorand)
      const cleanName = formData.name.toUpperCase().replace(/[^A-Z0-9]/g, '')
      let unitName = cleanName.substring(0, 5) + 'TKN' // 5 chars + 'TKN' = 8 chars max
      
      // If the clean name is too short, pad with the first few characters
      if (cleanName.length < 3) {
        unitName = (cleanName + 'PROP').substring(0, 5) + 'TKN'
      }
      
      // Ensure it's exactly 8 characters or less
      unitName = unitName.substring(0, 8)
      
      console.log('Unit name generation:', {
        originalName: formData.name,
        cleanName: cleanName,
        unitName: unitName,
        unitNameLength: unitName.length
      })
      
      console.log('Creating asset with parameters:', {
        sender: activeAddress,
        total: totalTokens,
        assetName: `${formData.name.length > 16 ? formData.name.substring(0, 16) : formData.name} Property Token`.substring(0, 32),
        unitName: unitName,
        manager: activeAddress,
        reserve: activeAddress,
        freeze: activeAddress,
        clawback: activeAddress
      })
      
      // Create asset configuration
      const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        sender: activeAddress,  // Changed from 'from' to 'sender'
        total: totalTokens,
        decimals: 0, // Indivisible tokens
        assetName: `${formData.name.length > 16 ? formData.name.substring(0, 16) : formData.name} Property Token`.substring(0, 32),
        unitName: unitName,
        url: coverImageUrl || `https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`,
        defaultFrozen: false,
        manager: activeAddress,
        reserve: activeAddress,
        freeze: activeAddress,
        clawback: activeAddress,
        suggestedParams,
        note: new TextEncoder().encode(`Property: ${formData.name}`)
      })

      // Sign the transaction
      const encodedTxn = algosdk.encodeUnsignedTransaction(assetCreateTxn)
      const signedTxns = await signTransactions([encodedTxn])

      // Submit the transaction
      const validSignedTxns = signedTxns.filter(txn => txn !== null) as Uint8Array[]
      const response = await algodClient.sendRawTransaction(validSignedTxns).do()
      const txId = response.txid
      
      console.log('Transaction submitted with ID:', txId)

      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4)
      console.log('Transaction confirmed:', confirmedTxn)
      
      // Extract asset ID from confirmed transaction and convert BigInt to number
      let assetId = confirmedTxn['asset-index'] || confirmedTxn.assetIndex || confirmedTxn['created-asset-index']
      if (typeof assetId === 'bigint') {
        assetId = Number(assetId)
      }
      
      console.log('Asset ID extraction attempt:', {
        'asset-index': confirmedTxn['asset-index'],
        'assetIndex': confirmedTxn.assetIndex,
        'created-asset-index': confirmedTxn['created-asset-index'],
        'txn-results': confirmedTxn['txn-results'],
        'inner-txns': confirmedTxn['inner-txns']
      })

      // Helper function to serialize objects with BigInt
      const serializeWithBigInt = (obj: any) => {
        return JSON.stringify(obj, (key, value) =>
          typeof value === 'bigint' ? value.toString() + 'n' : value
        , 2)
      }

      // If asset ID not found in confirmation, try alternative method
      if (!assetId) {
        console.error('Asset ID not found in confirmation. Full confirmed transaction object:', serializeWithBigInt(confirmedTxn))
        
        // Try alternative method: get transaction details from algod
        try {
          console.log('Trying alternative method to get asset ID...')
          const txInfo = await algodClient.pendingTransactionInformation(txId).do()
          console.log('Transaction info:', txInfo)
          
          let alternativeAssetId = txInfo['asset-index'] || txInfo.assetIndex || txInfo['created-asset-index']
          if (alternativeAssetId) {
            // Convert BigInt to number if needed
            if (typeof alternativeAssetId === 'bigint') {
              alternativeAssetId = Number(alternativeAssetId)
            }
            console.log('Found asset ID via alternative method:', alternativeAssetId)
            assetId = alternativeAssetId
          }
        } catch (altError) {
          console.error('Alternative method failed:', altError)
        }
        
        // Final check
        if (!assetId) {
          throw new Error('Failed to create property token - no asset ID returned after trying multiple methods. Check console for transaction details.')
        }
      }

      console.log('Property token created with ASA ID:', assetId)

      // Step 2: Insert property into database
      console.log('Inserting property into database...')
      console.log('Property data:', {
        name: formData.name,
        address: address,
        total_value: formData.totalValue,
        token_price: FIXED_TOKEN_PRICE,
        total_tokens: totalTokens,
        available_tokens: totalTokens,
        asa_id: assetId,
        images: imageUrls.length,
        cover_image_url: coverImageUrl ? 'has cover image' : 'no cover image'
      })

      const propertyData = {
        name: formData.name,
        address: address,
        total_value: formData.totalValue,
        token_price: FIXED_TOKEN_PRICE,
        total_tokens: totalTokens,
        available_tokens: totalTokens, // All tokens initially available
        asa_id: assetId,
        metadata_url: null, // Could be added later for IPFS metadata
        images: imageUrls.map((url, index) => ({
          url,
          order: index,
          caption: index === 0 ? 'Cover Image' : `Image ${index + 1}`
        })),
        cover_image_url: coverImageUrl || null
      }

      const { data: property, error: dbError } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single()

      if (dbError) {
        console.error('Database error details:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        })
        
        // Check if it's an authentication issue
        if (dbError.message?.includes('JWT') || dbError.message?.includes('auth')) {
          throw new Error('Authentication required. Please sign up or log in to list a property.')
        }
        
        // Check if it's an RLS policy issue
        if (dbError.message?.includes('policy') || dbError.message?.includes('RLS')) {
          throw new Error('Permission denied. Please ensure you are logged in.')
        }
        
        throw new Error(`Failed to save property: ${dbError.message}`)
      }

      console.log('Property saved to database:', property)

      // Success!
      onSuccess?.()
      onClose()
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        street: '',
        city: '',
        state: '',
        country: 'USA',
        zipCode: '',
        propertyType: 'house',
        bedrooms: 0,
        bathrooms: 0,
        squarefoot: 0,
        totalValue: 100000,
        images: []
      })

    } catch (err) {
      console.error('Error creating property:', err)
      setError(err instanceof Error ? err.message : 'Failed to create property')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-white/95 dark:bg-secondary-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 dark:border-secondary-700/30 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-secondary-200/50 dark:border-secondary-700/50 flex-shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
                List a Property
              </h2>
              <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                Create a tokenized investment opportunity
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 rounded-xl transition-colors disabled:opacity-50"
            >
              <X className="h-6 w-6 text-secondary-600 dark:text-secondary-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">
              {/* Wallet Connection Warning */}
              {!activeAddress && (
                <div className="bg-yellow-100/50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    ⚠️ Please connect your Algorand wallet to list a property. This will create a token on the blockchain.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-100/50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-4">
                  <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-100/50 dark:bg-primary-900/30 rounded-lg">
                    <Home className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                    Basic Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Property Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., Luxury Manhattan Penthouse"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Describe the property features, location benefits, and investment opportunity..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Property Type *
                    </label>
                    <select
                      value={formData.propertyType}
                      onChange={(e) => handleInputChange('propertyType', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Square Footage *
                    </label>
                    <input
                      type="number"
                      value={formData.squarefoot || ''}
                      onChange={(e) => handleInputChange('squarefoot', parseInt(e.target.value) || 0)}
                      min="1"
                      placeholder="Enter square footage"
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Bedrooms *
                    </label>
                    <input
                      type="number"
                      value={formData.bedrooms || ''}
                      onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="Enter number of bedrooms"
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Bathrooms *
                    </label>
                    <input
                      type="number"
                      value={formData.bathrooms || ''}
                      onChange={(e) => handleInputChange('bathrooms', parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="Enter number of bathrooms"
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-accent-100/50 dark:bg-accent-900/30 rounded-lg">
                    <MapPin className="h-5 w-5 text-accent-600 dark:text-accent-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                    Address
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., 432 Park Avenue, PH88"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., New York"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., NY"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., 10022"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., USA"
                    />
                  </div>
                </div>
              </div>

              {/* Property Images */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg">
                    <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                    Property Images
                  </h3>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Upload Images (First image will be the cover image)
                  </label>
                  <div className="border-2 border-dashed border-secondary-300/50 dark:border-secondary-600/50 rounded-xl p-6 text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer inline-flex flex-col items-center space-y-2"
                    >
                      <Upload className="h-8 w-8 text-secondary-400" />
                      <span className="text-secondary-600 dark:text-secondary-400">
                        Click to upload images or drag and drop
                      </span>
                      <span className="text-xs text-secondary-500 dark:text-secondary-400">
                        PNG, JPG, WebP up to 10MB each
                      </span>
                    </label>
                  </div>
                </div>

                {/* Image Preview */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                            Cover
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Information */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100/50 dark:bg-green-900/30 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                    Tokenization Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Total Property Value *
                    </label>
                    <input
                      type="number"
                      value={formData.totalValue}
                      onChange={(e) => handleInputChange('totalValue', parseFloat(e.target.value) || 0)}
                      min="1"
                      className="w-full px-4 py-3 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Token Calculation Display */}
                <div className="bg-primary-50/50 dark:bg-primary-900/20 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-700 dark:text-secondary-300">Total Tokens:</span>
                    <span className="font-semibold text-secondary-900 dark:text-white">
                      {calculateTokens().toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-secondary-700 dark:text-secondary-300">Token Price:</span>
                    <span className="font-semibold text-secondary-900 dark:text-white">
                      {formatCurrency(FIXED_TOKEN_PRICE)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-secondary-700 dark:text-secondary-300">Minimum Investment:</span>
                    <span className="font-semibold text-secondary-900 dark:text-white">
                      {formatCurrency(FIXED_TOKEN_PRICE)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-secondary-200/50 dark:border-secondary-700/50 flex-shrink-0">
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-6 py-3 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !activeAddress}
                  className="px-6 py-3 bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 backdrop-blur-sm text-white font-medium rounded-xl transition-colors disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating Property...' : !activeAddress ? 'Connect Wallet First' : 'List Property'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}