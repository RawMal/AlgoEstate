import { useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { PropertyStateManager } from '../services/PropertyStateManager'
import { 
  PropertyState, 
  TokenOwnership, 
  PropertyTransaction, 
  PropertyStateEvent,
  OwnershipSummary,
  StateManagerConfig
} from '../types/propertyState'

// Initialize Algorand client
const algorandClient = AlgorandClient.testNet()

interface UsePropertyStateManagerOptions {
  config?: Partial<StateManagerConfig>
  autoStart?: boolean
  propertiesToMonitor?: string[]
}

export const usePropertyStateManager = (options: UsePropertyStateManagerOptions = {}) => {
  const { config, autoStart = true, propertiesToMonitor = [] } = options
  
  const queryClient = useQueryClient()
  const managerRef = useRef<PropertyStateManager | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<PropertyStateEvent[]>([])

  // Initialize manager
  useEffect(() => {
    if (!autoStart || managerRef.current) return

    const initializeManager = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const manager = new PropertyStateManager(algorandClient, config)
        managerRef.current = manager

        // Set up event listeners
        manager.on('initialized', () => {
          setIsInitialized(true)
          setIsLoading(false)
        })

        manager.on('state_event', (event: PropertyStateEvent) => {
          setEvents(prev => [...prev.slice(-99), event]) // Keep last 100 events
          
          // Invalidate relevant React Query caches
          if (event.type === 'tokens_purchased' || event.type === 'ownership_updated') {
            queryClient.invalidateQueries({ queryKey: ['properties'] })
            queryClient.invalidateQueries({ queryKey: ['property', event.propertyId] })
            queryClient.invalidateQueries({ queryKey: ['portfolio'] })
          }
        })

        manager.on('error', (event: PropertyStateEvent) => {
          console.error('PropertyStateManager error:', event.data)
          setError(event.data.error || 'Unknown error occurred')
        })

        await manager.initialize()

        // Add initial properties to monitor
        for (const propertyId of propertiesToMonitor) {
          try {
            await manager.addProperty(propertyId)
          } catch (error) {
            console.error(`Failed to add property ${propertyId}:`, error)
          }
        }

      } catch (error: any) {
        console.error('Failed to initialize PropertyStateManager:', error)
        setError(error.message || 'Failed to initialize state manager')
        setIsLoading(false)
      }
    }

    initializeManager()

    // Cleanup on unmount
    return () => {
      if (managerRef.current) {
        managerRef.current.stop()
        managerRef.current = null
      }
    }
  }, [autoStart, config, propertiesToMonitor, queryClient])

  // Get property state
  const getPropertyState = (propertyId: string): PropertyState | null => {
    return managerRef.current?.getPropertyState(propertyId) || null
  }

  // Get property ownership
  const getPropertyOwnership = (propertyId: string): TokenOwnership[] => {
    return managerRef.current?.getPropertyOwnership(propertyId) || []
  }

  // Get ownership summary
  const getOwnershipSummary = (propertyId: string): OwnershipSummary | null => {
    return managerRef.current?.getOwnershipSummary(propertyId) || null
  }

  // Get property transactions
  const getPropertyTransactions = (propertyId: string, limit?: number): PropertyTransaction[] => {
    return managerRef.current?.getPropertyTransactions(propertyId, limit) || []
  }

  // Add property to monitoring
  const addProperty = async (propertyId: string): Promise<void> => {
    if (!managerRef.current) {
      throw new Error('State manager not initialized')
    }

    try {
      await managerRef.current.addProperty(propertyId)
    } catch (error) {
      console.error(`Failed to add property ${propertyId}:`, error)
      throw error
    }
  }

  // Remove property from monitoring
  const removeProperty = (propertyId: string): void => {
    managerRef.current?.removeProperty(propertyId)
  }

  // Force sync property
  const syncProperty = async (propertyId: string): Promise<void> => {
    if (!managerRef.current) {
      throw new Error('State manager not initialized')
    }

    try {
      await managerRef.current.syncProperty(propertyId)
    } catch (error) {
      console.error(`Failed to sync property ${propertyId}:`, error)
      throw error
    }
  }

  // Get monitored properties
  const getMonitoredProperties = (): string[] => {
    return managerRef.current?.getMonitoredProperties() || []
  }

  // Get cache statistics
  const getCacheStats = () => {
    return managerRef.current?.getCacheStats() || {
      totalProperties: 0,
      totalOwners: 0,
      totalTransactions: 0,
      lastSyncTimes: {}
    }
  }

  // Clear events
  const clearEvents = () => {
    setEvents([])
  }

  // Get recent events by type
  const getEventsByType = (type: PropertyStateEvent['type'], limit: number = 10): PropertyStateEvent[] => {
    return events
      .filter(event => event.type === type)
      .slice(-limit)
      .reverse()
  }

  return {
    // State
    isInitialized,
    isLoading,
    error,
    events,
    
    // Data getters
    getPropertyState,
    getPropertyOwnership,
    getOwnershipSummary,
    getPropertyTransactions,
    getMonitoredProperties,
    getCacheStats,
    
    // Actions
    addProperty,
    removeProperty,
    syncProperty,
    clearEvents,
    getEventsByType,
    
    // Manager instance (for advanced usage)
    manager: managerRef.current
  }
}

export type UsePropertyStateManagerReturn = ReturnType<typeof usePropertyStateManager>