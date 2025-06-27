import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Upload,
  X,
  MapPin,
  DollarSign,
  FileText,
  Image,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { AdminService } from '../../services/adminService'
import { PropertyFormData } from '../../types/admin'

interface PropertyUploadFormProps {
  onSuccess?: (propertyId: string) => void
  onCancel?: () => void
}

export function PropertyUploadForm({ onSuccess, onCancel }: PropertyUploadFormProps) {
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'United States',
      zipCode: ''
    },
    propertyType: 'residential',
    totalValue: 0,
    tokenPrice: 0,
    totalTokens: 10000,
    expectedYield: 8.0,
    images: [],
    documents: [],
    amenities: [],
    specifications: {
      area: 0
    },
    financials: {
      operatingExpenses: 0,
      propertyTaxes: 0,
      insurance: 0,
      maintenance: 0
    },
    legalInfo: {
      propertyId: '',
      ownershipType: 'Fee Simple',
      zoning: '',
      titleStatus: 'Clear'
    }
  })

  const [amenityInput, setAmenityInput] = useState('')

  // Create property mutation
  const createPropertyMutation = useMutation({
    mutationFn: (data: PropertyFormData) => AdminService.createProperty(data, 'admin-1'),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: ['admin-properties'] })
        onSuccess?.(result.data.id)
      }
    }
  })

  // Image dropzone
  const {
    getRootProps: getImageRootProps,
    getInputProps: getImageInputProps,
    isDragActive: isImageDragActive
  } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 10,
    onDrop: (acceptedFiles) => {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...acceptedFiles]
      }))
    }
  })

  // Document dropzone
  const {
    getRootProps: getDocRootProps,
    getInputProps: getDocInputProps,
    isDragActive: isDocDragActive
  } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 5,
    onDrop: (acceptedFiles) => {
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...acceptedFiles]
      }))
    }
  })

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }))
  }

  const addAmenity = () => {
    if (amenityInput.trim()) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenityInput.trim()]
      }))
      setAmenityInput('')
    }
  }

  const removeAmenity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.name || !formData.totalValue || !formData.tokenPrice) {
      alert('Please fill in all required fields')
      return
    }

    createPropertyMutation.mutate(formData)
  }

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const steps = [
    { id: 1, title: 'Basic Info', icon: Building2 },
    { id: 2, title: 'Financial Details', icon: DollarSign },
    { id: 3, title: 'Media & Documents', icon: Image },
    { id: 4, title: 'Review & Submit', icon: CheckCircle }
  ]

  return (
    <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-secondary-700/30">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Add New Property
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400">
            Create a new tokenized real estate property
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-secondary-500" />
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step.id <= currentStep
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-300 dark:bg-secondary-600 text-secondary-600 dark:text-secondary-400'
                }`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <div className="ml-3 hidden md:block">
                <div className={`text-sm font-medium ${
                  step.id <= currentStep
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-secondary-600 dark:text-secondary-400'
                }`}>
                  {step.title}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-4 ${
                    step.id < currentStep
                      ? 'bg-primary-600'
                      : 'bg-secondary-300 dark:bg-secondary-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="p-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Property Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Enter property name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Describe the property..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Property Type *
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => setFormData(prev => ({ ...prev, propertyType: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="mixed">Mixed Use</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Total Area (sq ft)
                  </label>
                  <input
                    type="number"
                    value={formData.specifications.area}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      specifications: { ...prev.specifications, area: Number(e.target.value) }
                    }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Property Address
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={formData.address.street}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, street: e.target.value }
                      }))}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.address.city}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, city: e.target.value }
                      }))}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="State"
                      value={formData.address.state}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, state: e.target.value }
                      }))}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="ZIP Code"
                      value={formData.address.zipCode}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, zipCode: e.target.value }
                      }))}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Country"
                      value={formData.address.country}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, country: e.target.value }
                      }))}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                  Amenities
                </h4>
                <div className="flex space-x-2 mb-4">
                  <input
                    type="text"
                    value={amenityInput}
                    onChange={(e) => setAmenityInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                    placeholder="Add amenity"
                    className="flex-1 px-4 py-2 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={addAmenity}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 rounded-full text-sm"
                    >
                      {amenity}
                      <button
                        type="button"
                        onClick={() => removeAmenity(index)}
                        className="ml-2 hover:text-primary-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Financial Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Total Property Value ($) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.totalValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalValue: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Token Price ($) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.tokenPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, tokenPrice: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Total Tokens
                  </label>
                  <input
                    type="number"
                    value={formData.totalTokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalTokens: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="10000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Expected Yield (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.expectedYield}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedYield: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="8.0"
                  />
                </div>
              </div>

              {/* Financial Details */}
              <div>
                <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                  Operating Expenses (Annual)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Property Taxes ($)
                    </label>
                    <input
                      type="number"
                      value={formData.financials.propertyTaxes}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        financials: { ...prev.financials, propertyTaxes: Number(e.target.value) }
                      }))}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Insurance ($)
                    </label>
                    <input
                      type="number"
                      value={formData.financials.insurance}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        financials: { ...prev.financials, insurance: Number(e.target.value) }
                      }))}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Maintenance ($)
                    </label>
                    <input
                      type="number"
                      value={formData.financials.maintenance}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        financials: { ...prev.financials, maintenance: Number(e.target.value) }
                      }))}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Other Operating Expenses ($)
                    </label>
                    <input
                      type="number"
                      value={formData.financials.operatingExpenses}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        financials: { ...prev.financials, operatingExpenses: Number(e.target.value) }
                      }))}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Metrics */}
              <div className="bg-primary-50/80 dark:bg-primary-900/20 backdrop-blur-sm rounded-xl p-4">
                <h5 className="font-semibold text-secondary-900 dark:text-white mb-3">
                  Calculated Metrics
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-primary-600 dark:text-primary-400">
                      ${(formData.totalValue / formData.totalTokens).toFixed(2)}
                    </div>
                    <div className="text-secondary-600 dark:text-secondary-400">
                      Value per Token
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-primary-600 dark:text-primary-400">
                      {formData.tokenPrice > 0 ? ((formData.totalValue / formData.totalTokens / formData.tokenPrice - 1) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-secondary-600 dark:text-secondary-400">
                      Token Discount
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-primary-600 dark:text-primary-400">
                      ${(formData.totalTokens * formData.tokenPrice).toLocaleString()}
                    </div>
                    <div className="text-secondary-600 dark:text-secondary-400">
                      Total Raise
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-primary-600 dark:text-primary-400">
                      {formData.expectedYield.toFixed(1)}%
                    </div>
                    <div className="text-secondary-600 dark:text-secondary-400">
                      Expected Yield
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Media & Documents */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Images Upload */}
              <div>
                <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 flex items-center">
                  <Image className="h-5 w-5 mr-2" />
                  Property Images
                </h4>
                <div
                  {...getImageRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                    isImageDragActive
                      ? 'border-primary-400 dark:border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
                      : 'border-secondary-300/50 dark:border-secondary-600/50 hover:border-primary-400 dark:hover:border-primary-500'
                  }`}
                >
                  <input {...getImageInputProps()} />
                  <Upload className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                  <p className="text-secondary-600 dark:text-secondary-400 mb-2">
                    {isImageDragActive ? 'Drop images here' : 'Click to upload or drag and drop images'}
                  </p>
                  <p className="text-sm text-secondary-500 dark:text-secondary-500">
                    PNG, JPG, WebP up to 10MB each (max 10 images)
                  </p>
                </div>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {formData.images.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Property ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documents Upload */}
              <div>
                <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Legal Documents
                </h4>
                <div
                  {...getDocRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                    isDocDragActive
                      ? 'border-primary-400 dark:border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
                      : 'border-secondary-300/50 dark:border-secondary-600/50 hover:border-primary-400 dark:hover:border-primary-500'
                  }`}
                >
                  <input {...getDocInputProps()} />
                  <FileText className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                  <p className="text-secondary-600 dark:text-secondary-400 mb-2">
                    {isDocDragActive ? 'Drop documents here' : 'Click to upload or drag and drop documents'}
                  </p>
                  <p className="text-sm text-secondary-500 dark:text-secondary-500">
                    PDF, DOC, DOCX up to 10MB each (max 5 documents)
                  </p>
                </div>

                {formData.documents.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {formData.documents.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-secondary-50/50 dark:bg-secondary-700/30 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
                          <div>
                            <div className="font-medium text-secondary-900 dark:text-white">
                              {file.name}
                            </div>
                            <div className="text-sm text-secondary-600 dark:text-secondary-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-6">
                <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                  Property Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Name:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium">
                      {formData.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Type:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium capitalize">
                      {formData.propertyType}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Total Value:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium">
                      ${formData.totalValue.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Token Price:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium">
                      ${formData.tokenPrice}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Total Tokens:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium">
                      {formData.totalTokens.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Expected Yield:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium">
                      {formData.expectedYield}%
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Images:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium">
                      {formData.images.length} uploaded
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Documents:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium">
                      {formData.documents.length} uploaded
                    </span>
                  </div>
                </div>
              </div>

              {createPropertyMutation.isError && (
                <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <div className="text-red-800 dark:text-red-200">
                      {createPropertyMutation.error?.message || 'Failed to create property'}
                    </div>
                  </div>
                </div>
              )}

              {createPropertyMutation.isSuccess && (
                <div className="bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="text-green-800 dark:text-green-200">
                      Property created successfully! You can now tokenize it.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between p-6 border-t border-secondary-200/50 dark:border-secondary-700/50">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-3 bg-secondary-200/50 dark:bg-secondary-700/50 hover:bg-secondary-300/50 dark:hover:bg-secondary-600/50 text-secondary-900 dark:text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-primary-600/80 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={createPropertyMutation.isPending}
              className="px-6 py-3 bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed flex items-center"
            >
              {createPropertyMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Creating Property...
                </>
              ) : (
                'Create Property'
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}