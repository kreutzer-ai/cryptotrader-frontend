import React from 'react'
import './CycleSummary.css'

const CycleSummary = ({ cycleData }) => {
  if (!cycleData) return null

  const formatCurrency = (value) => {
    if (!value) return '$0.00'
    return `$${parseFloat(value).toFixed(2)}`
  }

  const formatPercent = (value) => {
    if (!value) return '0.00%'
    return `${(parseFloat(value) * 100).toFixed(2)}%`
  }

  const calculateTotalFees = () => {
    if (!cycleData.positions || cycleData.positions.length === 0) {
      return 0
    }
    return cycleData.positions.reduce((total, pos) => {
      return total + (pos.accumulatedBorrowFees || 0) + (pos.buySellFees || 0) + (pos.liquidationFees || 0)
    }, 0)
  }

  const totalFees = calculateTotalFees()
  const pnlColor = cycleData.totalPnl >= 0 ? 'positive' : 'negative'

  return (
    <div className="cycle-summary">
      <div className="cycle-summary-header">
        <div className="header-left">
          <h2>Cycle #{cycleData.cycleNumber}</h2>
        </div>
        <div className="header-center">
          <span className="threshold-label">
            Threshold: {formatPercent(cycleData.profitThreshold)} |
            Target: {formatCurrency(cycleData.profitThresholdAmount)} |
            {formatCurrency(cycleData.gainLeftToThreshold)} left
          </span>
        </div>
        <div className="header-right">
          <span className={`cycle-status ${cycleData.status.toLowerCase()}`}>
            {cycleData.status}
          </span>
        </div>
      </div>

      <div className="cycle-summary-row">
        <div className="summary-item">
          <label>Price</label>
          <div className="value">{formatCurrency(cycleData.currentPrice)}</div>
        </div>

        <div className="summary-item">
          <label>Invested</label>
          <div className="value">{formatCurrency(cycleData.profitThresholdAmount)}</div>
        </div>

        <div className="summary-item">
          <label>Unrealized PnL</label>
          <div className={`value ${pnlColor}`}>
            {formatCurrency(cycleData.unrealizedPnl)}
            <span className="percent">({formatPercent(cycleData.totalPnlPercent)})</span>
          </div>
        </div>

        <div className="summary-item">
          <label>Fees</label>
          <div className="value negative">
            {formatCurrency(totalFees)}
          </div>
        </div>

        <div className="summary-item">
          <label>Net PnL</label>
          <div className={`value ${pnlColor} bold`}>
            {formatCurrency(cycleData.totalPnl)}
            <span className="percent">({formatPercent(cycleData.totalPnlPercent)})</span>
          </div>
        </div>

        <div className="summary-item">
          <label>Positions</label>
          <div className="value">
            {cycleData.openPositions}/{cycleData.totalPositions}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CycleSummary

