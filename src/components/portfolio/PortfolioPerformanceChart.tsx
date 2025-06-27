import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react'
import { PortfolioPerformanceData } from '../../types/portfolio'

interface PortfolioPerformanceChartProps {
  data: PortfolioPerformanceData[]
  isLoading?: boolean
}

export function PortfolioPerformanceChart({ data, isLoading }: PortfolioPerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<'3M' | '6M' | '1Y' | 'ALL'>('1Y')
  const [chartType, setChartType] = useState<'value' | 'performance'>('value')

  if (isLoading) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
        <div className="animate-pulse">
          <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
          Portfolio Performance
        </h3>
        <div className="text-center py-8">
          <TrendingUp className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <p className="text-secondary-600 dark:text-secondary-400">
            No performance data available yet
          </p>
        </div>
      </div>
    )
  }

  // Filter data based on time range
  const getFilteredData = () => {
    const now = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case '3M':
        startDate.setMonth(now.getMonth() - 3)
        break
      case '6M':
        startDate.setMonth(now.getMonth() - 6)
        break
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case 'ALL':
      default:
        return data
    }

    return data.filter(item => new Date(item.date) >= startDate)
  }

  const filteredData = getFilteredData()
  const latestData = filteredData[filteredData.length - 1]
  const firstData = filteredData[0]
  
  const totalReturn = latestData && firstData 
    ? latestData.totalValue - firstData.totalValue 
    : 0
  const totalReturnPercent = firstData && firstData.totalValue > 0
    ? ((latestData?.totalValue || 0) - firstData.totalValue) / firstData.totalValue * 100
    : 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 dark:bg-secondary-800/90 backdrop-blur-md rounded-lg shadow-lg p-4 border border-white/20 dark:border-secondary-700/30">
          <p className="text-sm font-medium text-secondary-900 dark:text-white mb-2">
            {formatDate(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-secondary-600 dark:text-secondary-400">
                  {entry.name}
                </span>
              </div>
              <span className="text-sm font-semibold text-secondary-900 dark:text-white">
                {entry.name.includes('%') 
                  ? `${entry.value.toFixed(2)}%`
                  : formatCurrency(entry.value)
                }
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-secondary-700/30">
      {/* Header */}
      <div className="p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Portfolio Performance
            </h3>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-secondary-500" />
                <span className="text-sm text-secondary-600 dark:text-secondary-400">
                  Total Return: 
                </span>
                <span className={`text-sm font-semibold ${
                  totalReturn >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)} ({totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {/* Chart Type Toggle */}
            <div className="flex bg-secondary-100/50 dark:bg-secondary-700/50 backdrop-blur-sm rounded-lg p-1">
              <button
                onClick={() => setChartType('value')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  chartType === 'value'
                    ? 'bg-white dark:bg-secondary-600 text-secondary-900 dark:text-white shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                }`}
              >
                Value
              </button>
              <button
                onClick={() => setChartType('performance')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  chartType === 'performance'
                    ? 'bg-white dark:bg-secondary-600 text-secondary-900 dark:text-white shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                }`}
              >
                Performance
              </button>
            </div>

            {/* Time Range Selector */}
            <div className="flex bg-secondary-100/50 dark:bg-secondary-700/50 backdrop-blur-sm rounded-lg p-1">
              {(['3M', '6M', '1Y', 'ALL'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    timeRange === range
                      ? 'bg-white dark:bg-secondary-600 text-secondary-900 dark:text-white shadow-sm'
                      : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'value' ? (
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="totalValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="investedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  stroke="#64748b"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="totalInvested"
                  stroke="#64748b"
                  strokeWidth={2}
                  fill="url(#investedGradient)"
                  name="Total Invested"
                />
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  fill="url(#totalValueGradient)"
                  name="Portfolio Value"
                />
              </AreaChart>
            ) : (
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  stroke="#64748b"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="gainLossPercent"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2 }}
                  name="Return %"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}