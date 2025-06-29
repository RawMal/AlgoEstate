import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Calendar, DollarSign, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { PortfolioAnalyticsService } from '../../services/portfolioAnalyticsService'
import { TaxReportData } from '../../types/portfolio'
import jsPDF from 'jspdf'

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
    if (!taxReport) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 20
    let yPosition = margin

    // Helper function to add text with word wrapping
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      const fontSize = options.fontSize || 10
      const maxWidth = options.maxWidth || pageWidth - 2 * margin
      const align = options.align || 'left'
      
      doc.setFontSize(fontSize)
      if (options.bold) doc.setFont('helvetica', 'bold')
      else doc.setFont('helvetica', 'normal')
      
      const lines = doc.splitTextToSize(text, maxWidth)
      lines.forEach((line: string, index: number) => {
        if (y + (index * fontSize * 0.5) > pageHeight - margin) {
          doc.addPage()
          y = margin
        }
        doc.text(line, x, y + (index * fontSize * 0.5), { align })
      })
      
      return y + (lines.length * fontSize * 0.5)
    }

    // Add header with logo area and title
    doc.setFillColor(59, 130, 246) // Blue color
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    yPosition = addText('AlgoEstate', margin, 25, { fontSize: 24, bold: true })
    doc.setFontSize(12)
    doc.text('Real Estate Investment Platform', pageWidth - margin, 25, { align: 'right' })

    // Reset text color and add title
    doc.setTextColor(0, 0, 0)
    yPosition = 60
    yPosition = addText(`Tax Report for ${taxReport.year}`, margin, yPosition, { fontSize: 18, bold: true })
    yPosition += 10

    // Add generation date
    const generationDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    yPosition = addText(`Generated on: ${generationDate}`, margin, yPosition, { fontSize: 10 })
    yPosition = addText(`Wallet Address: ${walletAddress}`, margin, yPosition, { fontSize: 10 })
    yPosition += 15

    // Add summary section with colored boxes
    yPosition = addText('SUMMARY', margin, yPosition, { fontSize: 14, bold: true })
    yPosition += 10

    // Create summary cards
    const cardWidth = (pageWidth - 3 * margin) / 2
    const cardHeight = 35

    // Total Dividends Card
    doc.setFillColor(240, 245, 255)
    doc.rect(margin, yPosition, cardWidth, cardHeight, 'F')
    doc.setDrawColor(59, 130, 246)
    doc.rect(margin, yPosition, cardWidth, cardHeight, 'S')
    
    doc.setFontSize(10)
    doc.setTextColor(75, 85, 99)
    doc.text('Total Dividends', margin + 5, yPosition + 10)
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(taxReport.summary.totalDividends), margin + 5, yPosition + 25)

    // Cost Basis Card
    doc.setFillColor(240, 245, 255)
    doc.rect(margin + cardWidth + 10, yPosition, cardWidth, cardHeight, 'F')
    doc.setDrawColor(59, 130, 246)
    doc.rect(margin + cardWidth + 10, yPosition, cardWidth, cardHeight, 'S')
    
    doc.setFontSize(10)
    doc.setTextColor(75, 85, 99)
    doc.text('Cost Basis', margin + cardWidth + 15, yPosition + 10)
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text(formatCurrency(taxReport.summary.costBasis), margin + cardWidth + 15, yPosition + 25)

    yPosition += cardHeight + 10

    // Total Profit Card (Green)
    doc.setFillColor(240, 253, 244)
    doc.rect(margin, yPosition, cardWidth, cardHeight, 'F')
    doc.setDrawColor(34, 197, 94)
    doc.rect(margin, yPosition, cardWidth, cardHeight, 'S')
    
    doc.setFontSize(10)
    doc.setTextColor(75, 85, 99)
    doc.text('Total Profit', margin + 5, yPosition + 10)
    doc.setFontSize(16)
    doc.setTextColor(21, 128, 61)
    doc.text(formatCurrency(taxReport.summary.totalProfit), margin + 5, yPosition + 25)

    // Total Loss Card (Red)
    doc.setFillColor(254, 242, 242)
    doc.rect(margin + cardWidth + 10, yPosition, cardWidth, cardHeight, 'F')
    doc.setDrawColor(239, 68, 68)
    doc.rect(margin + cardWidth + 10, yPosition, cardWidth, cardHeight, 'S')
    
    doc.setFontSize(10)
    doc.setTextColor(75, 85, 99)
    doc.text('Total Loss', margin + cardWidth + 15, yPosition + 10)
    doc.setFontSize(16)
    doc.setTextColor(185, 28, 28)
    doc.text(formatCurrency(taxReport.summary.totalLoss), margin + cardWidth + 15, yPosition + 25)

    yPosition += cardHeight + 20

    // Transaction Details Section
    if (taxReport.transactions.length > 0) {
      yPosition = addText('TRANSACTION DETAILS', margin, yPosition, { fontSize: 14, bold: true })
      yPosition += 10

      // Table headers
      doc.setFillColor(249, 250, 251)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'F')
      doc.setDrawColor(229, 231, 235)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'S')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(55, 65, 81)
      
      const headers = ['Date', 'Type', 'Property', 'Amount', 'Gain', 'Loss']
      const colWidths = [25, 20, 50, 25, 25, 25]
      let xPos = margin + 2

      headers.forEach((header, index) => {
        doc.text(header, xPos, yPosition + 10)
        xPos += colWidths[index]
      })

      yPosition += 15

      // Transaction rows
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)

      taxReport.transactions.slice(0, 15).forEach((tx, index) => {
        if (yPosition > pageHeight - 50) {
          doc.addPage()
          yPosition = margin + 20
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(249, 250, 251)
          doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F')
        }

        doc.setTextColor(0, 0, 0)
        xPos = margin + 2

        // Date
        doc.text(tx.date, xPos, yPosition + 8)
        xPos += colWidths[0]

        // Type
        doc.text(tx.type.charAt(0).toUpperCase() + tx.type.slice(1), xPos, yPosition + 8)
        xPos += colWidths[1]

        // Property (truncated if too long)
        const propertyName = tx.property.length > 20 ? tx.property.substring(0, 17) + '...' : tx.property
        doc.text(propertyName, xPos, yPosition + 8)
        xPos += colWidths[2]

        // Amount
        doc.text(formatCurrency(tx.amount), xPos, yPosition + 8)
        xPos += colWidths[3]

        // Gain (green if positive)
        if (tx.gainLoss && tx.gainLoss >= 0) {
          doc.setTextColor(21, 128, 61)
          doc.text(formatCurrency(tx.gainLoss), xPos, yPosition + 8)
        }
        xPos += colWidths[4]

        // Loss (red if negative)
        if (tx.gainLoss && tx.gainLoss < 0) {
          doc.setTextColor(185, 28, 28)
          doc.text(formatCurrency(Math.abs(tx.gainLoss)), xPos, yPosition + 8)
        }

        doc.setTextColor(0, 0, 0)
        yPosition += 12
      })

      if (taxReport.transactions.length > 15) {
        yPosition += 5
        doc.setFontSize(9)
        doc.setTextColor(107, 114, 128)
        doc.text(`... and ${taxReport.transactions.length - 15} more transactions`, margin, yPosition)
      }
    }

    // Add footer with disclaimer
    const footerY = pageHeight - 40
    doc.setFillColor(249, 250, 251)
    doc.rect(0, footerY, pageWidth, 40, 'F')
    
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.setFont('helvetica', 'bold')
    doc.text('IMPORTANT DISCLAIMER', margin, footerY + 10)
    doc.setFont('helvetica', 'normal')
    
    const disclaimer = 'This report is for informational purposes only and should not be considered as tax advice. Please consult with a qualified tax professional for guidance on your specific tax situation. Cryptocurrency and tokenized asset transactions may have complex tax implications.'
    const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin)
    
    disclaimerLines.forEach((line: string, index: number) => {
      doc.text(line, margin, footerY + 18 + (index * 4))
    })

    // Save the PDF
    const filename = `tax-report-${taxReport.year}-${walletAddress.substring(0, 8)}.pdf`
    doc.save(filename)
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
                <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {formatCurrency(taxReport.summary.costBasis)}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Cost Basis
                </div>
              </div>
              
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(taxReport.summary.totalProfit)}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Total Profit
                </div>
              </div>
              
              <div className="bg-secondary-50/80 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(taxReport.summary.totalLoss)}
                </div>
                <div className="text-sm text-secondary-600 dark:text-secondary-400">
                  Total Loss
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