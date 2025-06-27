import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Download,
  MessageSquare,
  Shield,
  Calendar,
  Mail,
  Wallet
} from 'lucide-react'
import { AdminService } from '../../services/adminService'
import { KYCReviewItem } from '../../types/admin'

interface KYCReviewInterfaceProps {
  onStatusUpdate?: () => void
}

export function KYCReviewInterface({ onStatusUpdate }: KYCReviewInterfaceProps) {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'under_review' | 'approved' | 'rejected'>('pending')
  const [selectedApplication, setSelectedApplication] = useState<KYCReviewItem | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [selectedTier, setSelectedTier] = useState(2)

  // Fetch KYC applications
  const { data: applications, isLoading, refetch } = useQuery({
    queryKey: ['kyc-reviews', selectedStatus],
    queryFn: () => AdminService.getKYCReviews(selectedStatus === 'all' ? undefined : selectedStatus),
    select: (result) => result.success ? result.data : []
  })

  // Update KYC status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, status, notes, tier }: {
      applicationId: string
      status: 'approved' | 'rejected'
      notes?: string
      tier?: number
    }) => AdminService.updateKYCStatus(applicationId, status, notes, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-reviews'] })
      setSelectedApplication(null)
      setReviewNotes('')
      onStatusUpdate?.()
    }
  })

  const handleApprove = (applicationId: string) => {
    updateStatusMutation.mutate({
      applicationId,
      status: 'approved',
      tier: selectedTier
    })
  }

  const handleReject = (applicationId: string) => {
    if (!reviewNotes.trim()) {
      alert('Please provide a reason for rejection')
      return
    }
    
    updateStatusMutation.mutate({
      applicationId,
      status: 'rejected',
      notes: reviewNotes
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
      case 'under_review':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
      case 'approved':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
      case 'rejected':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
      default:
        return 'text-secondary-600 dark:text-secondary-400 bg-secondary-100 dark:bg-secondary-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'under_review':
        return <Eye className="h-4 w-4" />
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getRiskScoreColor = (score: number) => {
    if (score <= 30) return 'text-green-600 dark:text-green-400'
    if (score <= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
              KYC Review Center
            </h2>
            <p className="text-secondary-600 dark:text-secondary-400">
              Review and approve user identity verification applications
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              {applications?.length || 0} applications
            </span>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex space-x-2">
          {[
            { id: 'all', label: 'All Applications' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedStatus(filter.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedStatus === filter.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-600'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-secondary-700/30">
        <div className="p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
            Applications ({applications?.length || 0})
          </h3>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-secondary-600 dark:text-secondary-400">Loading applications...</p>
            </div>
          ) : applications?.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                No Applications Found
              </h4>
              <p className="text-secondary-600 dark:text-secondary-400">
                No KYC applications match the selected filter
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications?.map((application) => (
                <div
                  key={application.applicationId}
                  className="border border-secondary-200/50 dark:border-secondary-700/50 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary-100/50 dark:bg-primary-900/30 rounded-xl">
                        <User className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-secondary-900 dark:text-white">
                            {application.applicantName}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                            {getStatusIcon(application.status)}
                            <span className="ml-1 capitalize">{application.status.replace('_', ' ')}</span>
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-secondary-500" />
                            <span className="text-secondary-600 dark:text-secondary-400">
                              {application.email}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Wallet className="h-4 w-4 text-secondary-500" />
                            <span className="text-secondary-600 dark:text-secondary-400 font-mono">
                              {application.walletAddress.slice(0, 8)}...{application.walletAddress.slice(-8)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-secondary-500" />
                            <span className="text-secondary-600 dark:text-secondary-400">
                              {formatDate(application.submittedAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 mt-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-secondary-600 dark:text-secondary-400">Tier:</span>
                            <span className="font-medium text-secondary-900 dark:text-white">
                              {application.tier}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-secondary-600 dark:text-secondary-400">Documents:</span>
                            <span className="font-medium text-secondary-900 dark:text-white">
                              {application.documents.length}
                            </span>
                          </div>
                          {application.riskScore && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-secondary-600 dark:text-secondary-400">Risk Score:</span>
                              <span className={`font-medium ${getRiskScoreColor(application.riskScore)}`}>
                                {application.riskScore}/100
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Documents */}
                        <div className="mt-4">
                          <div className="flex items-center space-x-4">
                            {application.documents.map((doc, index) => (
                              <div
                                key={index}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${
                                  doc.status === 'verified' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                                  doc.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                                  'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                                }`}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {doc.type.replace('_', ' ')}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedApplication(application)}
                        className="inline-flex items-center px-3 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors text-sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-secondary-800/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/20 dark:border-secondary-700/30">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
              <div>
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">
                  KYC Application Review
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  {selectedApplication.applicantName}
                </p>
              </div>
              <button
                onClick={() => setSelectedApplication(null)}
                className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5 text-secondary-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Applicant Information */}
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-6">
                <h4 className="font-semibold text-secondary-900 dark:text-white mb-4">
                  Applicant Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Full Name:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium">
                      {selectedApplication.applicantName}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Email:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium">
                      {selectedApplication.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Wallet Address:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-mono text-xs">
                      {selectedApplication.walletAddress}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Submitted:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium">
                      {formatDate(selectedApplication.submittedAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-600 dark:text-secondary-400">Current Tier:</span>
                    <span className="ml-2 text-secondary-900 dark:text-white font-medium">
                      Tier {selectedApplication.tier}
                    </span>
                  </div>
                  {selectedApplication.riskScore && (
                    <div>
                      <span className="text-secondary-600 dark:text-secondary-400">Risk Score:</span>
                      <span className={`ml-2 font-medium ${getRiskScoreColor(selectedApplication.riskScore)}`}>
                        {selectedApplication.riskScore}/100
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-semibold text-secondary-900 dark:text-white mb-4">
                  Submitted Documents
                </h4>
                <div className="space-y-3">
                  {selectedApplication.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-secondary-50/50 dark:bg-secondary-700/30 rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
                        <div>
                          <div className="font-medium text-secondary-900 dark:text-white">
                            {doc.type.replace('_', ' ').toUpperCase()}
                          </div>
                          <div className="text-sm text-secondary-600 dark:text-secondary-400">
                            {doc.fileName} • Uploaded {formatDate(doc.uploadedAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                          {getStatusIcon(doc.status)}
                          <span className="ml-1 capitalize">{doc.status}</span>
                        </span>
                        <button
                          className="p-2 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded-lg transition-colors"
                          title="Download document"
                        >
                          <Download className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Actions */}
              {selectedApplication.status === 'pending' && (
                <div className="bg-primary-50/80 dark:bg-primary-900/20 backdrop-blur-sm rounded-xl p-6">
                  <h4 className="font-semibold text-secondary-900 dark:text-white mb-4">
                    Review Decision
                  </h4>
                  
                  {/* Tier Selection for Approval */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Approval Tier
                    </label>
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white/50 dark:bg-secondary-700/50 border border-secondary-300/50 dark:border-secondary-600/50 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value={1}>Tier 1 - Basic ($5,000 limit)</option>
                      <option value={2}>Tier 2 - Standard ($50,000 limit)</option>
                      <option value={3}>Tier 3 - Premium ($500,000 limit)</option>
                    </select>
                  </div>

                  {/* Review Notes */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Review Notes (required for rejection)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-white/50 dark:bg-secondary-700/50 border border-secondary-300/50 dark:border-secondary-600/50 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Add notes about your review decision..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleApprove(selectedApplication.applicationId)}
                      disabled={updateStatusMutation.isPending}
                      className="flex-1 bg-green-600/80 hover:bg-green-700 disabled:bg-secondary-400/50 text-white font-semibold py-3 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Approve (Tier {selectedTier})
                    </button>
                    <button
                      onClick={() => handleReject(selectedApplication.applicationId)}
                      disabled={updateStatusMutation.isPending}
                      className="flex-1 bg-red-600/80 hover:bg-red-700 disabled:bg-secondary-400/50 text-white font-semibold py-3 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Notes */}
              {selectedApplication.notes && (
                <div className="bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                        Review Notes
                      </div>
                      <div className="text-amber-700 dark:text-amber-300 text-sm">
                        {selectedApplication.notes}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}