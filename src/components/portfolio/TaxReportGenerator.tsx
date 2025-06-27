import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Calendar, DollarSign, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { PortfolioAnalyticsService } from '../../services/portfolioAnalyticsService'
import { TaxReportData } from '../../types/portfolio'

interface TaxReportGeneratorProps {
  walletAddress: string
}

export function TaxReportGenerator({ walletAddress }: TaxReportGeneratorProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isGenerating, setIsGenerating] = useState(false)

  // Get available years (last 5 years)
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Fetch tax report data
  const { data: taxReport, isLoading, refetch } = useQuery({
    queryKey: ['tax-report', walletAddress, selectedYear],
    queryFn: () => PortfolioAnalyticsService.generateTaxReport(walletAddress, selectedYear),
    select: (result) => result.success ? result.data : null,
    enabled: !!walletAddress
  })

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      await refetch()
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportCSV = () => {
    if (taxReport) {
      PortfolioAnalyticsService.exportTaxReportCSV(taxReport)
    }
  }

  const handleExportPDF = () => {
    // In a real implementation, this would generate a PDF report
    alert('PDF export functionality would be implemented here')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-secondary-700/30">
      {/* Header */}
      <div className="p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Tax Report Generator
            </h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
              Generate comprehensive tax reports for your real estate investments
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <button
              onClick={handleGenerateReport}
              disabled={isLoading || isGenerating}
              className="inline-flex items-center px-4 py-2 bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {(isLoading || isGenerating) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading || isGenerating ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-secondary-600 dark:text-secondary-400">
              Generating tax report for {selectedYear}...
            </p>
          </div>
        ) : !taxReport ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
              No Tax Report Generated
            </h4>
            <p className="text-secondary-600 dark:text-secondary-400 mb-4">
              Click "Generate Report" to create a tax report for {selectedYear}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {formatCurrency(taxReport.summary.totalDividends)}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Total Dividends
                </div>
              </div>
              
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${
                  taxReport.summary.shortTermGains >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(taxReport.summary.shortTermGains)}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Short-term Gains
                </div>
              </div>
              
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${
                  taxReport.summary.longTermGains >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(taxReport.summary.longTermGains)}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Long-term Gains
                </div>
              </div>
              
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {formatCurrency(taxReport.summary.totalFees)}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Total Fees
                </div>
              </div>
            </div>

            {/* Export Options */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={handleExportCSV}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-green-600/80 hover:bg-green-700 backdrop-blur-sm text-white font-medium rounded-xl transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              
              <button
                onClick={handleExportPDF}
                className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-blue-600/80 hover:bg-blue-700 backdrop-blur-sm text-white font-medium rounded-xl transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </button>
            </div>

            {/* Transaction Details */}
            <div>
              <h4 className="text-md font-semibold text-secondary-900 dark:text-white mb-4">
                Transaction Details ({taxReport.transactions.length} transactions)
              </h4>
              
              {taxReport.transactions.length === 0 ? (
                <div className="text-center py-8 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-xl">
                  <Calendar className="h-8 w-8 text-secondary-400 mx-auto mb-2" />
                  <p className="text-secondary-600 dark:text-secondary-400">
                    No transactions found for {selectedYear}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {taxReport.transactions.map((transaction, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-secondary-900 dark:text-white">
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </span>
                          {transaction.tokenAmount && (
                            <span className="text-sm text-secondary-600 dark:text-secondary-400">
                              ({transaction.tokenAmount} tokens)
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-secondary-600 dark:text-secondary-400 truncate">
                          {transaction.property} • {formatDate(transaction.date)}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-semibold text-secondary-900 dark:text-white">
                          {formatCurrency(transaction.amount)}
                        </div>
                        {transaction.gainLoss !== undefined && (
                          <div className={`text-sm ${
                            transaction.gainLoss >= 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {transaction.gainLoss >= 0 ? '+' : ''}{formatCurrency(transaction.gainLoss)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tax Disclaimer */}
            <div className="bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Tax Disclaimer</p>
                  <p>
                    This report is for informational purposes only and should not be considered as tax advice. 
                    Please consult with a qualified tax professional for guidance on your specific tax situation. 
                    Cryptocurrency and tokenized asset transactions may have complex tax implications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}