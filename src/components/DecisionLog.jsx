import React from 'react'
import './DecisionLog.css'

const DecisionLog = ({ cycleData }) => {
  if (!cycleData) return null

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A'
    const date = new Date(isoString)
    return date.toLocaleTimeString()
  }

  const formatCurrency = (value) => {
    if (!value) return '$0.00'
    return `$${parseFloat(value).toFixed(2)}`
  }

  // Build decision log from cycle data
  const buildDecisionLog = () => {
    const events = []

    // Cycle started event
    if (cycleData.cycleNumber) {
      events.push({
        timestamp: cycleData.priceTimestamp || new Date().toISOString(),
        type: 'CYCLE_STARTED',
        emoji: '🔄',
        title: `Cycle #${cycleData.cycleNumber} Started`,
        details: `Strategy: ${cycleData.strategyName}`
      })
    }

    // Position opened events
    if (cycleData.positions) {
      cycleData.positions.forEach((position, index) => {
        events.push({
          timestamp: position.openTime,
          type: 'POSITION_OPENED',
          emoji: '✅',
          title: `Position #${index + 1} Opened`,
          details: `${position.direction} @ ${formatCurrency(position.entryPrice)} | Collateral: ${formatCurrency(position.collateral)}`
        })

        // Position closed event
        if (position.status === 'CLOSED' && position.closeTime) {
          events.push({
            timestamp: position.closeTime,
            type: 'POSITION_CLOSED',
            emoji: '🏁',
            title: `Position #${index + 1} Closed`,
            details: `Exit: ${formatCurrency(position.exitPrice)} | PnL: ${formatCurrency(position.realizedPnl)}`
          })
        }
      })
    }

    // Sort by timestamp descending (newest first)
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  const events = buildDecisionLog()

  const getEventColor = (type) => {
    switch (type) {
      case 'CYCLE_STARTED':
        return 'event-cycle-start'
      case 'POSITION_OPENED':
        return 'event-position-open'
      case 'POSITION_CLOSED':
        return 'event-position-close'
      default:
        return 'event-default'
    }
  }

  return (
    <div className="decision-log">
      <h3>Decision Log</h3>

      {events.length === 0 ? (
        <div className="no-events">
          <p>No events yet</p>
        </div>
      ) : (
        <div className="events-container">
          {events.map((event, index) => (
            <div key={index} className={`event-item ${getEventColor(event.type)}`}>
              <div className="event-time">
                {formatTime(event.timestamp)}
              </div>

              <div className="event-content">
                <div className="event-title">
                  <span className="event-emoji">{event.emoji}</span>
                  <span className="event-name">{event.title}</span>
                </div>
                <div className="event-details">
                  {event.details}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DecisionLog

