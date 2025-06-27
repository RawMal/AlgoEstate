export interface Property {
  id: string
  title: string
  description: string
  location: string
  image: string
  totalValue: number
  tokenPrice: number
  totalTokens: number
  availableTokens: number
  minInvestment: number
  expectedYield: number
  listingDate: string
  propertyType: 'residential' | 'commercial' | 'mixed'
  status: 'active' | 'funded' | 'coming_soon'
}