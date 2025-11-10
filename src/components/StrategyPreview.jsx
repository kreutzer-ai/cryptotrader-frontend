import React, { useState, useEffect } from 'react'
import './StrategyPreview.css'

const StrategyPreview = ({ template, config }) => {
  const [estimatedMetrics, setEstimatedMetrics] = useState(null)

  useEffect(() => {
    calculateEstimatedMetrics()
  }, [config])

  const calculateEstimatedMetrics = () => {
    if (!config || !template) {
      setEstimatedMetrics(null)
      return
    }

    // Calculate estimated metrics based on config
    const metrics = {}

    // Max concurrent positions
    if (config.maxConcurrentPositions) {
      metrics.maxPositions = config.maxConcurrentPositions
    } else if (config.positionOpenInterval && config.cycleMaxDuration) {
      // Estimate for MA_CROSSOVER type strategies
      const intervalMinutes = parseInterval(config.positionOpenInterval)
      const durationMinutes = config.cycleMaxDuration
      metrics.maxPositions = Math.ceil(durationMinutes / intervalMinutes) * 2 // LONG + SHORT
    }

    // Position size
    if (config.allocatedCapital && metrics.maxPositions) {
      const capitalPerPosition = config.allocatedCapital / metrics.maxPositions
      metrics.positionSize = capitalPerPosition * (config.leverage || 1)
      metrics.capitalPerPosition = capitalPerPosition
    }

    // Max drawdown estimate (based on leverage and stop loss)
    if (config.leverage && config.stopLoss) {
      metrics.maxDrawdown = config.stopLoss
    }

    // Liquidation risk
    if (config.leverage) {
      metrics.liquidationRisk = calculateLiquidationRisk(config.leverage)
    }

    setEstimatedMetrics(metrics)
  }

  const parseInterval = (interval) => {
    if (!interval) return 0
    const match = interval.match(/(\d+)(min|h)/)
    if (!match) return 0
    const value = parseInt(match[1])
    const unit = match[2]
    return unit === 'h' ? value * 60 : value
  }

  const calculateLiquidationRisk = (leverage) => {
    // Simplified liquidation percentage calculation
    // Based on the liquidation curve: higher leverage = higher risk
    if (leverage <= 1.1) return 90.64
    if (leverage >= 100) return 0.74
    
    // Linear interpolation (simplified)
    const percentage = 90.64 - ((leverage - 1.1) / (100 - 1.1)) * (90.64 - 0.74)
    return percentage.toFixed(2)
  }

  const getValidationStatus = () => {
    const errors = []
    
    if (!config.walletId) {
      errors.push('Wallet not selected')
    }
    
    template?.configSchema?.sections?.forEach(section => {
      section.fields?.forEach(field => {
        if (field.required && !config[field.key]) {
          errors.push(`${field.label} is required`)
        }
      })
    })

    return errors
  }

  const validationErrors = getValidationStatus()

  return (
    <div className="strategy-preview">
      <h3>Strategy Preview</h3>

      {/* Strategy Summary */}
      <div className="preview-section">
        <h4>{template?.displayName || template?.name}</h4>
        <p className="strategy-description">{template?.description}</p>
        
        <div className="strategy-badges">
          <span className={`badge type-${template?.strategyType?.toLowerCase()}`}>
            {template?.strategyType}
          </span>
          {template?.category && (
            <span className="badge category">
              {template.category}
            </span>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      {Object.keys(config).length > 0 && (
        <div className="preview-section">
          <h4>Configuration</h4>
          <div className="metrics-grid">
            {config.allocatedCapital && (
              <div className="metric">
                <label>Capital Allocated</label>
                <value>${config.allocatedCapital?.toLocaleString()}</value>
              </div>
            )}
            {config.leverage && (
              <div className="metric">
                <label>Leverage</label>
                <value>{config.leverage}x</value>
              </div>
            )}
            {estimatedMetrics?.maxPositions && (
              <div className="metric">
                <label>Max Positions</label>
                <value>{estimatedMetrics.maxPositions}</value>
              </div>
            )}
            {estimatedMetrics?.capitalPerPosition && (
              <div className="metric">
                <label>Capital/Position</label>
                <value>${estimatedMetrics.capitalPerPosition?.toFixed(2)}</value>
              </div>
            )}
            {estimatedMetrics?.positionSize && (
              <div className="metric">
                <label>Position Size</label>
                <value>${estimatedMetrics.positionSize?.toFixed(2)}</value>
              </div>
            )}
            {config.stopLoss && (
              <div className="metric">
                <label>Stop Loss</label>
                <value>{config.stopLoss}%</value>
              </div>
            )}
            {config.takeProfit && (
              <div className="metric">
                <label>Take Profit</label>
                <value>{config.takeProfit}%</value>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Metrics */}
      {estimatedMetrics && (
        <div className="preview-section">
          <h4>Risk Assessment</h4>
          <div className="risk-metrics">
            {estimatedMetrics.maxDrawdown && (
              <div className="risk-item">
                <label>Max Drawdown</label>
                <div className="risk-bar">
                  <div 
                    className="risk-fill" 
                    style={{ width: `${estimatedMetrics.maxDrawdown}%` }}
                  />
                </div>
                <span>{estimatedMetrics.maxDrawdown}%</span>
              </div>
            )}
            {estimatedMetrics.liquidationRisk && (
              <div className="risk-item">
                <label>Liquidation at</label>
                <span className="liquidation-value">
                  {estimatedMetrics.liquidationRisk}% price move
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Subscriptions */}
      {template?.configSchema?.eventSubscriptions && (
        <div className="preview-section">
          <h4>Event Subscriptions</h4>
          <ul className="event-list">
            {template.configSchema.eventSubscriptions.map((sub, idx) => {
              // Create unique key combining eventType and filters
              const filterKey = sub.filters ? JSON.stringify(sub.filters) : 'no-filters'
              const uniqueKey = `${sub.eventType}-${filterKey}-${idx}`

              return (
                <li key={uniqueKey}>
                  <span className="event-type">{sub.eventType}</span>
                  {sub.filters && (
                    <span className="event-filters">
                      {JSON.stringify(sub.filters)}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Validation Status */}
      <div className="preview-section">
        <h4>Validation</h4>
        {validationErrors.length === 0 ? (
          <div className="validation-success">
            ✓ All fields valid
          </div>
        ) : (
          <div className="validation-errors">
            {validationErrors.map((err, idx) => (
              <div key={idx} className="validation-error">
                ✗ {err}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default StrategyPreview

