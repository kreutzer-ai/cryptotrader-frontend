import React, { useState, useEffect, useRef, memo } from 'react'
import './EventLog.css'

// GLOBAL event store - survives component remounts
const EventStore = {
  events: [],
  listeners: new Set(),

  init() {
    if (this.events.length === 0) {
      try {
        const saved = localStorage.getItem('eventLog_events')
        if (saved) {
          const parsed = JSON.parse(saved)
          this.events = parsed.map(e => ({ ...e, time: new Date(e.time) }))
          console.log('📦 Loaded', this.events.length, 'events from localStorage')
        }
      } catch (err) {
        console.error('Failed to load events from localStorage:', err)
      }
    }
  },

  addEvent(event) {
    this.events = [event, ...this.events].slice(0, 500)

    // Save to localStorage every 10 events
    if (this.events.length % 10 === 0) {
      try {
        localStorage.setItem('eventLog_events', JSON.stringify(this.events))
      } catch (err) {
        console.error('Failed to save events to localStorage:', err)
      }
    }

    this.notifyListeners()
  },

  clearEvents() {
    this.events = []
    try {
      localStorage.removeItem('eventLog_events')
    } catch (err) {
      console.error('Failed to clear events from localStorage:', err)
    }
    this.notifyListeners()
  },

  getEvents() {
    return this.events
  },

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  },

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.events))
  }
}

// Initialize on module load
EventStore.init()

