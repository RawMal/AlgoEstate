import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { MapPin, Calendar, TrendingUp, Users, Shield, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { InvestmentModal } from '../components/InvestmentModal'
import { mockProperties } from '../services/propertyService'

export function PropertyDetailPage() {
  const { id } = useParams()
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)
  
  const property = mockProperties.find(p => p.id === id)

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-4">
            Property not found
          </h2>
          <Link
            to="/properties"
            className="inline-flex items-center text-primary-600 hover:text-primary-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Link>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Token Price', value: `$${property.tokenPrice}`, icon: TrendingUp },
    { label: 'Total Tokens', value: property.totalTokens.toLocaleString(), icon: Users },
    { label: 'Available', value: property.availableTokens.toLocaleString(), icon: Shield },
    { label: 'Expected Yield', value: `${property.expectedYield}%`, icon: Calendar },
  ]

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          to="/properties"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Properties
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="aspect-video rounded-2xl overflow-hidden shadow-xl mb-8">
              <img
                src={property.image}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Property Info */}
            <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 mb-8 border border-white/20 dark:border-secondary-700/30">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-display font-bold text-secondary-900 dark:text-white mb-2">
                    {property.title}
                  </h1>
                  <div className="flex items-center text-secondary-600 dark:text-secondary-400">
                    <MapPin className="h-5 w-5 mr-2" />
                    {property.location}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    ${property.totalValue.toLocaleString()}
                  </div>
                  <div className="text-sm text-secondary-600 dark:text-secondary-400">
                    Total Value
                  </div>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none">
                <p className="text-secondary-600 dark:text-secondary-300 leading-relaxed">
                  {property.description}
                </p>
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 border border-white/20 dark:border-secondary-700/30">
              <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white mb-6">
                Property Details
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="p-3 bg-primary-100/50 dark:bg-primary-900/30 backdrop-blur-sm rounded-xl w-fit mx-auto mb-3">
                      <stat.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="text-lg font-semibold text-secondary-900 dark:text-white">
                      {stat.value}
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Investment Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-8 border border-white/20 dark:border-secondary-700/30">
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-6">
                  Investment Summary
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Token Price</span>
                    <span className="font-semibold text-secondary-900 dark:text-white">
                      ${property.tokenPrice}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Min Investment</span>
                    <span className="font-semibold text-secondary-900 dark:text-white">
                      ${property.minInvestment}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600 dark:text-secondary-400">Expected Yield</span>
                    <span className="font-semibold text-accent-600 dark:text-accent-400">
                      {property.expectedYield}% APY
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-secondary-600 dark:text-secondary-400">Funding Progress</span>
                    <span className="text-secondary-900 dark:text-white font-medium">
                      {Math.round(((property.totalTokens - property.availableTokens) / property.totalTokens) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary-200/50 dark:bg-secondary-700/50 backdrop-blur-sm rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-accent-500 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${((property.totalTokens - property.availableTokens) / property.totalTokens) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>

                <button
                  onClick={() => setShowInvestmentModal(true)}
                  className="w-full bg-primary-600/80 hover:bg-primary-700 backdrop-blur-sm text-white font-semibold py-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl mb-4"
                >
                  Invest Now
                </button>

                <Link
                  to="/properties"
                  className="w-full inline-flex items-center justify-center bg-secondary-600/80 hover:bg-secondary-700 backdrop-blur-sm text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm"
                >
                  View All Properties
                </Link>

                <div className="mt-4 text-xs text-secondary-500 dark:text-secondary-400 text-center">
                  * Investment subject to KYC verification
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Modal */}
      {showInvestmentModal && (
        <InvestmentModal
          property={property}
          onClose={() => setShowInvestmentModal(false)}
        />
      )}
    </div>
  )
}