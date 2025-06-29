import { Link } from 'react-router-dom'
import { MapPin, TrendingUp, Users, Calendar } from 'lucide-react'
import { Property } from '../types/property'

interface PropertyCardProps {
  property: Property
}

export function PropertyCard({ property }: PropertyCardProps) {
  // Property data loaded successfully
  
  // Calculate funding progress using database fields (ensure consistent number conversion)
  const prop = property as any
  const totalTokens = parseInt(String(prop.total_tokens)) || 0
  const availableTokens = parseInt(String(prop.available_tokens)) || 0
  const tokenPrice = parseFloat(String(prop.token_price)) || 0
  const soldTokens = Math.max(0, totalTokens - availableTokens)
  const fundingProgress = totalTokens > 0 
    ? Math.round(((soldTokens / totalTokens) * 100) * 100) / 100 // Round to 2 decimal places
    : 0

  // Debug logging to track when PropertyCard renders with new data
  console.log(`🏠 PropertyCard render - ${prop.name}:`)
  console.log(`   📊 Available: ${availableTokens}/${totalTokens} tokens`)
  console.log(`   📈 Sold: ${soldTokens} tokens`)
  console.log(`   💯 Progress: ${fundingProgress}%`)
  console.log(`   🔍 Raw prop data:`, {
    available_tokens: prop.available_tokens,
    total_tokens: prop.total_tokens,
    converted_available: availableTokens,
    converted_total: totalTokens
  })

  // Extract location from address JSONB
  const getLocation = () => {
    if (prop.address && typeof prop.address === 'object') {
      const city = prop.address.city || ''
      const state = prop.address.state || ''
      return city && state ? `${city}, ${state}` : city || state || 'Location not specified'
    }
    return 'Location not specified'
  }

  // Use cover image or placeholder
  const placeholderImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
  const propertyImage = prop.cover_image_url || prop.image_url || placeholderImage

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Calculate expected yield (using a default since it's not in the schema)
  const expectedYield = property.expectedYield || 8.0 // Default yield percentage

  return (
    <div className="group bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-white/20 dark:border-secondary-700/30">
      {/* Image - Clickable to navigate to detail page */}
      <Link to={`/property/${prop.id}`} className="block aspect-video overflow-hidden">
        <img
          src={propertyImage}
          alt={prop.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </Link>

      {/* Content */}
      <div className="p-6">
        {/* Header - Title is clickable to navigate to detail page */}
        <div className="mb-4">
          <Link to={`/property/${prop.id}`}>
            <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors cursor-pointer">
              {prop.name}
            </h3>
          </Link>
          <div className="flex items-center text-secondary-600 dark:text-secondary-400">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-sm">{getLocation()}</span>
          </div>
        </div>

        {/* Property Value and Available Tokens */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">
            {formatCurrency(Number(prop.total_value) || 0)}
          </div>
          <div className="text-sm text-secondary-600 dark:text-secondary-400">
            Total Property Value
          </div>
          <div className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
            {availableTokens.toLocaleString()} tokens available
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center bg-white/20 dark:bg-secondary-700/20 backdrop-blur-sm rounded-xl p-3">
            <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
              ${tokenPrice}
            </div>
            <div className="text-xs text-secondary-500 dark:text-secondary-400">
              Per Token
            </div>
          </div>
          <div className="text-center bg-white/20 dark:bg-secondary-700/20 backdrop-blur-sm rounded-xl p-3">
            <div className="text-lg font-bold text-accent-600 dark:text-accent-400">
              {expectedYield}%
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
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-secondary-500 dark:text-secondary-400">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {soldTokens > 0 ? `${soldTokens} tokens sold` : 'No sales yet'}
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(prop.created_at).toLocaleDateString()}
            </div>
          </div>
          <Link
            to={`/property/${prop.id}`}
            className="w-full inline-flex items-center justify-center px-4 py-3 bg-primary-600/80 hover:bg-primary-700 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}