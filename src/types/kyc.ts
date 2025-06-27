export type KYCStatus = 'not_started' | 'pending' | 'verified' | 'rejected'

export type DocumentType = 'national_id' | 'proof_of_address'

export type DocumentStatus = 'pending' | 'verified' | 'rejected'

export interface KYCDocument {
  id: string
  application_id: string
  document_type: DocumentType
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  status: DocumentStatus
  uploaded_at: string
  verified_at: string | null
  rejection_reason: string | null
}

export interface KYCApplication {
  id: string
  wallet_address: string
  first_name: string
  last_name: string
  date_of_birth: string
  phone_number: string
  email: string
  status: KYCStatus
  tier: number
  investment_limit: number
  created_at: string
  updated_at: string
  verified_at: string | null
  rejection_reason: string | null
  documents?: KYCDocument[]
}

export interface KYCFormData {
  first_name: string
  last_name: string
  date_of_birth: string
  phone_number: string
  email: string
}

export interface FileUpload {
  file: File
  preview: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

export interface DocumentUpload {
  type: DocumentType
  file: FileUpload | null
  required: boolean
  label: string
  description: string
  acceptedTypes: string[]
}