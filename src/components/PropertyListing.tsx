import { Property } from '../types/property'
import { PropertyCard } from './PropertyCard'

interface PropertyListingProps {
  properties: Property[]
  onInvestClick: (property: Property) => void
  isLoading?: boolean
}

export function PropertyListing({ properties, onInvestClick, isLoading }: PropertyListingProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className="animate-pulse bg-white/20 dark:bg-secondary-800/20 backdrop-blur-md rounded-2xl shadow-lg h-96"
          >
            <div className="aspect-video bg-secondary-200 dark:bg-secondary-700 rounded-t-2xl"></div>
            <div className="p-6 space-y-4">
              <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
              <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-12 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
                <div className="h-12 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
              </div>
              <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
              <div className="h-10 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🏠</div>
        <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
          No properties found
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400">
          Try adjusting your search criteria
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {properties.map((property, index) => (
        <div
          key={property.id}
          className="animate-slide-up"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <PropertyCard 
            property={property} 
            onInvestClick={onInvestClick}
          />
        </div>
      ))}
    </div>
  )
}