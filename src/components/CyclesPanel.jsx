import React, { useState, useEffect } from 'react'
import { fetchCycles } from '../services/cryptotraderApi'
import { getAuthHeader } from '../services/authService'
import CycleDetailsOverlay from './CycleDetailsOverlay'
import ValueDevelopmentOverlay from './ValueDevelopmentOverlay'
import './CyclesPanel.css'

const CyclesPanel = ({ onCyclesChange, onStrategyChange, onPositionsVisualize, initialStrategy, strategies = [], strategiesLoading = false }) => {
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [showValueDevOverlay, setShowValueDevOverlay] = useState(false)
  const [cyclePositions, setCyclePositions] = useState({})
  const [activeCycleValue, setActiveCycleValue] = useState(null)
  const [selectedRateTimeframe, setSelectedRateTimeframe] = useState('hour') // 'hour', 'day', 'month', 'year'

  console.log('CyclesPanel rendering - strategies:', strategies.length, 'cycles:', cycles.length, 'loading:', loading, 'error:', error, 'initialStrategy:', initialStrategy)

  // Sync with parent's selected strategy (from URL restoration)
  // This runs when initialStrategy changes
  useEffect(() => {
    console.log('CyclesPanel sync effect - initialStrategy:', initialStrategy, 'selectedStrategy:', selectedStrategy)
    if (initialStrategy && (!selectedStrategy || selectedStrategy.id !== initialStrategy.id)) {
      console.log('Setting selected strategy to:', initialStrategy.strategyName)
      setSelectedStrategy(initialStrategy)
    }
  }, [initialStrategy])

  // Load cycles when strategy is selected
  useEffect(() => {
    if (selectedStrategy) {
      loadCycles(selectedStrategy.id)
    } else {
      setCycles([])
      // Notify parent component
      if (onCyclesChange) {
        onCyclesChange([])
      }
    }
  }, [selectedStrategy])

  const loadCycles = async (strategyId) => {
    try {
      setLoading(true)
      setError(null)
      console.log('Loading cycles for strategy:', strategyId)
      const data = await fetchCycles({ strategyConfigId: strategyId })
      console.log('Cycles loaded:', data)
      // Sort by start time descending (newest first)
      const sorted = data.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      setCycles(sorted)
      // Notify parent component
      if (onCyclesChange) {
        onCyclesChange(sorted)
      }
      // Load active cycle current value if there's an active cycle
      const activeCycle = sorted.find(c => c.status === 'ACTIVE' || c.status === 'WAITING')
      if (activeCycle) {
        loadActiveCycleValue(activeCycle.id)
      } else {
        setActiveCycleValue(null)
      }
      setLoading(false)
    } catch (err) {
      console.error('Error loading cycles:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const loadActiveCycleValue = async (cycleId) => {
    try {
      console.log('Loading active cycle value for cycle:', cycleId)
      const response = await fetch(`/api/cryptotrader/v1/cycles/${cycleId}/current-value`, {
        headers: getAuthHeader()
      })
      if (!response.ok) {
        console.error('Failed to load active cycle current value, status:', response.status)
        return
      }
      const data = await response.json()
      console.log('Active cycle value loaded:', data)
      setActiveCycleValue(data)
    } catch (err) {
      console.error('Error loading active cycle value:', err)
    }
  }

  // Poll active cycle value every 10 seconds
  useEffect(() => {
    if (!selectedStrategy || cycles.length === 0) return

    const activeCycle = cycles.find(c => c.status === 'ACTIVE' || c.status === 'WAITING')
    if (!activeCycle) {
      setActiveCycleValue(null)
      return
    }

    // Initial load
    loadActiveCycleValue(activeCycle.id)

    // Set up polling
    const interval = setInterval(() => {
      loadActiveCycleValue(activeCycle.id)
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(interval)
  }, [selectedStrategy, cycles])

  const handleStrategySelect = (e) => {
    const strategyId = parseInt(e.target.value)
    console.log('CyclesPanel - handleStrategySelect - strategyId:', strategyId)
    if (strategyId) {
      const strategy = strategies.find(s => s.id === strategyId)
      console.log('CyclesPanel - Found strategy:', strategy)
      setSelectedStrategy(strategy)
      // Notify parent component about strategy change
      if (onStrategyChange) {
        console.log('CyclesPanel - Calling onStrategyChange with:', strategy)
        onStrategyChange(strategy)
      }
    } else {
      console.log('CyclesPanel - Clearing strategy selection')
      setSelectedStrategy(null)
      // Notify parent that no strategy is selected
      if (onStrategyChange) {
        onStrategyChange(null)
      }
    }
  }

  const handleOpenOverlay = () => {
    setShowOverlay(true)
  }

  const handleCloseOverlay = () => {
    setShowOverlay(false)
  }

  const loadCyclePositions = async (cycleId) => {
    try {
      const response = await fetch(`/api/cryptotrader/v1/cycles/${cycleId}/positions`, {
        headers: getAuthHeader()
      })
      if (!response.ok) {
        console.error('Failed to load positions for cycle', cycleId)
        return
      }
      const positions = await response.json()
      setCyclePositions(prev => ({
        ...prev,
        [cycleId]: positions
      }))
    } catch (err) {
      console.error('Error loading positions for cycle', cycleId, err)
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const calculatePositionPnlPercent = (position) => {
    if (!position.realizedPnlPercent) return null
    return position.realizedPnlPercent
  }

  const handleVisualizePositions = (cycleId) => {
    const positions = cyclePositions[cycleId]
    if (positions && positions.length > 0 && onPositionsVisualize) {
      onPositionsVisualize(positions)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const calculateDuration = (startTime, endTime) => {
    if (!startTime) return null
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const diffMs = end - start
    return Math.floor(diffMs / 60000) // Convert to minutes
  }

  const calculatePnlPercent = (netPnl, startingBalance) => {
    if (!startingBalance || startingBalance === 0) return 0
    return (netPnl / startingBalance) * 100
  }

  const calculateTotalPnL = () => {
    return cycles.reduce((sum, cycle) => sum + (cycle.netPnl || 0), 0)
  }

  const calculateActiveCycles = () => {
    return cycles.filter(c => c.status === 'ACTIVE' || c.status === 'WAITING').length
  }

  const calculateClosedCycles = () => {
    return cycles.filter(c => c.status.startsWith('CLOSED')).length
  }

  const calculateProfitableCycles = () => {
    return cycles.filter(c => c.netPnl > 0).length
  }

  const calculateProfitPerMinute = (cycle) => {
    const duration = calculateDuration(cycle.startTime, cycle.endTime)
    if (!duration || duration === 0) return 0
    return cycle.netPnl / duration
  }

  // Calculate profit rate per hour in percent
  const calculateProfitRatePerHour = () => {
    if (cycles.length === 0) return 0

    // Calculate total duration in hours across all cycles
    let totalDurationHours = 0
    let totalPnl = 0

    cycles.forEach(cycle => {
      const durationMinutes = calculateDuration(cycle.startTime, cycle.endTime)
      if (durationMinutes && durationMinutes > 0) {
        totalDurationHours += durationMinutes / 60
        totalPnl += (cycle.netPnl || 0)
      }
    })

    if (totalDurationHours === 0) return 0

    // Calculate average starting balance
    const avgStartingBalance = cycles.reduce((sum, c) => sum + (c.startingBalance || 0), 0) / cycles.length
    if (avgStartingBalance === 0) return 0

    // Profit per hour as percentage of average starting balance
    const profitPerHour = totalPnl / totalDurationHours
    return (profitPerHour / avgStartingBalance) * 100
  }

  // Calculate profit rate per day in percent (compound interest)
  const calculateProfitRatePerDay = () => {
    const hourlyRate = calculateProfitRatePerHour() / 100 // Convert to decimal
    // Compound 24 times (once per hour)
    const dailyMultiplier = Math.pow(1 + hourlyRate, 24)
    return (dailyMultiplier - 1) * 100 // Convert back to percent
  }

  // Calculate profit rate per month in percent (30 days, compound interest)
  const calculateProfitRatePerMonth = () => {
    const hourlyRate = calculateProfitRatePerHour() / 100 // Convert to decimal
    // Compound 24 * 30 = 720 times (once per hour for 30 days)
    const monthlyMultiplier = Math.pow(1 + hourlyRate, 24 * 30)
    return (monthlyMultiplier - 1) * 100 // Convert back to percent
  }

  // Calculate profit rate per year in percent (365 days, compound interest)
  const calculateProfitRatePerYear = () => {
    const hourlyRate = calculateProfitRatePerHour() / 100 // Convert to decimal
    // Compound 24 * 365 = 8760 times (once per hour for 365 days)
    const yearlyMultiplier = Math.pow(1 + hourlyRate, 24 * 365)
    return (yearlyMultiplier - 1) * 100 // Convert back to percent
  }

  // Get current cycle PnL (in dollars)
  const getCurrentCyclePnl = () => {
    if (!activeCycleValue) return 0
    return activeCycleValue.totalPnl || 0
  }

  // Get current cycle PnL percent
  const getCurrentCyclePnlPercent = () => {
    if (!activeCycleValue) return 0
    return (activeCycleValue.totalPnlPercent || 0) * 100
  }

  // Get selected profit rate based on timeframe
  const getSelectedProfitRate = () => {
    switch (selectedRateTimeframe) {
      case 'hour':
        return calculateProfitRatePerHour()
      case 'day':
        return calculateProfitRatePerDay()
      case 'month':
        return calculateProfitRatePerMonth()
      case 'year':
        return calculateProfitRatePerYear()
      default:
        return calculateProfitRatePerHour()
    }
  }

  // Get decimal places for selected rate
  const getRateDecimalPlaces = () => {
    switch (selectedRateTimeframe) {
      case 'hour':
        return 4
      case 'day':
        return 2
      case 'month':
        return 1
      case 'year':
        return 0
      default:
        return 4
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
      case 'WAITING':
        return 'status-active'
      case 'CLOSED_PROFIT':
        return 'status-profit'
      case 'CLOSED_DURATION':
        return 'status-duration'
      case 'CLOSED_MANUAL':
        return 'status-manual'
      case 'FAILED':
        return 'status-failed'
      default:
        return ''
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ACTIVE':
        return '🟢 Active'
      case 'WAITING':
        return '🟡 Waiting'
      case 'CLOSED_PROFIT':
        return '✅ Profit Target'
      case 'CLOSED_DURATION':
        return '⏱️ Duration'
      case 'CLOSED_MANUAL':
        return '✋ Manual'
      case 'FAILED':
        return '❌ Failed'
      default:
        return status
    }
  }

  return (
    <>
      <div className="cycles-panel-bottom">
        <div className="strategy-selector-section">
          <label>Strategy:</label>
          <select
            id="strategy-select"
            onChange={handleStrategySelect}
            value={selectedStrategy?.id || ''}
            disabled={strategiesLoading || loading || strategies.length === 0}
          >
            <option value="">
              {strategiesLoading ? 'Loading...' : strategies.length === 0 ? 'No strategies' : 'Select...'}
            </option>
            {strategies.map(strategy => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.strategyName}
              </option>
            ))}
          </select>
        </div>

        {!loading && !error && selectedStrategy && cycles.length > 0 && (
          <>
            <button className="view-value-dev-btn" onClick={() => setShowValueDevOverlay(true)} title="Value Development Chart">
              $
            </button>

            <div className="strategy-summary-compact">
              <div className="summary-stat">
                <span className="stat-label">P&L:</span>
                <span className={`stat-value ${calculateTotalPnL() >= 0 ? 'positive' : 'negative'}`}>
                  {calculateTotalPnL() >= 0 ? '+' : ''}${calculateTotalPnL().toFixed(2)}
                </span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Cycles:</span>
                <span className="stat-value">{cycles.length}</span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Active:</span>
                <span className="stat-value">{calculateActiveCycles()}</span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Profitable:</span>
                <span className="stat-value">{calculateProfitableCycles()}/{calculateClosedCycles()}</span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Leverage:</span>
                <span className="stat-value">{selectedStrategy.leverage}x</span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Target:</span>
                <span className="stat-value">{(selectedStrategy.profitThreshold * 100).toFixed(3)}%</span>
              </div>
              <div className="summary-stat-group">
                <select
                  className="rate-timeframe-selector"
                  value={selectedRateTimeframe}
                  onChange={(e) => setSelectedRateTimeframe(e.target.value)}
                >
                  <option value="hour">Rate/h</option>
                  <option value="day">Rate/d</option>
                  <option value="month">Rate/m</option>
                  <option value="year">Rate/y</option>
                </select>
                <span className={`stat-value ${getSelectedProfitRate() >= 0 ? 'positive' : 'negative'}`}>
                  {getSelectedProfitRate() >= 0 ? '+' : ''}{getSelectedProfitRate().toFixed(getRateDecimalPlaces())}%
                </span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Current Cycle:</span>
                <span className={`stat-value ${getCurrentCyclePnl() >= 0 ? 'positive' : 'negative'}`}>
                  {getCurrentCyclePnl() >= 0 ? '+' : ''}${getCurrentCyclePnl().toFixed(2)}
                </span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Current %:</span>
                <span className={`stat-value ${getCurrentCyclePnlPercent() >= 0 ? 'positive' : 'negative'}`}>
                  {getCurrentCyclePnlPercent() >= 0 ? '+' : ''}{getCurrentCyclePnlPercent().toFixed(2)}%
                </span>
              </div>
            </div>

            <button className="view-cycles-btn" onClick={handleOpenOverlay}>
              ▶ Cycles ({cycles.length})
            </button>
          </>
        )}

      </div>

      {showOverlay && cycles.length > 0 && (
        <CycleDetailsOverlay
          cycles={cycles}
          cyclePositions={cyclePositions}
          onClose={handleCloseOverlay}
          selectedStrategy={selectedStrategy}
          onVisualizePositions={handleVisualizePositions}
          onLoadPositions={loadCyclePositions}
        />
      )}

      {showValueDevOverlay && selectedStrategy && (
        <ValueDevelopmentOverlay
          onClose={() => setShowValueDevOverlay(false)}
          selectedStrategy={selectedStrategy}
        />
      )}
    </>
  )
}

export default CyclesPanel

