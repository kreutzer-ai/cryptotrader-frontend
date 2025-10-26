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

  const formatDerivation = (value) => {
    if (!value) return '0.00'
    const num = parseFloat(value)
    return num >= 0 ? `+${num.toFixed(4)}` : num.toFixed(4)
  }

  const formatDerivationPercent = (value) => {
    if (!value) return '0.00%'
    const num = parseFloat(value)
    return num >= 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`
  }

  const getDerivationIndicator = (value) => {
    if (!value) return '→'
    const num = parseFloat(value)
    if (num > 0) return '↑'
    if (num < 0) return '↓'
    return '→'
  }

  const getDerivationColor = (value) => {
    if (!value) return 'neutral'
    const num = parseFloat(value)
    if (num > 0) return 'positive'
    if (num < 0) return 'negative'
    return 'neutral'
  }

  const totalFees = (cycleData.totalOpenFees || 0) + (cycleData.totalCloseFees || 0) + (cycleData.totalBorrowFees || 0)
  const pnlColor = cycleData.totalPnl >= 0 ? 'positive' : 'negative'

  // Get MA data
  const currentMAs = cycleData.currentMAs || {}
  const maDerivations = cycleData.maDerivations || {}
  const maDerivationPercents = cycleData.maDerivationPercents || {}

  // Sort MA periods numerically
  const maPeriods = Object.keys(currentMAs).sort((a, b) => parseInt(a) - parseInt(b))

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
          <div className="value">{formatCurrency(cycleData.totalInvested)}</div>
        </div>

        <div className="summary-item">
          <label>Unrealized PnL</label>
          <div className={`value ${pnlColor}`}>
            {formatCurrency(cycleData.unrealizedPnl)}
            <span className="percent">({formatPercent(cycleData.totalPnlPercent)})</span>
          </div>
        </div>

        <div className="summary-item">
          <label>Open Fees</label>
          <div className="value negative">
            {formatCurrency(cycleData.totalOpenFees)}
          </div>
        </div>

        <div className="summary-item">
          <label>Close Fees</label>
          <div className="value negative">
            {formatCurrency(cycleData.totalCloseFees)}
          </div>
        </div>

        <div className="summary-item">
          <label>Borrow Fees</label>
          <div className="value negative">
            {formatCurrency(cycleData.totalBorrowFees)}
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

      {/* Moving Averages Section */}
      {maPeriods.length > 0 && (
        <div className="ma-section">
          <h3>Moving Averages</h3>
          <div className="ma-grid">
            {maPeriods.map(period => {
              const currentMA = currentMAs[period]
              const derivation = maDerivations[period]
              const derivationPercent = maDerivationPercents[period]
              const indicator = getDerivationIndicator(derivationPercent)
              const color = getDerivationColor(derivationPercent)

              return (
                <div key={period} className="ma-item">
                  <div className="ma-label">MA{period}</div>
                  <div className="ma-value">${parseFloat(currentMA).toFixed(2)}</div>
                  <div className={`ma-derivation ${color}`}>
                    <span className="indicator">{indicator}</span>
                    <span className="derivation-value">
                      {derivation ? formatDerivation(derivation) : '—'}/min
                    </span>
                    <span className="derivation-percent">
                      ({derivationPercent ? formatDerivationPercent(derivationPercent) : '—'})
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default CycleSummary

