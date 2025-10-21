import React, { useState } from 'react'
import './CycleDetailsOverlay.css'

const CycleDetailsOverlay = ({ cycles, cyclePositions, onClose, selectedStrategy, onVisualizePositions, onLoadPositions }) => {
  const [expandedCycle, setExpandedCycle] = useState(null)

  if (!cycles || cycles.length === 0) return null

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes) => {
    if (!minutes) return '0m'
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    return Math.floor((end - start) / 1000 / 60)
  }

  const calculatePnlPercent = (pnl, startingBalance) => {
    if (!startingBalance || startingBalance === 0) return 0
    return (pnl / startingBalance) * 100
  }

  const handleVisualizePositions = (cycleId) => {
    if (onVisualizePositions) {
      onVisualizePositions(cycleId)
      // Close overlay so user can see the chart
      if (onClose) {
        onClose()
      }
    }
  }

  const toggleCycleExpand = async (cycleId) => {
    const newExpandedCycle = expandedCycle === cycleId ? null : cycleId
    setExpandedCycle(newExpandedCycle)

    // Load positions for this cycle if expanding and not already loaded
    if (newExpandedCycle && !cyclePositions[cycleId] && onLoadPositions) {
      await onLoadPositions(cycleId)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'active'
      case 'WAITING': return 'waiting'
      case 'CLOSED_PROFIT': return 'profit'
      case 'CLOSED_DURATION': return 'duration'
      case 'CLOSED_MANUAL': return 'manual'
      default: return 'failed'
    }
  }

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose}></div>
      <div className="cycle-details-overlay">
        <div className="overlay-header">
          <h2>{selectedStrategy?.strategyName || 'Strategy'} - Cycle History ({cycles.length})</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="overlay-content">
          <div className="cycles-list">
            {cycles.map(cycle => (
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
                  ({calculatePnlPercent(cycle.netPnl, cycle.totalInvested) >= 0 ? '+' : ''}
                  {calculatePnlPercent(cycle.netPnl, cycle.totalInvested).toFixed(2)}%)
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
                  ▶ Show on Chart
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
        </div>
      </div>
    </>
  )
}

export default CycleDetailsOverlay

