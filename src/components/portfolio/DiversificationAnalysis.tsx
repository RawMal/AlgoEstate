import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Building2, MapPin, TrendingUp, PieChart as PieChartIcon } from 'lucide-react'
import { DiversificationData } from '../../types/portfolio'

interface DiversificationAnalysisProps {
  data: DiversificationData
  isLoading?: boolean
}

const COLORS = ['#0ea5e9', '#eab308', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

export function DiversificationAnalysis({ data, isLoading }: DiversificationAnalysisProps) {
  if (isLoading) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
        <div className="animate-pulse">
          <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
            <div className="h-64 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/90 dark:bg-secondary-800/90 backdrop-blur-md rounded-lg shadow-lg p-4 border border-white/20 dark:border-secondary-700/30">
          <p className="text-sm font-medium text-secondary-900 dark:text-white mb-2">
            {data.type || data.location || data.range}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between space-x-4">
              <span className="text-sm text-secondary-600 dark:text-secondary-400">Value:</span>
              <span className="text-sm font-semibold text-secondary-900 dark:text-white">
                {formatCurrency(data.value)}
              </span>
            </div>
            <div className="flex justify-between space-x-4">
              <span className="text-sm text-secondary-600 dark:text-secondary-400">Percentage:</span>
              <span className="text-sm font-semibold text-secondary-900 dark:text-white">
                {data.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between space-x-4">
              <span className="text-sm text-secondary-600 dark:text-secondary-400">Properties:</span>
              <span className="text-sm font-semibold text-secondary-900 dark:text-white">
                {data.count}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/90 dark:bg-secondary-800/90 backdrop-blur-md rounded-lg shadow-lg p-3 border border-white/20 dark:border-secondary-700/30">
          <p className="text-sm font-medium text-secondary-900 dark:text-white">
            {data.type || data.location || data.range}
          </p>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      )
    }
    return null
  }

  // Calculate diversification score
  const calculateDiversificationScore = () => {
    // Simple diversification score based on distribution evenness
    const typeDistribution = data.byPropertyType.map(item => item.percentage)
    const locationDistribution = data.byLocation.map(item => item.percentage)
    
    // Calculate Herfindahl-Hirschman Index (lower is more diversified)
    const typeHHI = typeDistribution.reduce((sum, pct) => sum + Math.pow(pct, 2), 0)
    const locationHHI = locationDistribution.reduce((sum, pct) => sum + Math.pow(pct, 2), 0)
    
    // Convert to diversification score (0-100, higher is better)
    const typeScore = Math.max(0, 100 - (typeHHI / 100))
    const locationScore = Math.max(0, 100 - (locationHHI / 100))
    
    return Math.round((typeScore + locationScore) / 2)
  }

  const diversificationScore = calculateDiversificationScore()

  return (
    <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-secondary-700/30">
      {/* Header */}
      <div className="p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Portfolio Diversification
            </h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
              Analysis of your investment distribution
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {diversificationScore}
            </div>
            <div className="text-xs text-secondary-600 dark:text-secondary-400">
              Diversification Score
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Property Type Distribution */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h4 className="text-md font-semibold text-secondary-900 dark:text-white">
              By Property Type
            </h4>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byPropertyType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.byPropertyType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend and Details */}
            <div className="space-y-3">
              {data.byPropertyType.map((item, index) => (
                <div key={item.type} className="flex items-center justify-between p-3 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <div className="font-medium text-secondary-900 dark:text-white">
                        {item.type}
                      </div>
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">
                        {item.count} {item.count === 1 ? 'property' : 'properties'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-secondary-900 dark:text-white">
                      {item.percentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      {formatCurrency(item.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h4 className="text-md font-semibold text-secondary-900 dark:text-white">
              By Location
            </h4>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byLocation} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis 
                  dataKey="location" 
                  stroke="#64748b"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  stroke="#64748b"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Investment Size Distribution */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h4 className="text-md font-semibold text-secondary-900 dark:text-white">
              By Investment Size
            </h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.byPropertySize.map((item, index) => (
              <div key={item.range} className="bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-lg font-bold text-secondary-900 dark:text-white mb-1">
                  {item.percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400 mb-2">
                  {item.range}
                </div>
                <div className="text-xs text-secondary-500 dark:text-secondary-400">
                  {formatCurrency(item.value)} • {item.count} {item.count === 1 ? 'property' : 'properties'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diversification Insights */}
        <div className="mt-8 p-4 bg-primary-50/80 dark:bg-primary-900/20 backdrop-blur-sm rounded-xl">
          <div className="flex items-start space-x-3">
            <PieChartIcon className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5" />
            <div>
              <h5 className="font-medium text-primary-800 dark:text-primary-200 mb-2">
                Diversification Insights
              </h5>
              <div className="text-sm text-primary-700 dark:text-primary-300 space-y-1">
                {diversificationScore >= 80 && (
                  <p>✅ Excellent diversification across property types and locations</p>
                )}
                {diversificationScore >= 60 && diversificationScore < 80 && (
                  <p>⚠️ Good diversification, consider expanding to new markets or property types</p>
                )}
                {diversificationScore < 60 && (
                  <p>🔄 Consider diversifying across more property types and geographic locations</p>
                )}
                <p>
                  Your portfolio spans {data.byPropertyType.length} property types across {data.byLocation.length} locations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}