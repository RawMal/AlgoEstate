import { useState } from 'react'
import { ExternalLink, Download, Filter, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Gift, CreditCard } from 'lucide-react'
import { PortfolioTransaction } from '../../types/portfolio'

interface TransactionHistoryProps {
  transactions: PortfolioTransaction[]
  isLoading?: boolean
}

export function TransactionHistory({ transactions, isLoading }: TransactionHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'purchase' | 'sale' | 'dividend' | 'fee'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  if (isLoading) {
    return (
      <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20 dark:border-secondary-700/30">
        <div className="animate-pulse">
          <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

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
      'Status',
      'Transaction ID'
    ]

    const rows = filteredTransactions.map(tx => [
      formatDate(tx.timestamp),
      tx.type,
      tx.propertyTitle,
      formatCurrency(tx.amount),
      tx.tokenAmount?.toString() || '',
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
    <div className="bg-white/30 dark:bg-secondary-800/30 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-secondary-700/30">
      {/* Header */}
      <div className="p-6 border-b border-secondary-200/50 dark:border-secondary-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Transaction History
            </h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
              {filteredTransactions.length} transactions
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              className="px-3 py-2 bg-white/50 dark:bg-secondary-700/50 backdrop-blur-sm border border-secondary-300/50 dark:border-secondary-600/50 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>

            {/* Export */}
            <button
              onClick={exportTransactions}
              className="inline-flex items-center px-3 py-2 bg-primary-600/80 hover:bg-primary-700 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="p-6">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
              No Transactions Found
            </h4>
            <p className="text-secondary-600 dark:text-secondary-400">
              {filter === 'all' 
                ? 'No transactions in your portfolio yet'
                : `No ${filter} transactions found`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-secondary-50/50 dark:bg-secondary-700/30 backdrop-blur-sm rounded-xl hover:bg-secondary-100/50 dark:hover:bg-secondary-600/30 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-white/50 dark:bg-secondary-600/50 backdrop-blur-sm rounded-lg">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-secondary-900 dark:text-white">
                        {transaction.type === 'purchase' && 'Bought'}
                        {transaction.type === 'sale' && 'Sold'}
                        {transaction.type === 'dividend' && 'Dividend'}
                        {transaction.type === 'fee' && 'Fee'}
                        {transaction.tokenAmount && ` ${transaction.tokenAmount} tokens`}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                        transaction.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-secondary-600 dark:text-secondary-400">
                      <span className="truncate">{transaction.propertyTitle}</span>
                      <span className="hidden sm:inline">•</span>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(transaction.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                      {(transaction.type === 'purchase' || transaction.type === 'fee') ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </div>
                    {transaction.blockNumber && (
                      <div className="text-xs text-secondary-500 dark:text-secondary-400">
                        Block {transaction.blockNumber}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => window.open(transaction.algoExplorerUrl, '_blank')}
                    className="p-2 hover:bg-secondary-200/50 dark:hover:bg-secondary-600/50 rounded-lg transition-colors"
                    title="View on AlgoExplorer"
                  >
                    <ExternalLink className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}