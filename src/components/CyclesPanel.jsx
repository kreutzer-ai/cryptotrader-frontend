import React, { useState, useEffect } from 'react'
import { fetchCycles } from '../services/cryptotraderApi'
import './CyclesPanel.css'

const CyclesPanel = ({ onCyclesChange, onStrategyChange, onPositionsVisualize, initialStrategy, strategies = [], strategiesLoading = false }) => {
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedCycle, setExpandedCycle] = useState(null)
  const [cycleHistoryExpanded, setCycleHistoryExpanded] = useState(true)
  const [cyclePositions, setCyclePositions] = useState({})

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
      setLoading(false)
    } catch (err) {
      console.error('Error loading cycles:', err)
      setError(err.message)
      setLoading(false)
    }
  }

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

  const toggleCycleExpand = async (cycleId) => {
    const newExpandedCycle = expandedCycle === cycleId ? null : cycleId
    setExpandedCycle(newExpandedCycle)

    // Load positions for this cycle if expanding and not already loaded
    if (newExpandedCycle && !cyclePositions[cycleId]) {
      await loadCyclePositions(cycleId)
    }
  }

  const toggleCycleHistory = () => {
    setCycleHistoryExpanded(!cycleHistoryExpanded)
  }

  const loadCyclePositions = async (cycleId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/cryptotrader/v1/cycles/${cycleId}/positions`)
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
    <div className="cycles-panel">
      <div className="cycles-header">
        <h2>Strategies</h2>
        <div className="strategy-selector">
          <select
            id="strategy-select"
            onChange={handleStrategySelect}
            value={selectedStrategy?.id || ''}
            disabled={strategiesLoading || loading || strategies.length === 0}
          >
            <option value="">
              {strategiesLoading ? 'Loading strategies...' : strategies.length === 0 ? 'No strategies' : 'Select strategy...'}
            </option>
            {strategies.map(strategy => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.strategyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="cycles-loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}

      {error && (
        <div className="cycles-error">
          <p>❌ Error: {error}</p>
        </div>
      )}

      {!loading && !error && selectedStrategy && cycles.length > 0 && (
        <div className="strategy-summary">
          <div className="summary-main">
            <div className="summary-item summary-name">
              <span className="summary-label">Strategy</span>
              <span className="summary-value">{selectedStrategy.strategyName}</span>
            </div>
            <div className="summary-item summary-pnl">
              <span className="summary-label">Total P&L</span>
              <span className={`summary-value ${calculateTotalPnL() >= 0 ? 'positive' : 'negative'}`}>
                {calculateTotalPnL() >= 0 ? '+' : ''}${calculateTotalPnL().toFixed(2)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Leverage</span>
              <span className="summary-value">{selectedStrategy.leverage}x</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Profit Target</span>
              <span className="summary-value">{(selectedStrategy.profitThreshold * 100).toFixed(2)}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Cycles</span>
              <span className="summary-value">{cycles.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Active</span>
              <span className="summary-value active-count">{calculateActiveCycles()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Profitable</span>
              <span className="summary-value">{calculateProfitableCycles()}/{calculateClosedCycles()}</span>
            </div>
          </div>
          <div className="summary-config">
            <span>MA{selectedStrategy.shortMaPeriod}/{selectedStrategy.longMaPeriod}</span>
            <span>{(selectedStrategy.profitThreshold * 100).toFixed(1)}% target</span>
            <span className={selectedStrategy.enabled ? 'status-enabled' : 'status-disabled'}>
              {selectedStrategy.enabled ? 'Enabled' : 'Disabled'}
            </span>
            {selectedStrategy.testMode && <span className="status-test">Test Mode</span>}
          </div>
        </div>
      )}

      {!loading && !error && cycles.length === 0 && selectedStrategy && (
        <div className="cycles-empty">
          <p>No cycles found for this strategy.</p>
        </div>
      )}

      {!loading && !error && cycles.length > 0 && (
        <div className="cycles-list">
          <div className="cycles-list-header" onClick={toggleCycleHistory}>
            <span>Cycle History ({cycles.length})</span>
            <span className="accordion-icon">{cycleHistoryExpanded ? '▼' : '▶'}</span>
          </div>

          {cycleHistoryExpanded && cycles.map(cycle => (
            <div key={cycle.id} className="cycle-card">
              <div className="cycle-header" onClick={() => toggleCycleExpand(cycle.id)}>
                <div className="cycle-title">
                  <span className="cycle-number">#{cycle.cycleNumber}</span>
                  <span className="cycle-id">(ID: {cycle.id})</span>
                  <span className={`cycle-status-badge ${getStatusColor(cycle.status)}`}>
                    {cycle.status === 'ACTIVE' ? 'Active' :
                     cycle.status === 'WAITING' ? 'Waiting' :
                     cycle.status === 'CLOSED_PROFIT' ? 'Profit' :
                     cycle.status === 'CLOSED_DURATION' ? 'Duration' :
                     cycle.status === 'CLOSED_MANUAL' ? 'Manual' : 'Failed'}
                  </span>
                </div>
                <div className="cycle-summary-stats">
                  <span className={`cycle-pnl ${cycle.netPnl >= 0 ? 'positive' : 'negative'}`}>
                    {cycle.netPnl >= 0 ? '+' : ''}${cycle.netPnl?.toFixed(2) || '0.00'}
                  </span>
                  <span className="cycle-positions">
                    {cycle.closedPositions || 0} pos
                  </span>
                  <span className="cycle-duration">
                    {formatDuration(calculateDuration(cycle.startTime, cycle.endTime))}
                  </span>
                  <span className="expand-icon">{expandedCycle === cycle.id ? '▼' : '▶'}</span>
                </div>
              </div>

              {expandedCycle === cycle.id && (
                <div className="cycle-details">
                  <div className="detail-section">
                    <h4>Timeline</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Started:</span>
                        <span className="detail-value">{formatDate(cycle.startTime)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className="detail-value">{cycle.status}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">
                          {formatDuration(calculateDuration(cycle.startTime, cycle.endTime))}
                          {cycle.maxDuration && ` / ${cycle.maxDuration}m max`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Performance</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Starting Balance:</span>
                        <span className="detail-value">${cycle.startingBalance?.toFixed(2)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Total Invested:</span>
                        <span className="detail-value">${cycle.totalInvested?.toFixed(2)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Net PnL:</span>
                        <span className={`detail-value ${cycle.netPnl >= 0 ? 'positive' : 'negative'}`}>
                          {cycle.netPnl >= 0 ? '+' : ''}${cycle.netPnl?.toFixed(2)}
                          ({calculatePnlPercent(cycle.netPnl, cycle.startingBalance) >= 0 ? '+' : ''}
                          {calculatePnlPercent(cycle.netPnl, cycle.startingBalance).toFixed(2)}%)
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Leverage:</span>
                        <span className="detail-value">{cycle.leverage}x</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Position Summary</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Total:</span>
                        <span className="detail-value">{cycle.totalPositions || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Open:</span>
                        <span className="detail-value">{cycle.openPositions || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Closed:</span>
                        <span className="detail-value">{cycle.closedPositions || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Long Invested:</span>
                        <span className="detail-value positive">${cycle.totalInvestedLong?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Short Invested:</span>
                        <span className="detail-value negative">${cycle.totalInvestedShort?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </div>

                  {cyclePositions[cycle.id] && cyclePositions[cycle.id].length > 0 && (
                    <div className="detail-section positions-list">
                      <div className="positions-header">
                        <h4>Position Details ({cyclePositions[cycle.id].length})</h4>
                        <button
                          className="visualize-btn"
                          onClick={() => handleVisualizePositions(cycle.id)}
                          title="Show positions on chart"
                        >
                          📊 Show on Chart
                        </button>
                      </div>
                      <div className="positions-table-wrapper">
                        <table className="positions-table">
                          <thead>
                            <tr>
                              <th>Direction</th>
                              <th>Open Time</th>
                              <th>Close Time</th>
                              <th>Entry Price</th>
                              <th>Exit Price</th>
                              <th>Size</th>
                              <th>P&L</th>
                              <th>P&L %</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cyclePositions[cycle.id].map((pos, idx) => (
                              <tr key={pos.id || idx}>
                                <td>
                                  <span className={`position-direction ${pos.direction?.toLowerCase()}`}>
                                    {pos.direction || 'N/A'}
                                  </span>
                                </td>
                                <td className="position-time">
                                  {formatTimestamp(pos.openTime)}
                                </td>
                                <td className="position-time">
                                  {formatTimestamp(pos.closeTime)}
                                </td>
                                <td className="position-price">
                                  ${pos.entryPrice?.toFixed(4) || 'N/A'}
                                </td>
                                <td className="position-price">
                                  {pos.exitPrice ? `$${pos.exitPrice.toFixed(4)}` : '-'}
                                </td>
                                <td className="position-size">
                                  ${pos.positionSize?.toFixed(2) || 'N/A'}
                                </td>
                                <td className={`position-pnl ${(pos.realizedPnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                                  {pos.realizedPnl != null ? `${pos.realizedPnl >= 0 ? '+' : ''}$${pos.realizedPnl.toFixed(2)}` : '-'}
                                </td>
                                <td className={`position-pnl-percent ${(pos.realizedPnlPercent || 0) >= 0 ? 'positive' : 'negative'}`}>
                                  {pos.realizedPnlPercent != null ? `${pos.realizedPnlPercent >= 0 ? '+' : ''}${pos.realizedPnlPercent.toFixed(2)}%` : '-'}
                                </td>
                                <td>
                                  <span className={`position-status ${pos.status?.toLowerCase()}`}>
                                    {pos.status || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CyclesPanel

