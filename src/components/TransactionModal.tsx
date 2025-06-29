import { useState, useEffect } from 'react'
import { X, ExternalLink, Download, Filter, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Gift, CreditCard } from 'lucide-react'
import { PortfolioTransaction } from '../types/portfolio'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: PortfolioTransaction[]
  isLoading?: boolean
}

export function TransactionModal({ isOpen, onClose, transactions, isLoading }: TransactionModalProps) {
  const [filter, setFilter] = useState<'all' | 'purchase' | 'sale' | 'dividend' | 'fee'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(tx => filter === 'all' || tx.type === filter)
    .sort((a, b) => {
      const aValue = sortBy === 'date' ? new Date(a.timestamp).getTime() : a.amount
      const bValue = sortBy === 'date' ? new Date(b.timestamp).getTime() : b.amount
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const getTransactionIcon = (type: PortfolioTransaction['type']) => {
    switch (type) {
      case 'purchase':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />
      case 'sale':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />
      case 'dividend':
        return <Gift className="h-4 w-4 text-green-500" />
      case 'fee':
        return <CreditCard className="h-4 w-4 text-orange-500" />
      default:
        return <DollarSign className="h-4 w-4 text-secondary-500" />
    }
  }

  const getTransactionColor = (type: PortfolioTransaction['type']) => {
    switch (type) {
      case 'purchase':
      case 'fee':
        return 'text-red-600 dark:text-red-400'
      case 'sale':
      case 'dividend':
        return 'text-green-600 dark:text-green-400'
      default:
        return 'text-secondary-600 dark:text-secondary-400'
    }
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportTransactions = () => {
    const headers = [
      'Date',
      'Type',
      'Property',
      'Amount',
      'Token Amount',
      'Gain/Loss',
      'Status',
      'Transaction ID'
    ]

    const rows = filteredTransactions.map(tx => [
      formatDate(tx.timestamp),
      tx.type,
      tx.propertyTitle,
      formatCurrency(tx.amount),
      tx.tokenAmount?.toString() || '',
      tx.gainLoss ? formatCurrency(tx.gainLoss) : '',
      tx.status,
      tx.txId
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transaction-history.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="relative w-full max-w-6xl max-h-[90vh] bg-white/95 dark:bg-secondary-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 dark:border-secondary-700/30 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-secondary-200/50 dark:border-secondary-700/50 flex-shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
                All Transactions
              </h2>
              <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                {filteredTransactions.length} transactions found
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-700/50 rounded-xl transition-colors"
            >
              <X className="h-6 w-6 text-secondary-600 dark:text-secondary-400" />
            </button>
          </div>

          {/* Controls */}
          <div className="p-6 border-b border-secondary-200/50 dark:border-secondary-700/50 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                {/* Filter */}
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-4 py-2 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="purchase">Purchases</option>
                  <option value="sale">Sales</option>
                  <option value="dividend">Dividends</option>
                  <option value="fee">Fees</option>
                </select>

                {/* Sort */}
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split('-')
                    setSortBy(by as any)
                    setSortOrder(order as any)
                  }}
                  className="px-4 py-2 bg-white/70 dark:bg-secondary-700/70 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="amount-desc">Highest Amount</option>
                  <option value="amount-asc">Lowest Amount</option>
                </select>
              </div>

              {/* Export */}
              <button
                onClick={exportTransactions}
                disabled={filteredTransactions.length === 0}
                className="inline-flex items-center px-4 py-2 bg-primary-600/80 hover:bg-primary-700 disabled:bg-secondary-400/50 backdrop-blur-sm text-white text-sm font-medium rounded-xl transition-colors disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Transactions List - Scrollable */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-secondary-100/50 dark:bg-secondary-700/50 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-secondary-200 dark:bg-secondary-600 rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-secondary-200 dark:bg-secondary-600 rounded"></div>
                          <div className="h-3 w-24 bg-secondary-200 dark:bg-secondary-600 rounded"></div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="h-4 w-20 bg-secondary-200 dark:bg-secondary-600 rounded"></div>
                        <div className="h-3 w-16 bg-secondary-200 dark:bg-secondary-600 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <DollarSign className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                    No Transactions Found
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    {filter === 'all' 
                      ? 'No transactions in your portfolio yet'
                      : `No ${filter} transactions found`
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6 space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm rounded-xl hover:bg-white/70 dark:hover:bg-secondary-600/50 transition-colors border border-white/20 dark:border-secondary-600/20"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/70 dark:bg-secondary-600/70 backdrop-blur-sm rounded-xl">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-secondary-900 dark:text-white">
                            {transaction.type === 'purchase' && 'Bought'}
                            {transaction.type === 'sale' && 'Sold'}
                            {transaction.type === 'dividend' && 'Dividend'}
                            {transaction.type === 'fee' && 'Fee'}
                            {transaction.tokenAmount && ` ${transaction.tokenAmount} tokens`}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            transaction.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                            transaction.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                            'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                        
                        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 space-y-1 lg:space-y-0 text-sm text-secondary-600 dark:text-secondary-400">
                          <span className="font-medium truncate max-w-xs">{transaction.propertyTitle}</span>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(transaction.timestamp)}</span>
                          </div>
                          {transaction.blockNumber && (
                            <span className="text-xs">Block {transaction.blockNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getTransactionColor(transaction.type)}`}>
                          {(transaction.type === 'purchase' || transaction.type === 'fee') ? '-' : '+'}
                          {formatCurrency(transaction.amount)}
                        </div>
                        {transaction.gainLoss !== undefined && (
                          <div className={`text-sm ${transaction.gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {transaction.gainLoss >= 0 ? '+' : ''}{formatCurrency(transaction.gainLoss)}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => window.open(transaction.algoExplorerUrl, '_blank')}
                        className="p-2 hover:bg-secondary-100/50 dark:hover:bg-secondary-600/50 rounded-lg transition-colors"
                        title="View on AlgoExplorer"
                      >
                        <ExternalLink className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}