const EventLog = memo(({ isVisible = true }) => {
  const [events, setEvents] = useState(() => EventStore.getEvents())

  const [filters, setFilters] = useState({
    priceTicks: true,
    candles: true,
    indicators: false, // Off by default (425 events/min!)
    maOnly: false,
    rsiOnly: false,
    maDerivationOnly: false,
    interval1min: true,
    interval15sec: true
  })
  const [isPaused, setIsPaused] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef(null)
  const eventListRef = useRef(null)
  const isPausedRef = useRef(isPaused) // Use ref to avoid stale closure
  const [autoScroll, setAutoScroll] = useState(true)
  const [eventStats, setEventStats] = useState({
    ticks: 0,
    candles: 0,
    indicators: 0,
    total: 0
  })

  // Subscribe to EventStore changes
  useEffect(() => {
    const unsubscribe = EventStore.subscribe((newEvents) => {
      setEvents(newEvents)
    })
    return unsubscribe
  }, [])

  // Update ref when isPaused changes
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    console.log('📊 EventLog component mounted. Events in store:', EventStore.getEvents().length)
    connectToEventStream()

    return () => {
      console.log('📊 EventLog component unmounting. Events in store:', EventStore.getEvents().length)
      disconnectFromEventStream()
    }
  }, [])

  const connectToEventStream = () => {
    if (eventSourceRef.current) {
      console.log('⚠️ Already connected to event stream, skipping reconnect')
      return // Already connected
    }

    console.log('🔌 Connecting to event stream...')
    const eventSource = new EventSource('/api/events/stream')
    eventSourceRef.current = eventSource

    eventSource.addEventListener('connected', (e) => {
      const data = JSON.parse(e.data)
      console.log('✅ Connected to event stream:', data)
      setIsConnected(true)
      addEvent({
        type: 'SYSTEM',
        time: new Date(),
        message: '✓ Connected to event stream',
        data
      })
    })

    eventSource.addEventListener('tick', (e) => {
      if (isPausedRef.current) return
      const data = JSON.parse(e.data)
      addEvent({
        type: 'PRICE_TICK',
        time: new Date(data.timestamp),
        message: `${data.mint.slice(0, 8)}... $${parseFloat(data.price).toFixed(4)}`,
        data
      })
      setEventStats(prev => ({ ...prev, ticks: prev.ticks + 1, total: prev.total + 1 }))
    })

    eventSource.addEventListener('candle', (e) => {
      if (isPausedRef.current) return
      const data = JSON.parse(e.data)
      const candle = data.candle
      addEvent({
        type: 'CANDLE_COMPLETED',
        time: new Date(data.timestamp),
        message: `${candle.interval} O:${parseFloat(candle.open).toFixed(2)} H:${parseFloat(candle.high).toFixed(2)} L:${parseFloat(candle.low).toFixed(2)} C:${parseFloat(candle.close).toFixed(2)}`,
        data
      })
      setEventStats(prev => ({ ...prev, candles: prev.candles + 1, total: prev.total + 1 }))
    })

    eventSource.addEventListener('indicator', (e) => {
      if (isPausedRef.current) return
      const data = JSON.parse(e.data)
      const changeStr = data.changePercent
        ? ` (${parseFloat(data.changePercent) > 0 ? '+' : ''}${parseFloat(data.changePercent).toFixed(2)}%)`
        : ''
      const valueStr = typeof data.value === 'number'
        ? parseFloat(data.value).toFixed(4)
        : data.value
      const intervalStr = data.interval ? `[${data.interval}] ` : ''
      addEvent({
        type: 'INDICATOR_CALCULATED',
        time: new Date(data.timestamp),
        message: `${intervalStr}${data.indicatorKey} = ${valueStr}${changeStr}`,
        data
      })
      setEventStats(prev => ({ ...prev, indicators: prev.indicators + 1, total: prev.total + 1 }))
    })

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      setIsConnected(false)
      addEvent({
        type: 'SYSTEM',
        time: new Date(),
        message: '✗ Connection lost. Reconnecting...',
        data: { error: 'Connection error' }
      })
      eventSource.close()
      eventSourceRef.current = null
      
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (!eventSourceRef.current) {
          connectToEventStream()
        }
      }, 3000)
    }
  }

  const disconnectFromEventStream = () => {
    if (eventSourceRef.current) {
      console.log('🔌 Disconnecting from event stream...')
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    } else {
      console.log('⚠️ No active connection to disconnect')
    }
  }

  const addEvent = (event) => {
    EventStore.addEvent(event)

    // Auto-scroll to bottom if enabled
    if (autoScroll && eventListRef.current) {
      setTimeout(() => {
        eventListRef.current.scrollTop = 0
      }, 10)
    }
  }

  const filteredEvents = events.filter(event => {
    // Always show system events
    if (event.type === 'SYSTEM') return true

    if (event.type === 'PRICE_TICK' && !filters.priceTicks) return false
    if (event.type === 'CANDLE_COMPLETED' && !filters.candles) return false
    if (event.type === 'INDICATOR_CALCULATED' && !filters.indicators) return false

    // Interval filters (for candles and indicators)
    if (event.type === 'CANDLE_COMPLETED' || event.type === 'INDICATOR_CALCULATED') {
      const interval = event.data?.interval || ''
      if (interval === '1min' && !filters.interval1min) return false
      if (interval === '15sec' && !filters.interval15sec) return false
    }

    // Indicator-specific filters
    if (event.type === 'INDICATOR_CALCULATED') {
      const indicatorKey = event.data?.indicatorKey || ''
      // Check MA_DERIVATION first (more specific), then MA (to avoid matching MA_DERIVATION)
      if (filters.maDerivationOnly && !indicatorKey.startsWith('MA_DERIVATION_')) return false
      if (filters.maOnly && (!indicatorKey.startsWith('MA_') || indicatorKey.startsWith('MA_DERIVATION_'))) return false
      if (filters.rsiOnly && !indicatorKey.startsWith('RSI_')) return false
    }

    return true
  })

  const clearEvents = () => {
    console.log('🗑️ Clearing all events (intentional)')
    EventStore.clearEvents()
    setEventStats({ ticks: 0, candles: 0, indicators: 0, total: 0 })
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  const getEventClassName = (type) => {
    switch (type) {
      case 'PRICE_TICK': return 'event-tick'
      case 'CANDLE_COMPLETED': return 'event-candle'
      case 'INDICATOR_CALCULATED': return 'event-indicator'
      case 'SYSTEM': return 'event-system'
      default: return ''
    }
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'PRICE_TICK': return '📊'
      case 'CANDLE_COMPLETED': return '🕯️'
      case 'INDICATOR_CALCULATED': return '📈'
      case 'SYSTEM': return 'ℹ️'
      default: return '•'
    }
  }

  return (
    <div className="event-log" style={{ display: isVisible ? 'block' : 'none' }}>
      <div className="event-log-header">
        <h2>Event Log</h2>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
      </div>

      <div className="event-controls">
        <div className="event-filters">
          <label className="filter-label">
            <input
              type="checkbox"
              checked={filters.priceTicks}
              onChange={e => setFilters({...filters, priceTicks: e.target.checked})}
            />
            <span>Price Ticks ({eventStats.ticks})</span>
          </label>
          <label className="filter-label">
            <input
              type="checkbox"
              checked={filters.candles}
              onChange={e => setFilters({...filters, candles: e.target.checked})}
            />
            <span>Candles ({eventStats.candles})</span>
          </label>
          <label className="filter-label">
            <input
              type="checkbox"
              checked={filters.indicators}
              onChange={e => setFilters({...filters, indicators: e.target.checked})}
            />
            <span>Indicators ({eventStats.indicators})</span>
          </label>
        </div>

        <div className="event-filters">
          <strong style={{marginRight: '10px'}}>Intervals:</strong>
          <label className="filter-label">
            <input
              type="checkbox"
              checked={filters.interval1min}
              onChange={e => setFilters({...filters, interval1min: e.target.checked})}
            />
            <span>1min</span>
          </label>
          <label className="filter-label">
            <input
              type="checkbox"
              checked={filters.interval15sec}
              onChange={e => setFilters({...filters, interval15sec: e.target.checked})}
            />
            <span>15sec</span>
          </label>
        </div>

        {filters.indicators && (
          <div className="event-filters">
            <strong style={{marginRight: '10px'}}>Indicator Types:</strong>
            <label className="filter-label sub-filter">
              <input
                type="checkbox"
                checked={filters.maOnly}
                onChange={e => setFilters({...filters, maOnly: e.target.checked, rsiOnly: false, maDerivationOnly: false})}
              />
              <span>MA only</span>
            </label>
            <label className="filter-label sub-filter">
              <input
                type="checkbox"
                checked={filters.maDerivationOnly}
                onChange={e => setFilters({...filters, maDerivationOnly: e.target.checked, maOnly: false, rsiOnly: false})}
              />
              <span>MA_DERIVATION only</span>
            </label>
            <label className="filter-label sub-filter">
              <input
                type="checkbox"
                checked={filters.rsiOnly}
                onChange={e => setFilters({...filters, rsiOnly: e.target.checked, maOnly: false, maDerivationOnly: false})}
              />
              <span>RSI only</span>
            </label>
          </div>
        )}

        <div className="event-actions">
          <button className="action-btn" onClick={togglePause}>
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button className="action-btn" onClick={clearEvents}>
            🗑 Clear
          </button>
          <label className="filter-label">
            <input 
              type="checkbox" 
              checked={autoScroll} 
              onChange={e => setAutoScroll(e.target.checked)} 
            />
            <span>Auto-scroll</span>
          </label>
        </div>
      </div>

      <div className="event-stats-bar">
        <span>Total Events: {eventStats.total}</span>
        <span>Showing: {filteredEvents.length} / {events.length}</span>
        <span>Buffer: {events.length} / 500</span>
      </div>

      <div className="event-list" ref={eventListRef}>
        {filteredEvents.length === 0 ? (
          <div className="event-empty">
            {isPaused ? 'Events paused. Click Resume to continue.' : 'Waiting for events...'}
          </div>
        ) : (
          filteredEvents.map((event, index) => (
            <div key={index} className={`event-item ${getEventClassName(event.type)}`}>
              <span className="event-icon">{getEventIcon(event.type)}</span>
              <span className="event-time">
                {event.time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
              </span>
              <span className="event-type">{event.type}</span>
              <span className="event-message">{event.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
})

EventLog.displayName = 'EventLog'

export default EventLog

