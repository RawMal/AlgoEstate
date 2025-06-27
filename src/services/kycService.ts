import { supabase } from '../lib/supabase'
import { KYCApplication, KYCDocument, KYCFormData, DocumentType } from '../types/kyc'
import { Database, ApiResponse } from '../types/database'

export class KYCService {
  /**
   * Get KYC application by wallet address
   */
  static async getKYCApplication(walletAddress: string): Promise<KYCApplication | null> {
    try {
      const { data, error } = await supabase
        .from('kyc_applications')
        .select(`
          *,
          documents:kyc_documents(*)
        `)
        .eq('wallet_address', walletAddress)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error fetching KYC application:', error)
      throw error
    }
  }

  /**
   * Create a new KYC application
   */
  static async createKYCApplication(
    walletAddress: string,
    formData: KYCFormData
  ): Promise<KYCApplication> {
    try {
      const { data, error } = await supabase
        .from('kyc_applications')
        .insert({
          wallet_address: walletAddress,
          ...formData,
          status: 'pending',
          tier: 1,
          investment_limit: 5000
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating KYC application:', error)
      throw error
    }
  }

  /**
   * Update KYC application
   */
  static async updateKYCApplication(
    applicationId: string,
    updates: Partial<KYCApplication>
  ): Promise<KYCApplication> {
    try {
      const { data, error } = await supabase
        .from('kyc_applications')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating KYC application:', error)
      throw error
    }
  }

  /**
   * Upload document file to Supabase Storage
   */
  static async uploadDocument(
    applicationId: string,
    documentType: DocumentType,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<KYCDocument> {
    try {
      // Validate file
      this.validateFile(file)

      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${applicationId}_${documentType}_${Date.now()}.${fileExt}`
      const filePath = `kyc-documents/${applicationId}/${fileName}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Create document record in database
      const { data: documentData, error: documentError } = await supabase
        .from('kyc_documents')
        .insert({
          application_id: applicationId,
          document_type: documentType,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          status: 'pending'
        })
        .select()
        .single()

      if (documentError) throw documentError

      return documentData
    } catch (error) {
      console.error('Error uploading document:', error)
      throw error
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      // Get document info first
      const { data: document, error: fetchError } = await supabase
        .from('kyc_documents')
        .select('file_path')
        .eq('id', documentId)
        .single()

      if (fetchError) throw fetchError

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('kyc-documents')
        .remove([document.file_path])

      if (storageError) throw storageError

      // Delete document record
      const { error: deleteError } = await supabase
        .from('kyc_documents')
        .delete()
        .eq('id', documentId)

      if (deleteError) throw deleteError
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  /**
   * Get document download URL
   */
  static async getDocumentUrl(filePath: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(filePath, 3600) // 1 hour expiry

      if (error) throw error

      return data.signedUrl
    } catch (error) {
      console.error('Error getting document URL:', error)
      throw error
    }
  }

  /**
   * Submit KYC application for review
   */
  static async submitKYCApplication(applicationId: string): Promise<KYCApplication> {
    try {
      // Check if all required documents are uploaded
      const { data: documents, error: documentsError } = await supabase
        .from('kyc_documents')
        .select('document_type')
        .eq('application_id', applicationId)

      if (documentsError) throw documentsError

      const requiredDocuments: DocumentType[] = ['national_id', 'proof_of_address']
      const uploadedTypes = documents.map(doc => doc.document_type)
      const missingDocuments = requiredDocuments.filter(type => !uploadedTypes.includes(type))

      if (missingDocuments.length > 0) {
        throw new Error(`Missing required documents: ${missingDocuments.join(', ')}`)
      }

      // Update application status
      return await this.updateKYCApplication(applicationId, {
        status: 'pending'
      })
    } catch (error) {
      console.error('Error submitting KYC application:', error)
      throw error
    }
  }

  /**
   * Get all KYC applications (admin function)
   */
  static async getAllKYCApplications(
    status?: 'pending' | 'verified' | 'rejected'
  ): Promise<ApiResponse<KYCApplication[]>> {
    try {
      let query = supabase
        .from('kyc_applications')
        .select(`
          *,
          documents:kyc_documents(*)
        `)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data: applications, error } = await query

      if (error) {
        throw new Error(`Failed to fetch KYC applications: ${error.message}`)
      }

      return {
        data: applications || [],
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching KYC applications:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch KYC applications',
        success: false
      }
    }
  }

  /**
   * Approve KYC application
   */
  static async approveKYCApplication(
    applicationId: string,
    tier: number = 2,
    investmentLimit: number = 50000
  ): Promise<ApiResponse<KYCApplication>> {
    try {
      const { data: application, error } = await supabase
        .from('kyc_applications')
        .update({
          status: 'verified',
          tier,
          investment_limit: investmentLimit,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to approve KYC application: ${error.message}`)
      }

      return {
        data: application,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error approving KYC application:', error)
      return {
        data: null,
        error: error.message || 'Failed to approve KYC application',
        success: false
      }
    }
  }

  /**
   * Reject KYC application
   */
  static async rejectKYCApplication(
    applicationId: string,
    rejectionReason: string
  ): Promise<ApiResponse<KYCApplication>> {
    try {
      const { data: application, error } = await supabase
        .from('kyc_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to reject KYC application: ${error.message}`)
      }

      return {
        data: application,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error rejecting KYC application:', error)
      return {
        data: null,
        error: error.message || 'Failed to reject KYC application',
        success: false
      }
    }
  }

  /**
   * Validate uploaded file
   */
  private static validateFile(file: File): void {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']

    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB')
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('File must be JPG, PNG, or PDF format')
    }
  }

  /**
   * Get KYC requirements by tier
   */
  static getKYCRequirements(tier: number) {
    const requirements = {
      1: {
        documents: ['national_id'],
        investmentLimit: 5000,
        description: 'Basic verification for small investments'
      },
      2: {
        documents: ['national_id', 'proof_of_address'],
        investmentLimit: 50000,
        description: 'Full verification for standard investments'
      },
      3: {
        documents: ['national_id', 'proof_of_address'],
        investmentLimit: 500000,
        description: 'Enhanced verification for high-value investments'
      }
    }

    return requirements[tier as keyof typeof requirements] || requirements[1]
  }

  /**
   * Get KYC statistics
   */
  static async getKYCStats(): Promise<ApiResponse<{
    totalApplications: number
    pendingApplications: number
    verifiedApplications: number
    rejectedApplications: number
  }>> {
    try {
      const { data: applications, error } = await supabase
        .from('kyc_applications')
        .select('status')

      if (error) {
        throw new Error(`Failed to fetch KYC stats: ${error.message}`)
      }

      const stats = {
        totalApplications: applications?.length || 0,
        pendingApplications: applications?.filter(app => app.status === 'pending').length || 0,
        verifiedApplications: applications?.filter(app => app.status === 'verified').length || 0,
        rejectedApplications: applications?.filter(app => app.status === 'rejected').length || 0
      }

      return {
        data: stats,
        error: null,
        success: true
      }

    } catch (error: any) {
      console.error('Error fetching KYC stats:', error)
      return {
        data: null,
        error: error.message || 'Failed to fetch KYC stats',
        success: false
      }
    }
  }
}