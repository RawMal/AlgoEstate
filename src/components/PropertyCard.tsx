import { Link } from 'react-router-dom'
import { MapPin, TrendingUp, Users, Calendar } from 'lucide-react'
import { Property } from '../types/property'

interface PropertyCardProps {
  property: Property
  onInvestClick: (property: Property) => void
}

export function PropertyCard({ property, onInvestClick }: PropertyCardProps) {
  const fundingProgress = ((property.totalTokens - property.availableTokens) / property.totalTokens) * 100

  return (
    <div className="group bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-white/20 dark:border-secondary-700/30">
      {/* Image - Clickable to navigate to detail page */}
      <Link to={`/property/${property.id}`} className="block aspect-video overflow-hidden">
        <img
          src={property.image}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </Link>

      {/* Content */}
      <div className="p-6">
        {/* Header - Title is clickable to navigate to detail page */}
        <div className="mb-4">
          <Link to={`/property/${property.id}`}>
            <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors cursor-pointer">
              {property.title}
            </h3>
          </Link>
          <div className="flex items-center text-secondary-600 dark:text-secondary-400">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-sm">{property.location}</span>
          </div>
        </div>

        {/* Property Value and Available Tokens */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">
            ${property.totalValue.toLocaleString()}
          </div>
          <div className="text-sm text-secondary-600 dark:text-secondary-400">
            Total Property Value
          </div>
          <div className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
            {property.availableTokens.toLocaleString()} tokens available
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center bg-white/20 dark:bg-secondary-700/20 backdrop-blur-sm rounded-xl p-3">
            <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
              ${property.tokenPrice}
            </div>
            <div className="text-xs text-secondary-500 dark:text-secondary-400">
              Per Token
            </div>
          </div>
          <div className="text-center bg-white/20 dark:bg-secondary-700/20 backdrop-blur-sm rounded-xl p-3">
            <div className="text-lg font-bold text-accent-600 dark:text-accent-400">
              {property.expectedYield}%
            </div>
            <div className="text-xs text-secondary-500 dark:text-secondary-400">
              Expected Yield
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-secondary-600 dark:text-secondary-400">Funding Progress</span>
            <span className="text-secondary-900 dark:text-white font-medium">
              {Math.round(fundingProgress)}%
            </span>
          </div>
          <div className="w-full bg-secondary-200/50 dark:bg-secondary-700/50 backdrop-blur-sm rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${fundingProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-secondary-500 dark:text-secondary-400">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {property.totalTokens - property.availableTokens}
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {property.listingDate}
            </div>
          </div>
          <div className="flex space-x-2">
            <Link
              to={`/property/${property.id}`}
              className="inline-flex items-center px-3 py-2 bg-secondary-600/80 hover:bg-secondary-700 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              View Details
            </Link>
            <button
              onClick={() => onInvestClick(property)}
              className="inline-flex items-center px-4 py-2 bg-primary-600/80 hover:bg-primary-700 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Invest Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}