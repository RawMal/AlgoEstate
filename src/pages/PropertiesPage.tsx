import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PropertyListing } from '../components/PropertyListing'
import { InvestmentModal } from '../components/InvestmentModal'
import { Search, Filter, MapPin, DollarSign } from 'lucide-react'
import { fetchProperties } from '../services/propertyService'
import { Property } from '../types/property'

export function PropertiesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  const { data: properties = [], isLoading, error } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  })

  const locations = ['All Locations', 'New York', 'Los Angeles', 'Miami', 'Chicago', 'Austin', 'Seattle']
  const priceRanges = ['All Prices', '$0 - $500', '$500 - $1,000', '$1,000 - $2,500', '$2,500+']

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocation = !selectedLocation || selectedLocation === 'All Locations' || 
                           property.location.includes(selectedLocation)
    
    let matchesPrice = true
    if (priceRange && priceRange !== 'All Prices') {
      const tokenPrice = property.tokenPrice
      switch (priceRange) {
        case '$0 - $500':
          matchesPrice = tokenPrice <= 500
          break
        case '$500 - $1,000':
          matchesPrice = tokenPrice > 500 && tokenPrice <= 1000
          break
        case '$1,000 - $2,500':
          matchesPrice = tokenPrice > 1000 && tokenPrice <= 2500
          break
        case '$2,500+':
          matchesPrice = tokenPrice > 2500
          break
      }
    }
    
    return matchesSearch && matchesLocation && matchesPrice
  })

  // Sort properties
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.tokenPrice - b.tokenPrice
      case 'price-high':
        return b.tokenPrice - a.tokenPrice
      case 'yield':
        return b.expectedYield - a.expectedYield
      case 'newest':
      default:
        return new Date(b.listingDate).getTime() - new Date(a.listingDate).getTime()
    }
  })

  const handleInvestClick = (property: Property) => {
    setSelectedProperty(property)
    setShowInvestmentModal(true)
  }

  const handleCloseModal = () => {
    setShowInvestmentModal(false)
    setSelectedProperty(null)
  }

  if (error) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
              Error loading properties
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400">
              Please try again later
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-secondary-900 dark:text-white mb-4">
            Investment Properties
          </h1>
          <p className="text-lg text-secondary-600 dark:text-secondary-300">
            Discover premium tokenized real estate opportunities
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 mb-8 border border-white/20 dark:border-secondary-700/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/20 dark:bg-secondary-700/20 backdrop-blur-sm border border-white/30 dark:border-secondary-600/30 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-secondary-500 dark:placeholder-secondary-400"
              />
            </div>

            {/* Location Filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/20 dark:bg-secondary-700/20 backdrop-blur-sm border border-white/30 dark:border-secondary-600/30 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none text-secondary-900 dark:text-white"
              >
                {locations.map(location => (
                  <option key={location} value={location} className="bg-white dark:bg-secondary-800">
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/20 dark:bg-secondary-700/20 backdrop-blur-sm border border-white/30 dark:border-secondary-600/30 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none text-secondary-900 dark:text-white"
              >
                {priceRanges.map(range => (
                  <option key={range} value={range} className="bg-white dark:bg-secondary-800">
                    {range}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/20 dark:bg-secondary-700/20 backdrop-blur-sm border border-white/30 dark:border-secondary-600/30 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none text-secondary-900 dark:text-white"
              >
                <option value="newest" className="bg-white dark:bg-secondary-800">Newest First</option>
                <option value="price-low" className="bg-white dark:bg-secondary-800">Price: Low to High</option>
                <option value="price-high" className="bg-white dark:bg-secondary-800">Price: High to Low</option>
                <option value="yield" className="bg-white dark:bg-secondary-800">Highest Yield</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-secondary-600 dark:text-secondary-400">
            {isLoading ? 'Loading properties...' : `Showing ${sortedProperties.length} properties`}
          </p>
        </div>

        {/* Properties Grid */}
        <PropertyListing 
          properties={sortedProperties}
          onInvestClick={handleInvestClick}
          isLoading={isLoading}
        />

        {/* Investment Modal */}
        {showInvestmentModal && selectedProperty && (
          <InvestmentModal
            property={selectedProperty}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  )
}