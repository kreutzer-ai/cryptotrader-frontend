import React, { useEffect, useState, useRef } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  Cell
} from 'recharts'
import { fetchCandles } from '../services/cryptotraderApi'
import './RechartsCandles.css'

const RechartsCandles = ({ selectedMAs, setSelectedMAs, cycles = [], candleLimit = 300, setCandleLimit }) => {
  const [candleData, setCandleData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [stats, setStats] = useState(null)
  const [selectedMADerivations, setSelectedMADerivations] = useState([]) // MA derivations to display

  const presetLimits = [
    { label: '1h', value: 60 },
    { label: '2h', value: 120 },
    { label: '4h', value: 240 },
    { label: '8h', value: 480 },
    { label: '12h', value: 720 },
    { label: '1d', value: 1440 },
    { label: '2d', value: 2880 },
    { label: '3d', value: 4320 },
    { label: '1w', value: 10080 }
  ]

  const handleLimitChange = (e) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value > 0 && value <= 10000) {
      setCandleLimit(value)
    }
  }

  // Load candle data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchCandles('So11111111111111111111111111111111111111112', candleLimit)

        if (!data || data.length === 0) {
          throw new Error('No candle data received')
        }

        // Transform data for Recharts
        const transformed = data.map((candle, index) => {
          // candle.time is already a Unix timestamp in milliseconds
          const timestamp = typeof candle.time === 'number' ? candle.time : new Date(candle.time).getTime()

          // Calculate MA derivations (compare with previous candle)
          const maDerivations = {}
          const maDerivationPercents = {}
          if (index > 0 && candle.movingAverages) {
            const prevCandle = data[index - 1]
            if (prevCandle && prevCandle.movingAverages) {
              Object.entries(candle.movingAverages).forEach(([period, currentMA]) => {
                const prevMA = prevCandle.movingAverages[period]
                if (prevMA) {
                  const derivation = currentMA - prevMA
                  const derivationPercent = (derivation / prevMA) * 100
                  maDerivations[period] = derivation
                  maDerivationPercents[period] = derivationPercent
                }
              })
            }
          }

          return {
            time: timestamp,
            timeStr: new Date(timestamp).toLocaleTimeString(),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            // For candlestick rendering
            candleBottom: Math.min(candle.open, candle.close),
            candleTop: Math.max(candle.open, candle.close),
            candleHeight: Math.abs(candle.close - candle.open),
            isGreen: candle.close >= candle.open,
            // MA values
            ...Object.fromEntries(
              Object.entries(candle.movingAverages || {}).map(([period, value]) => [`ma${period}`, value])
            ),
            // MA derivation percentage values (for chart lines)
            ...Object.fromEntries(
              Object.entries(maDerivationPercents).map(([period, value]) => [`maDeriv${period}`, value])
            ),
            // MA derivations (for tooltip)
            maDerivations,
            maDerivationPercents
          }
        })

        setCandleData(transformed)

        // Calculate stats from latest candle
        const latest = data[data.length - 1]
        const previous = data[data.length - 2]
        if (latest && previous) {
          const priceChange = latest.close - previous.close
          const priceChangePercent = (priceChange / previous.close) * 100

          setStats({
            currentPrice: latest.close,
            priceChange,
            priceChangePercent,
            direction: latest.direction,
            maValues: latest.movingAverages || {}
          })
        }

        setLastUpdate(new Date())
        setLoading(false)
      } catch (err) {
        console.error('Error loading chart data:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    loadData()

    // Auto-refresh every 1 minute
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [selectedMAs, candleLimit])

  // Custom candlestick shape - render as bars
  const renderCandlestick = (props) => {
    const { fill, x, y, width, height, payload } = props

    if (!payload || !payload.high || !payload.low) return null

    const isGreen = payload.close >= payload.open
    const color = isGreen ? '#2e7d32' : '#c62828'

    // Calculate positions
    const bodyTop = Math.max(payload.open, payload.close)
    const bodyBottom = Math.min(payload.open, payload.close)
    const bodyHeight = bodyTop - bodyBottom

    // Y-axis is inverted in SVG, so we need to calculate from the chart's perspective
    const chartHeight = height
    const priceRange = payload.high - payload.low
    const pixelsPerPrice = chartHeight / priceRange

    const wickX = x + width / 2
    const wickTop = y
    const wickBottom = y + chartHeight

    const bodyY = y + (payload.high - bodyTop) * pixelsPerPrice
    const bodyH = bodyHeight * pixelsPerPrice

    return (
      <g>
        {/* Upper wick */}
        <line
          x1={wickX}
          y1={wickTop}
          x2={wickX}
          y2={bodyY}
          stroke={color}
          strokeWidth={1}
        />
        {/* Body */}
        <rect
          x={x + width * 0.2}
          y={bodyY}
          width={width * 0.6}
          height={Math.max(bodyH, 1)}
          fill={color}
          stroke={color}
        />
        {/* Lower wick */}
        <line
          x1={wickX}
          y1={bodyY + bodyH}
          x2={wickX}
          y2={wickBottom}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null

    const data = payload[0].payload

    const getDerivationIndicator = (percent) => {
      if (!percent) return '→'
      if (percent > 0) return '↑'
      if (percent < 0) return '↓'
      return '→'
    }

    const formatDerivationPercent = (percent) => {
      if (!percent) return '0.00%'
      return percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`
    }

    return (
      <div className="custom-tooltip">
        <p className="time">{data.timeStr}</p>
        <p className="price">O: ${data.open.toFixed(2)}</p>
        <p className="price">H: ${data.high.toFixed(2)}</p>
        <p className="price">L: ${data.low.toFixed(2)}</p>
        <p className="price">C: ${data.close.toFixed(2)}</p>
        {selectedMAs.map(period => {
          const value = data[`ma${period}`]
          const derivationPercent = data.maDerivationPercents?.[period]
          const indicator = getDerivationIndicator(derivationPercent)

          if (value) {
            return (
              <p key={period} className="ma">
                MA{period}: ${value.toFixed(2)}
                {derivationPercent !== undefined && (
                  <span className={`ma-deriv ${derivationPercent > 0 ? 'positive' : derivationPercent < 0 ? 'negative' : 'neutral'}`}>
                    {' '}{indicator} {formatDerivationPercent(derivationPercent)}
                  </span>
                )}
              </p>
            )
          }
          return null
        })}
      </div>
    )
  }

  // Get cycle color
  const getCycleColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'rgba(46, 125, 50, 0.15)'
      case 'CLOSED_PROFIT':
        return 'rgba(25, 118, 210, 0.12)'
      case 'CLOSED_DURATION':
        return 'rgba(245, 124, 0, 0.12)'
      case 'CLOSED_LIQUIDATION':
        return 'rgba(211, 47, 47, 0.15)'
      case 'FAILED':
        return 'rgba(198, 40, 40, 0.12)'
      default:
        return 'rgba(74, 144, 226, 0.1)'
    }
  }

  // MA Derivation management
  const handleAddMADerivation = (period) => {
    if (period && !selectedMADerivations.includes(period)) {
      setSelectedMADerivations([...selectedMADerivations, period].sort((a, b) => a - b))
    }
  }

  const handleRemoveMADerivation = (period) => {
    setSelectedMADerivations(selectedMADerivations.filter(p => p !== period))
  }

  const getAvailableMADerivationPeriods = () => {
    // Get all MA periods that have derivation data
    if (candleData.length === 0) return []
    const latestCandle = candleData[candleData.length - 1]
    if (!latestCandle || !latestCandle.maDerivationPercents) return []

    const allPeriods = Object.keys(latestCandle.maDerivationPercents).map(p => parseInt(p))
    return allPeriods.filter(p => !selectedMADerivations.includes(p)).sort((a, b) => a - b)
  }

  if (loading) {
    return (
      <div className="recharts-wrapper">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading chart data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="recharts-wrapper">
        <div className="error-message">
          <p>❌ Error: {error}</p>
          <p className="error-hint">Please check that your CryptoTrader API is running on localhost:8080</p>
        </div>
      </div>
    )
  }

  return (
    <div className="recharts-wrapper">
      {stats && (
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">Price:</span>
            <span className="stat-value">${stats.currentPrice.toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Change:</span>
            <span className={`stat-value ${stats.priceChange >= 0 ? 'positive' : 'negative'}`}>
              {stats.priceChange >= 0 ? '+' : ''}{stats.priceChange.toFixed(2)} ({stats.priceChangePercent.toFixed(2)}%)
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Direction:</span>
            <span className={`stat-value direction-${stats.direction?.toLowerCase()}`}>
              {stats.direction || 'NEUTRAL'}
            </span>
          </div>

          {/* Candle Limit Controls */}
          <div className="candle-controls">
            <label className="control-label">Candles:</label>
            <input
              type="number"
              className="limit-input"
              value={candleLimit}
              onChange={handleLimitChange}
              min="1"
              max="10000"
              step="10"
            />
            <div className="preset-buttons">
              {presetLimits.map(preset => (
                <button
                  key={preset.value}
                  className={`preset-btn ${candleLimit === preset.value ? 'active' : ''}`}
                  onClick={() => setCandleLimit(preset.value)}
                  title={`${preset.value} candles`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* MA Derivation Controls */}
          <div className="ma-deriv-controls">
            <label className="control-label">MA Derivations:</label>
            <select
              className="ma-deriv-dropdown"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddMADerivation(Number(e.target.value))
                  e.target.value = ''
                }
              }}
            >
              <option value="">Add Derivation</option>
              {getAvailableMADerivationPeriods().map(period => (
                <option key={period} value={period}>MA{period} Δ</option>
              ))}
            </select>

            {/* MA Derivation Chips */}
            {selectedMADerivations.length > 0 && (
              <div className="ma-deriv-chips">
                {selectedMADerivations.map((period, index) => {
                  const colors = ['#9c27b0', '#e91e63', '#ff5722', '#795548', '#607d8b']
                  const color = colors[index % colors.length]
                  return (
                    <div
                      key={period}
                      className="ma-deriv-chip"
                      style={{ borderColor: color, color: color }}
                    >
                      <span>MA{period} Δ</span>
                      <button
                        className="ma-deriv-remove-btn"
                        onClick={() => handleRemoveMADerivation(period)}
                        title={`Remove MA${period} derivation`}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ height: 'calc(100vh - 140px)', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={candleData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
          />
          
          <YAxis
            yAxisId="price"
            domain={['auto', 'auto']}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />

          {/* Second Y-axis for MA derivations (percentage) */}
          {selectedMADerivations.length > 0 && (
            <YAxis
              yAxisId="derivation"
              orientation="right"
              domain={['auto', 'auto']}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value.toFixed(2)}%`}
            />
          )}

          <Tooltip content={<CustomTooltip />} />
          
          {/* Cycle period backgrounds */}
          {cycles.map((cycle) => {
            const startTime = new Date(cycle.startTime).getTime()
            const endTime = cycle.endTime
              ? new Date(cycle.endTime).getTime()
              : Date.now()

            const color = getCycleColor(cycle.status)

            return (
              <ReferenceArea
                key={cycle.id}
                x1={startTime}
                x2={endTime}
                fill={color}
                fillOpacity={1}
                label={{
                  value: `${cycle.cycleNumber}`,
                  position: 'top',
                  fontSize: 11,
                  fontWeight: 600
                }}
              />
            )
          })}
          
          {/* Candlesticks */}
          <Bar
            dataKey="high"
            fill="transparent"
            shape={<CandleShape />}
            yAxisId="price"
          />

          {/* Moving averages */}
          {selectedMAs.map((period, index) => {
            const colors = ['#1976d2', '#f57c00', '#388e3c', '#d32f2f', '#7b1fa2']
            return (
              <Line
                key={period}
                type="monotone"
                dataKey={`ma${period}`}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
                name={`MA${period}`}
                yAxisId="price"
              />
            )
          })}

          {/* MA Derivations (percentage change per minute) */}
          {selectedMADerivations.map((period, index) => {
            const colors = ['#9c27b0', '#e91e63', '#ff5722', '#795548', '#607d8b']
            return (
              <Line
                key={`deriv-${period}`}
                type="monotone"
                dataKey={`maDeriv${period}`}
                stroke={colors[index % colors.length]}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name={`MA${period} Δ%`}
                yAxisId="derivation"
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
      </div>

      {lastUpdate && (
        <div className="last-update">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}

export default RechartsCandles

