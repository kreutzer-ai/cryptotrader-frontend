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

  const formatPercentDirect = (value) => {
    if (!value) return '0.00%'
    return `${parseFloat(value).toFixed(2)}%`
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

  // Check if this is a cycle-less strategy (PERIODIC_DUAL)
  const isCycleLess = !cycleData.cycleNumber && cycleData.strategyName

  return (
    <div className="cycle-summary">
      <div className="cycle-summary-header">
        <div className="header-left">
          <h2>{isCycleLess ? cycleData.strategyName : `Cycle #${cycleData.cycleNumber}`}</h2>
        </div>
        <div className="header-center">
          <span className="threshold-label">
            Threshold: {formatPercent(cycleData.profitThreshold)} |
            Target: {formatCurrency(cycleData.profitThresholdAmount)} |
            {formatCurrency(cycleData.gainLeftToThreshold)} left
          </span>
        </div>
        <div className="header-right">
          {cycleData.status && (
            <span className={`cycle-status ${cycleData.status.toLowerCase()}`}>
              {cycleData.status}
            </span>
          )}
          {isCycleLess && (
            <span className="cycle-status active">
              ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Capital & Value Section */}
      <div className="cycle-summary-section">
        <h4>💰 Capital & Value</h4>
        <div className="cycle-summary-row">
          <div className="summary-item">
            <label>Current Price</label>
            <div className="value">{formatCurrency(cycleData.currentPrice)}</div>
          </div>

          {isCycleLess && cycleData.totalCapital !== undefined && (
            <div className="summary-item">
              <label>Starting Capital</label>
              <div className="value">{formatCurrency(cycleData.totalCapital)}</div>
            </div>
          )}

          {isCycleLess && cycleData.totalValue !== undefined && (
            <div className="summary-item">
              <label>Total Value</label>
              <div className={`value bold ${cycleData.totalValue >= cycleData.totalCapital ? 'positive' : 'negative'}`}>
                {formatCurrency(cycleData.totalValue)}
              </div>
            </div>
          )}

          <div className="summary-item">
            <label>Total Invested</label>
            <div className="value">{formatCurrency(cycleData.totalInvested)}</div>
          </div>

          {isCycleLess && cycleData.availableCapital !== undefined && (
            <div className="summary-item">
              <label>Available Capital</label>
              <div className="value">{formatCurrency(cycleData.availableCapital)}</div>
            </div>
          )}

          {isCycleLess && cycleData.freeCapital !== undefined && (
            <div className="summary-item">
              <label>Free Capital</label>
              <div className="value bold">{formatCurrency(cycleData.freeCapital)}</div>
            </div>
          )}
        </div>
      </div>

      {/* PnL Section */}
      <div className="cycle-summary-section">
        <h4>📊 Profit & Loss</h4>
        <div className="cycle-summary-row">
          {isCycleLess && cycleData.realizedPnl !== undefined && (
            <div className="summary-item">
              <label>Realized PnL</label>
              <div className={`value ${cycleData.realizedPnl >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(cycleData.realizedPnl)}
              </div>
            </div>
          )}

          <div className="summary-item">
            <label>Unrealized PnL</label>
            <div className={`value ${cycleData.unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(cycleData.unrealizedPnl)}
            </div>
          </div>

          <div className="summary-item">
            <label>Total PnL</label>
            <div className={`value ${pnlColor} bold`}>
              {formatCurrency(cycleData.totalPnl)}
              <span className="percent">({formatPercent(cycleData.totalPnlPercent)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fees Section */}
      <div className="cycle-summary-section">
        <h4>💸 Fees</h4>
        <div className="cycle-summary-row">
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
            <label>Total Fees</label>
            <div className="value negative bold">
              {formatCurrency(totalFees)}
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Parameters Section (for PERIODIC_DUAL) */}
      {isCycleLess && (
        <div className="cycle-summary-section">
          <h4>⚙️ Strategy Parameters</h4>
          <div className="cycle-summary-row">
            {cycleData.leverage && (
              <div className="summary-item">
                <label>Leverage</label>
                <div className="value">{cycleData.leverage}x</div>
              </div>
            )}

            {cycleData.profitThreshold && (
              <div className="summary-item">
                <label>Profit Threshold</label>
                <div className="value">{formatPercent(cycleData.profitThreshold)}</div>
              </div>
            )}

            {cycleData.periodicStoplossPercent && (
              <div className="summary-item">
                <label>Stop Loss</label>
                <div className="value negative">{formatPercentDirect(cycleData.periodicStoplossPercent)}</div>
              </div>
            )}

            {cycleData.periodicInterval && (
              <div className="summary-item">
                <label>Position Interval</label>
                <div className="value">{cycleData.periodicInterval}s</div>
              </div>
            )}

            {cycleData.periodicTimeWindow && (
              <div className="summary-item">
                <label>Time Window</label>
                <div className="value">{cycleData.periodicTimeWindow}s</div>
              </div>
            )}

            {cycleData.maxConcurrentPositions && (
              <div className="summary-item">
                <label>Max Concurrent Positions</label>
                <div className="value">{cycleData.maxConcurrentPositions}</div>
              </div>
            )}

            <div className="summary-item">
              <label>Open Positions</label>
              <div className="value">
                {cycleData.openPositions}/{cycleData.maxConcurrentPositions || cycleData.totalPositions}
              </div>
            </div>

            <div className="summary-item">
              <label>Total Positions</label>
              <div className="value">{cycleData.totalPositions}</div>
            </div>
          </div>
        </div>
      )}

      {/* Positions count for cycle-based strategies */}
      {!isCycleLess && (
        <div className="cycle-summary-row">
          <div className="summary-item">
            <label>Positions</label>
            <div className="value">
              {cycleData.openPositions}/{cycleData.totalPositions}
            </div>
          </div>
        </div>
      )}

      {/* Moving Averages Section - Hidden by default, can be shown in a separate view */}
      {false && maPeriods.length > 0 && (
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

