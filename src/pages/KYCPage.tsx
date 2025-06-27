import { KYCUpload } from '../components/KYCUpload'

export function KYCPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-secondary-900 dark:text-white mb-4">
            KYC Verification
          </h1>
          <p className="text-lg text-secondary-600 dark:text-secondary-300">
            Complete your identity verification to start investing
          </p>
        </div>
        
        <KYCUpload />
      </div>
    </div>
  )
}