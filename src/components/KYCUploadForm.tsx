import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useWallet } from '@txnlab/use-wallet-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  User,
  Shield,
  Camera,
  Trash2
} from 'lucide-react'
import { KYCService } from '../services/kycService'
import { DocumentUpload, KYCFormData, DocumentType, FileUpload } from '../types/kyc'

export function KYCUploadForm() {
  const { activeAddress } = useWallet()
  const queryClient = useQueryClient()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<KYCFormData>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone_number: '',
    email: ''
  })
  
  const [documentUploads, setDocumentUploads] = useState<DocumentUpload[]>([
    {
      type: 'national_id',
      file: null,
      required: true,
      label: 'National ID / Passport',
      description: 'Government-issued photo identification (driver\'s license, passport, or national ID card)',
      acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    {
      type: 'proof_of_address',
      file: null,
      required: true,
      label: 'Proof of Address',
      description: 'Recent utility bill, bank statement, or government correspondence (within last 3 months)',
      acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    }
  ])

  // Fetch existing KYC application
  const { data: kycApplication, isLoading: isLoadingKYC } = useQuery({
    queryKey: ['kyc-application', activeAddress],
    queryFn: () => activeAddress ? KYCService.getKYCApplication(activeAddress) : null,
    enabled: !!activeAddress
  })

  // Create KYC application mutation
  const createApplicationMutation = useMutation({
    mutationFn: (data: KYCFormData) => KYCService.createKYCApplication(activeAddress!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-application', activeAddress] })
      setCurrentStep(2)
    }
  })

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: ({ 
      applicationId, 
      documentType, 
      file 
    }: { 
      applicationId: string
      documentType: DocumentType
      file: File 
    }) => KYCService.uploadDocument(applicationId, documentType, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-application', activeAddress] })
    }
  })

  // Submit application mutation
  const submitApplicationMutation = useMutation({
    mutationFn: (applicationId: string) => KYCService.submitKYCApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-application', activeAddress] })
    }
  })

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAddress) return

    createApplicationMutation.mutate(formData)
  }

  const handleFileUpload = useCallback(async (
    documentType: DocumentType,
    acceptedFiles: File[]
  ) => {
    if (!kycApplication || acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    
    // Validate file
    try {
      const maxSize = 10 * 1024 * 1024 // 10MB
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']

      if (file.size > maxSize) {
        throw new Error('File size must be less than 10MB')
      }

      if (!allowedTypes.includes(file.type)) {
        throw new Error('File must be JPG, PNG, or PDF format')
      }

      // Update upload state
      setDocumentUploads(prev => prev.map(upload => 
        upload.type === documentType 
          ? {
              ...upload,
              file: {
                file,
                preview: URL.createObjectURL(file),
                progress: 0,
                status: 'uploading'
              }
            }
          : upload
      ))

      // Upload file
      await uploadDocumentMutation.mutateAsync({
        applicationId: kycApplication.id,
        documentType,
        file
      })

      // Update upload state to completed
      setDocumentUploads(prev => prev.map(upload => 
        upload.type === documentType && upload.file
          ? {
              ...upload,
              file: {
                ...upload.file,
                progress: 100,
                status: 'completed'
              }
            }
          : upload
      ))

    } catch (error: any) {
      // Update upload state to error
      setDocumentUploads(prev => prev.map(upload => 
        upload.type === documentType && upload.file
          ? {
              ...upload,
              file: {
                ...upload.file,
                status: 'error',
                error: error.message
              }
            }
          : upload
      ))
    }
  }, [kycApplication, uploadDocumentMutation])

  const removeFile = (documentType: DocumentType) => {
    setDocumentUploads(prev => prev.map(upload => 
      upload.type === documentType 
        ? { ...upload, file: null }
        : upload
    ))
  }

  const handleSubmitApplication = () => {
    if (!kycApplication) return
    submitApplicationMutation.mutate(kycApplication.id)
  }

  if (!activeAddress) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
        <User className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400">
          Please connect your Algorand wallet to start the KYC verification process
        </p>
      </div>
    )
  }

  if (isLoadingKYC) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-secondary-600 dark:text-secondary-400">
          Loading KYC status...
        </p>
      </div>
    )
  }

  // Show status if application exists
  if (kycApplication) {
    if (kycApplication.status === 'verified') {
      return (
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
          <div className="p-4 bg-green-100/80 dark:bg-green-900/30 backdrop-blur-sm rounded-full w-fit mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">
            KYC Verification Complete!
          </h3>
          <p className="text-secondary-600 dark:text-secondary-300 mb-6">
            Your identity has been successfully verified. You can now invest in tokenized properties.
          </p>
          <div className="bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm rounded-xl p-4">
            <div className="text-sm text-green-800 dark:text-green-200">
              <strong>Verification Level:</strong> Tier {kycApplication.tier} - Full Access
            </div>
            <div className="text-sm text-green-800 dark:text-green-200 mt-1">
              <strong>Investment Limit:</strong> ${kycApplication.investment_limit.toLocaleString()} per transaction
            </div>
          </div>
        </div>
      )
    }

    if (kycApplication.status === 'pending') {
      return (
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
          <div className="p-4 bg-amber-100/80 dark:bg-amber-900/30 backdrop-blur-sm rounded-full w-fit mx-auto mb-6">
            <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">
            Verification in Progress
          </h3>
          <p className="text-secondary-600 dark:text-secondary-300 mb-6">
            Your documents are being reviewed. This process typically takes 1-3 business days.
          </p>
          <div className="bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm rounded-xl p-4">
            <div className="text-sm text-amber-800 dark:text-amber-200">
              We'll update your status once the review is complete.
            </div>
          </div>
        </div>
      )
    }

    if (kycApplication.status === 'rejected') {
      return (
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/20 dark:border-secondary-700/30">
          <div className="p-4 bg-red-100/80 dark:bg-red-900/30 backdrop-blur-sm rounded-full w-fit mx-auto mb-6">
            <X className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">
            Verification Rejected
          </h3>
          <p className="text-secondary-600 dark:text-secondary-300 mb-6">
            Your KYC application was rejected. Please review the feedback and resubmit.
          </p>
          {kycApplication.rejection_reason && (
            <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm rounded-xl p-4 mb-6">
              <div className="text-sm text-red-800 dark:text-red-200">
                <strong>Reason:</strong> {kycApplication.rejection_reason}
              </div>
            </div>
          )}
          <button
            onClick={() => setCurrentStep(1)}
            className="px-6 py-3 bg-primary-600/80 hover:bg-primary-700 backdrop-blur-sm text-white font-semibold rounded-xl transition-colors"
          >
            Start New Application
          </button>
        </div>
      )
    }
  }

  return (
    <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden border border-white/20 dark:border-secondary-700/30">
      {/* Progress Steps */}
      <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm px-8 py-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-300 dark:bg-secondary-600 text-secondary-600 dark:text-secondary-400'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    step < currentStep
                      ? 'bg-primary-600'
                      : 'bg-secondary-300 dark:bg-secondary-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-secondary-600 dark:text-secondary-400">Personal Info</span>
          <span className="text-secondary-600 dark:text-secondary-400">Documents</span>
          <span className="text-secondary-600 dark:text-secondary-400">Review</span>
        </div>
      </div>

      <div className="p-8">
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-4">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Enter your last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={createApplicationMutation.isPending}
              className="w-full bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 backdrop-blur-sm text-white font-semibold py-4 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center"
            >
              {createApplicationMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Creating Application...
                </>
              ) : (
                'Continue to Documents'
              )}
            </button>
          </form>
        )}

        {/* Step 2: Document Upload */}
        {currentStep === 2 && kycApplication && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-4">
                Document Upload
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                Please upload the following documents for verification:
              </p>
            </div>

            <div className="space-y-6">
              {documentUploads.map((upload) => (
                <DocumentUploadCard
                  key={upload.type}
                  upload={upload}
                  onFileUpload={(files) => handleFileUpload(upload.type, files)}
                  onRemoveFile={() => removeFile(upload.type)}
                  isUploading={uploadDocumentMutation.isPending}
                />
              ))}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex-1 bg-secondary-200/50 dark:bg-secondary-700/50 hover:bg-secondary-300/50 dark:hover:bg-secondary-600/50 backdrop-blur-sm text-secondary-900 dark:text-white font-semibold py-4 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={documentUploads.some(upload => !upload.file || upload.file.status !== 'completed')}
                className="flex-1 bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 backdrop-blur-sm text-white font-semibold py-4 rounded-xl transition-colors disabled:cursor-not-allowed"
              >
                Review & Submit
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {currentStep === 3 && kycApplication && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-4">
                Review Your Application
              </h3>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                Please review your information before submitting for verification.
              </p>
            </div>

            {/* Personal Information Summary */}
            <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-6">
              <h4 className="font-medium text-secondary-900 dark:text-white mb-4">
                Personal Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-secondary-600 dark:text-secondary-400">Name:</span>
                  <span className="ml-2 text-secondary-900 dark:text-white">
                    {kycApplication.first_name} {kycApplication.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-600 dark:text-secondary-400">Email:</span>
                  <span className="ml-2 text-secondary-900 dark:text-white">
                    {kycApplication.email}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-600 dark:text-secondary-400">Phone:</span>
                  <span className="ml-2 text-secondary-900 dark:text-white">
                    {kycApplication.phone_number}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-600 dark:text-secondary-400">Date of Birth:</span>
                  <span className="ml-2 text-secondary-900 dark:text-white">
                    {new Date(kycApplication.date_of_birth).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Documents Summary */}
            <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-6">
              <h4 className="font-medium text-secondary-900 dark:text-white mb-4">
                Uploaded Documents
              </h4>
              <div className="space-y-3">
                {documentUploads.filter(upload => upload.file).map((upload) => (
                  <div key={upload.type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="text-secondary-900 dark:text-white">{upload.label}</span>
                    </div>
                    <span className="text-sm text-secondary-600 dark:text-secondary-400">
                      {upload.file?.file.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Important Notice</p>
                  <p>
                    By submitting this application, you confirm that all information is accurate and up-to-date. 
                    False information may result in account suspension.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={submitApplicationMutation.isPending}
                className="flex-1 bg-secondary-200/50 dark:bg-secondary-700/50 hover:bg-secondary-300/50 dark:hover:bg-secondary-600/50 backdrop-blur-sm text-secondary-900 dark:text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                onClick={handleSubmitApplication}
                disabled={submitApplicationMutation.isPending}
                className="flex-1 bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 backdrop-blur-sm text-white font-semibold py-4 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center"
              >
                {submitApplicationMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit for Verification'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Document Upload Card Component
interface DocumentUploadCardProps {
  upload: DocumentUpload
  onFileUpload: (files: File[]) => void
  onRemoveFile: () => void
  isUploading: boolean
}

function DocumentUploadCard({ 
  upload, 
  onFileUpload, 
  onRemoveFile, 
  isUploading 
}: DocumentUploadCardProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFileUpload,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading || upload.file?.status === 'completed'
  })

  const getIcon = () => {
    if (upload.type === 'national_id') {
      return <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
    }
    return <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
  }

  return (
    <div className="border border-secondary-200/50 dark:border-secondary-700/50 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getIcon()}
          <div>
            <h4 className="font-medium text-secondary-900 dark:text-white">
              {upload.label}
              {upload.required && <span className="text-red-500 ml-1">*</span>}
            </h4>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              {upload.description}
            </p>
          </div>
        </div>
        {upload.file?.status === 'completed' && (
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        )}
      </div>

      {!upload.file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            isDragActive
              ? 'border-primary-400 dark:border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
              : 'border-secondary-300/50 dark:border-secondary-600/50 hover:border-primary-400 dark:hover:border-primary-500'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 text-secondary-400 mx-auto mb-2" />
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            {isDragActive ? 'Drop the file here' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-secondary-500 dark:text-secondary-500 mt-1">
            PNG, JPG, PDF up to 10MB
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* File Info */}
          <div className="flex items-center justify-between p-4 bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
              <div>
                <div className="font-medium text-secondary-900 dark:text-white">
                  {upload.file.file.name}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  {(upload.file.file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {upload.file.status === 'uploading' && (
                <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
              )}
              {upload.file.status === 'completed' && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {upload.file.status === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <button
                onClick={onRemoveFile}
                disabled={isUploading}
                className="p-1 hover:bg-secondary-200/50 dark:hover:bg-secondary-600/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {upload.file.status === 'uploading' && (
            <div className="w-full bg-secondary-200/50 dark:bg-secondary-700/50 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${upload.file.progress}%` }}
              />
            </div>
          )}

          {/* Error Message */}
          {upload.file.status === 'error' && upload.file.error && (
            <div className="p-3 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm rounded-xl">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-200">
                  {upload.file.error}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}