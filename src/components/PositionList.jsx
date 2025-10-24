import React, { useState } from 'react'
import './PositionList.css'

const PositionList = ({ cycleData }) => {
  const [expandedPositions, setExpandedPositions] = useState({})

  if (!cycleData || !cycleData.positions || cycleData.positions.length === 0) {
    return <div className="position-list"><p>No positions in this cycle</p></div>
  }

  const toggleExpanded = (positionId) => {
    setExpandedPositions(prev => ({
      ...prev,
      [positionId]: !prev[positionId]
    }))
  }

  const formatCurrency = (value) => {
    if (!value) return '$0.00'
    return `$${parseFloat(value).toFixed(2)}`
  }

  const formatPercent = (value) => {
    if (!value) return '0.00%'
    return `${(parseFloat(value) * 100).toFixed(2)}%`
  }

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A'
    const date = new Date(isoString)
    return date.toLocaleTimeString()
  }

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A'
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const calculateTimeHeld = (openTime) => {
    if (!openTime) return 'N/A'
    const openDate = new Date(openTime)
    const now = new Date()
    const diffMs = now - openDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffSecs = Math.floor((diffMs % 60000) / 1000)
    return `${diffMins}m ${diffSecs}s`
  }

  const getStatusBadge = (status) => {
    const statusClass = status.toLowerCase()
    return <span className={`status-badge status-${statusClass}`}>{status}</span>
  }

  const getDirectionBadge = (direction) => {
    const directionClass = direction.toLowerCase()
    return <span className={`direction-badge direction-${directionClass}`}>{direction}</span>
  }

  return (
    <div className="position-list">
      <h3>Positions ({cycleData.openPositions} open / {cycleData.totalPositions} total)</h3>

      <div className="positions-container">
        {cycleData.positions.map((position, index) => {
          const isExpanded = expandedPositions[position.positionId]
          const pnlColor = position.unrealizedPnl >= 0 ? 'positive' : 'negative'

          return (
            <div key={position.positionId} className="position-card">
              <div className="position-header">
                <div className="position-left">
                  <span className="position-number">#{index + 1}</span>
                  {getDirectionBadge(position.direction)}
                  <span className="entry-price">@ {formatCurrency(position.entryPrice)}</span>
                  <span className="position-meta">
                    {formatDateTime(position.openTime)} | Size: {formatCurrency(position.positionSize)} | Collateral: {formatCurrency(position.collateral)} | Open: {formatCurrency(position.openFee)} | Close: {formatCurrency(position.closeFee)} | Borrow: {formatCurrency(position.accumulatedBorrowFees || 0)}
                  </span>
                </div>

                <div className="position-right">
                  <div className={`pnl ${pnlColor}`}>
                    {formatCurrency(position.unrealizedPnl)}
                    <span className="percent">({formatPercent(position.unrealizedPnlPercent)})</span>
                  </div>
                  {getStatusBadge(position.status)}
                </div>
              </div>

              {isExpanded && (
                <div className="position-details">
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Collateral</label>
                      <div className="value">{formatCurrency(position.collateral)}</div>
                    </div>

                    <div className="detail-item">
                      <label>Leverage</label>
                      <div className="value">{position.leverage}x</div>
                    </div>

                    <div className="detail-item">
                      <label>Position Size</label>
                      <div className="value">{formatCurrency(position.positionSize)}</div>
                    </div>

                    <div className="detail-item">
                      <label>Current Price</label>
                      <div className="value">{formatCurrency(position.currentPrice)}</div>
                    </div>

                    <div className="detail-item">
                      <label>Opening Fee</label>
                      <div className="value negative">{formatCurrency(position.openFee)}</div>
                    </div>

                    <div className="detail-item">
                      <label>Closing Fee</label>
                      <div className="value negative">{formatCurrency(position.closeFee)}</div>
                    </div>

                    <div className="detail-item">
                      <label>Borrow Fees</label>
                      <div className="value negative">
                        {formatCurrency(position.accumulatedBorrowFees)}
                      </div>
                    </div>

                    <div className="detail-item">
                      <label>Opened</label>
                      <div className="value">{formatDateTime(position.openTime)}</div>
                    </div>

                    <div className="detail-item">
                      <label>Time Held</label>
                      <div className="value">{calculateTimeHeld(position.openTime)}</div>
                    </div>

                    {position.status === 'CLOSED' && (
                      <>
                        <div className="detail-item">
                          <label>Closed</label>
                          <div className="value">{formatTime(position.closeTime)}</div>
                        </div>

                        <div className="detail-item">
                          <label>Exit Price</label>
                          <div className="value">{formatCurrency(position.exitPrice)}</div>
                        </div>

                        <div className="detail-item">
                          <label>Realized PnL</label>
                          <div className={`value ${position.realizedPnl >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(position.realizedPnl)}
                            ({formatPercent(position.realizedPnlPercent)})
                          </div>
                        </div>
                      </>
                    )}

                    {position.status === 'OPEN' && (
                      <>
                        <div className="detail-item">
                          <label>Target Exit Price</label>
                          <div className="value">{formatCurrency(position.targetExitPrice)}</div>
                        </div>

                        <div className="detail-item">
                          <label>Break-even Price</label>
                          <div className="value">{formatCurrency(position.feeThresholdPrice)}</div>
                        </div>

                        <div className="detail-item">
                          <label>Gain to Threshold</label>
                          <div className="value">
                            {formatCurrency(position.gainLeftToThreshold)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PositionList

