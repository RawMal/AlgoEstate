export interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'super_admin' | 'property_manager'
  permissions: AdminPermission[]
  created_at: string
  last_login?: string
}

export interface AdminPermission {
  resource: 'properties' | 'users' | 'kyc' | 'transactions' | 'analytics'
  actions: ('create' | 'read' | 'update' | 'delete')[]
}

export interface PropertyFormData {
  name: string
  description: string
  address: {
    street: string
    city: string
    state: string
    country: string
    zipCode: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  propertyType: 'residential' | 'commercial' | 'mixed' | 'industrial'
  totalValue: number
  tokenPrice: number
  totalTokens: number
  expectedYield: number
  images: File[]
  documents: File[]
  amenities: string[]
  specifications: {
    area: number
    bedrooms?: number
    bathrooms?: number
    floors?: number
    yearBuilt?: number
    parkingSpaces?: number
  }
  financials: {
    monthlyRent?: number
    operatingExpenses: number
    propertyTaxes: number
    insurance: number
    maintenance: number
  }
  legalInfo: {
    propertyId: string
    ownershipType: string
    zoning: string
    titleStatus: string
  }
}

export interface TokenizationStatus {
  status: 'not_started' | 'preparing' | 'deploying' | 'completed' | 'failed'
  asaId?: number
  txId?: string
  error?: string
  progress: number
  steps: {
    step: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    timestamp?: string
  }[]
}

export interface PropertyDistribution {
  propertyId: string
  propertyName: string
  totalTokens: number
  availableTokens: number
  fundingPercentage: number
  totalInvestors: number
  totalValue: number
  averageInvestment: number
  topInvestors: {
    walletAddress: string
    tokenAmount: number
    percentage: number
    investmentValue: number
  }[]
  distributionChart: {
    range: string
    count: number
    percentage: number
  }[]
}

export interface KYCReviewItem {
  applicationId: string
  walletAddress: string
  applicantName: string
  email: string
  submittedAt: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  tier: number
  documents: {
    type: 'national_id' | 'proof_of_address'
    fileName: string
    uploadedAt: string
    status: 'pending' | 'verified' | 'rejected'
    rejectionReason?: string
  }[]
  riskScore?: number
  notes?: string
  reviewedBy?: string
  reviewedAt?: string
}

export interface AdminDashboardStats {
  properties: {
    total: number
    active: number
    funded: number
    pending: number
  }
  users: {
    total: number
    verified: number
    pending: number
    rejected: number
  }
  transactions: {
    total: number
    volume: number
    fees: number
    last24h: number
  }
  kyc: {
    pending: number
    approved: number
    rejected: number
    averageProcessingTime: number
  }
}