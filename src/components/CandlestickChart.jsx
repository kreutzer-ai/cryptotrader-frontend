import React, { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts'
import { fetchCandles } from '../services/cryptotraderApi'
import CycleTimeline from './CycleTimeline'
import './CandlestickChart.css'

// Color palette for different MA lines
const MA_COLORS = [
  '#1976d2', // Blue
  '#f57c00', // Orange
  '#388e3c', // Green
  '#d32f2f', // Red
  '#7b1fa2', // Purple
  '#0097a7', // Cyan
  '#c2185b', // Pink
  '#5d4037', // Brown
]

const CandlestickChart = ({ selectedMAs, setSelectedMAs, cycles = [], candleLimit = 300, setCandleLimit }) => {
  const chartWrapperRef = useRef(null) // Wrapper for overlays
  const chartContainerRef = useRef(null) // Chart itself
  const chartRef = useRef(null)
  const candlestickSeriesRef = useRef(null)
  const maSeriesRefs = useRef({}) // Store MA series by period
  const cycleMarkersRef = useRef([]) // Store cycle period markers
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [stats, setStats] = useState(null)
  const [availableMAs, setAvailableMAs] = useState([]) // MAs available in data
  const [newMaPeriod, setNewMaPeriod] = useState('') // For dropdown selection
  const [chartTimeRange, setChartTimeRange] = useState(null) // Visible time range

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

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor: '#1a1a1a',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { visible: false },
      },
      width: chartContainerRef.current.clientWidth,
      height: 600,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#e0e0e0',
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#9e9e9e',
          width: 1,
          style: 2,
          labelBackgroundColor: '#757575',
        },
        horzLine: {
          color: '#9e9e9e',
          width: 1,
          style: 2,
          labelBackgroundColor: '#757575',
        },
      },
    })

    chartRef.current = chart

    // Candlestick series (v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#2e7d32',
      downColor: '#c62828',
      borderVisible: false,
      wickUpColor: '#2e7d32',
      wickDownColor: '#c62828',
      lastValueVisible: false,
      priceLineVisible: false,
    })
    candlestickSeriesRef.current = candlestickSeries

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    // Track visible time range for cycle timeline
    const handleVisibleTimeRangeChange = () => {
      const timeRange = chart.timeScale().getVisibleRange()
      if (timeRange) {
        setChartTimeRange(timeRange)
      }
    }

    // Initial time range
    handleVisibleTimeRangeChange()

    // Subscribe to changes
    chart.timeScale().subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange)
      chart.remove()
    }
  }, [])

  // Fetch and update data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const candles = await fetchCandles('So11111111111111111111111111111111111111112', candleLimit)

        const candleData = candles.map(c => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))

        // Update candlestick data
        if (candlestickSeriesRef.current) {
          candlestickSeriesRef.current.setData(candleData)
        }

        // Determine available MAs from the data
        if (candles.length > 0) {
          const latestCandle = candles[candles.length - 1]
          if (latestCandle.movingAverages) {
            const periods = Object.keys(latestCandle.movingAverages)
              .map(Number)
              .filter(p => !isNaN(p))
              .sort((a, b) => a - b)
            setAvailableMAs(periods)
          }
        }

        // Update MA series for selected MAs
        selectedMAs.forEach((period, index) => {
          const maData = candles
            .filter(c => c.movingAverages && c.movingAverages[period] !== null && c.movingAverages[period] !== undefined)
            .map(c => ({
              time: c.time,
              value: parseFloat(c.movingAverages[period]),
            }))

          if (maData.length > 0) {
            // Create series if it doesn't exist
            if (!maSeriesRefs.current[period] && chartRef.current) {
              const color = MA_COLORS[index % MA_COLORS.length]
              const maSeries = chartRef.current.addSeries(LineSeries, {
                color: color,
                lineWidth: 1.5,
                lastValueVisible: false,
                priceLineVisible: false,
                title: `MA${period}`,
              })
              maSeriesRefs.current[period] = maSeries
            }

            // Update data
            if (maSeriesRefs.current[period]) {
              maSeriesRefs.current[period].setData(maData)
            }
          }
        })

        // Remove MA series that are no longer selected
        Object.keys(maSeriesRefs.current).forEach(period => {
          if (!selectedMAs.includes(Number(period))) {
            if (chartRef.current && maSeriesRefs.current[period]) {
              chartRef.current.removeSeries(maSeriesRefs.current[period])
              delete maSeriesRefs.current[period]
            }
          }
        })

        // Fit content
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent()
        }

        // Calculate stats
        if (candles.length > 0) {
          const latestCandle = candles[candles.length - 1]
          const firstCandle = candles[0]
          const priceChange = latestCandle.close - firstCandle.close
          const priceChangePercent = (priceChange / firstCandle.close) * 100

          // Get MA values for selected periods
          const maValues = {}
          selectedMAs.forEach(period => {
            if (latestCandle.movingAverages && latestCandle.movingAverages[period]) {
              maValues[period] = parseFloat(latestCandle.movingAverages[period])
            }
          })

          setStats({
            currentPrice: latestCandle.close,
            priceChange: priceChange,
            priceChangePercent: priceChangePercent,
            direction: latestCandle.direction,
            maValues: maValues,
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



  // Handle adding a new MA from dropdown
  const handleAddMA = (e) => {
    const period = parseInt(e.target.value)
    if (!isNaN(period) && period >= 1 && period <= 200 && !selectedMAs.includes(period)) {
      setSelectedMAs([...selectedMAs, period].sort((a, b) => a - b))
    }
    // Reset dropdown to placeholder
    e.target.value = ''
  }

  // Handle removing an MA
  const handleRemoveMA = (period) => {
    setSelectedMAs(selectedMAs.filter(p => p !== period))
  }

  // Generate list of available MA periods (1-200) that aren't already selected
  const getAvailablePeriods = () => {
    const allPeriods = Array.from({ length: 200 }, (_, i) => i + 1)
    return allPeriods.filter(p => !selectedMAs.includes(p))
  }

  return (
    <div className="chart-wrapper">
      {loading && (
        <div className="chart-overlay">
          <div className="spinner"></div>
          <p>Loading chart data...</p>
        </div>
      )}

      {error && (
        <div className="chart-error">
          <p>❌ Error: {error}</p>
          <p className="error-hint">Please check that your CryptoTrader API is running on localhost:8080</p>
        </div>
      )}

      {/* Cycle Timeline */}
      <CycleTimeline cycles={cycles} chartTimeRange={chartTimeRange} />

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

          {/* Display MA values */}
          {Object.entries(stats.maValues || {}).map(([period, value]) => {
            const index = selectedMAs.indexOf(Number(period))
            const color = MA_COLORS[index % MA_COLORS.length]
            return (
              <div key={period} className="stat-item">
                <span className="stat-label">MA{period}:</span>
                <span className="stat-value" style={{ color }}>${value.toFixed(2)}</span>
              </div>
            )
          })}

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

          {/* MA Controls */}
          <div className="ma-controls">
            <div className="ma-selector">
              <label htmlFor="ma-dropdown" className="ma-label">Add MA:</label>
              <select
                id="ma-dropdown"
                onChange={handleAddMA}
                className="ma-dropdown"
                defaultValue=""
              >
                <option value="" disabled>Select period (1-200)</option>
                {getAvailablePeriods().map(period => (
                  <option key={period} value={period}>
                    MA{period}
                  </option>
                ))}
              </select>
            </div>

            <div className="ma-chips">
              {selectedMAs.map((period, index) => {
                const color = MA_COLORS[index % MA_COLORS.length]
                return (
                  <div key={period} className="ma-chip" style={{ borderColor: color }}>
                    <span style={{ color }}>MA{period}</span>
                    <button onClick={() => handleRemoveMA(period)} className="ma-remove-btn">×</button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="chart-container-wrapper" ref={chartWrapperRef}>
        <div className="chart-container" ref={chartContainerRef} />
      </div>

      {lastUpdate && (
        <div className="last-update">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}

export default CandlestickChart

