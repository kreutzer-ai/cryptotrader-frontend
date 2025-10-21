import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchCandles } from '../services/cryptotraderApi'
import './EChartsCandles.css'

const EChartsCandles = ({ selectedMAs, setSelectedMAs, cycles = [], selectedPositions = [], selectedStrategy = null, candleLimit = 300, setCandleLimit }) => {
  const [candleData, setCandleData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [stats, setStats] = useState(null)
  const [selectedPosition, setSelectedPosition] = useState(null) // For showing threshold lines

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

        // Convert timestamps from seconds to milliseconds
        const dataWithMs = data.map(candle => ({
          ...candle,
          time: candle.time * 1000 // Convert seconds to milliseconds
        }))

        setCandleData(dataWithMs)

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

  // Prepare ECharts option
  const getOption = () => {
    if (!candleData || candleData.length === 0) return {}

    // Prepare data for candlestick with timestamps - format: [timestamp, open, close, low, high]
    const ohlcData = candleData.map(c => [c.time, c.open, c.close, c.low, c.high])

    // Prepare MA data with timestamps - format: [timestamp, value]
    const maSeries = selectedMAs.map((period, index) => {
      const colors = ['#1976d2', '#f57c00', '#388e3c', '#d32f2f', '#7b1fa2']
      return {
        name: `MA${period}`,
        type: 'line',
        data: candleData.map(c => [c.time, c.movingAverages?.[period] || null]),
        smooth: true,
        lineStyle: {
          width: 2,
          color: colors[index % colors.length]
        },
        showSymbol: false,
        z: 2
      }
    })

    // Prepare cycle markAreas - full height, very transparent
    const markAreas = cycles.map(cycle => {
      const startTime = new Date(cycle.startTime).getTime()
      const endTime = cycle.endTime ? new Date(cycle.endTime).getTime() : Date.now()

      console.log(`Cycle #${cycle.cycleNumber}:`, {
        startTime: new Date(startTime).toLocaleString(),
        endTime: new Date(endTime).toLocaleString(),
        startTimeMs: startTime,
        endTimeMs: endTime
      })

      // Determine color and border based on status
      let fillColor = 'rgba(74, 144, 226, 0.03)'
      let borderColor = 'rgba(74, 144, 226, 0.4)'

      if (cycle.status === 'ACTIVE') {
        fillColor = 'rgba(46, 125, 50, 0.04)'
        borderColor = 'rgba(46, 125, 50, 0.5)'
      } else if (cycle.status === 'CLOSED_PROFIT') {
        fillColor = 'rgba(25, 118, 210, 0.03)'
        borderColor = 'rgba(25, 118, 210, 0.4)'
      } else if (cycle.status === 'CLOSED_DURATION') {
        fillColor = 'rgba(245, 124, 0, 0.03)'
        borderColor = 'rgba(245, 124, 0, 0.4)'
      } else if (cycle.status === 'FAILED') {
        fillColor = 'rgba(198, 40, 40, 0.03)'
        borderColor = 'rgba(198, 40, 40, 0.4)'
      }

      // Use timestamps directly for time-based x-axis
      return [
        {
          name: `${cycle.cycleNumber}`,
          xAxis: startTime,
          itemStyle: {
            color: fillColor,
            borderColor: borderColor,
            borderWidth: 1,
            borderType: 'solid'
          }
        },
        {
          xAxis: endTime
        }
      ]
    })

    // Prepare position markers
    const positionMarkPoints = selectedPositions.flatMap((pos, idx) => {
      const markers = []

      // Entry marker
      if (pos.openTime && pos.entryPrice) {
        markers.push({
          name: `${pos.direction} Entry`,
          coord: [new Date(pos.openTime).getTime(), pos.entryPrice],
          value: `${pos.direction}\n$${pos.entryPrice.toFixed(2)}`,
          symbol: pos.direction === 'LONG' ? 'triangle' : 'triangle',
          symbolSize: 12,
          symbolRotate: pos.direction === 'LONG' ? 0 : 180,
          itemStyle: {
            color: pos.direction === 'LONG' ? '#2e7d32' : '#c62828',
            borderColor: '#ffffff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: pos.direction === 'LONG' ? 'bottom' : 'top',
            formatter: '{b}',
            fontSize: 10,
            color: pos.direction === 'LONG' ? '#2e7d32' : '#c62828',
            fontWeight: 600
          },
          positionId: pos.id // Store position ID for click handling
        })
      }

      // Exit marker (if closed)
      if (pos.closeTime && pos.exitPrice) {
        const isProfitable = (pos.realizedPnl || 0) >= 0
        markers.push({
          name: `${pos.direction} Exit`,
          coord: [new Date(pos.closeTime).getTime(), pos.exitPrice],
          value: `Exit\n$${pos.exitPrice.toFixed(2)}`,
          symbol: 'circle',
          symbolSize: 10,
          itemStyle: {
            color: isProfitable ? '#1976d2' : '#f57c00',
            borderColor: '#ffffff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'top',
            formatter: `{b}\n${isProfitable ? '+' : ''}$${(pos.realizedPnl || 0).toFixed(2)}`,
            fontSize: 9,
            color: isProfitable ? '#1976d2' : '#f57c00',
            fontWeight: 600
          },
          positionId: pos.id // Store position ID for click handling
        })
      }

      return markers
    })

    // Prepare threshold lines for selected position
    const thresholdLines = []
    if (selectedPosition && selectedStrategy) {
      const feePercent = 0.16 // 0.16% fee
      const profitTargetPercent = (selectedStrategy.profitThreshold * 100) // Convert to percentage (e.g., 8%)
      const leverage = selectedStrategy.leverage || 1 // Get leverage from strategy

      // Divide profit target by leverage because position is leveraged
      // Example: 8% profit target with 5x leverage = 8% / 5 = 1.6% price movement needed
      const priceMovementPercent = profitTargetPercent / leverage
      const totalTargetPercent = feePercent + priceMovementPercent // Fee + price movement needed

      const entryPrice = selectedPosition.entryPrice
      const openTime = new Date(selectedPosition.openTime).getTime()
      const closeTime = selectedPosition.closeTime ? new Date(selectedPosition.closeTime).getTime() : Date.now()

      // Calculate threshold prices based on direction
      let feeThresholdPrice, profitThresholdPrice
      if (selectedPosition.direction === 'LONG') {
        // For LONG: prices go up
        feeThresholdPrice = entryPrice * (1 + feePercent / 100)
        profitThresholdPrice = entryPrice * (1 + totalTargetPercent / 100)
      } else {
        // For SHORT: prices go down
        feeThresholdPrice = entryPrice * (1 - feePercent / 100)
        profitThresholdPrice = entryPrice * (1 - totalTargetPercent / 100)
      }

      // Entry price line (horizontal)
      thresholdLines.push({
        name: 'Entry Price',
        yAxis: entryPrice,
        label: {
          show: true,
          formatter: `Entry: $${entryPrice.toFixed(4)}`,
          position: 'insideEndTop',
          fontSize: 10,
          color: '#666',
          fontWeight: 600
        },
        lineStyle: {
          color: '#666',
          width: 2,
          type: 'solid'
        }
      })

      // Fee threshold line (0.16%)
      thresholdLines.push({
        name: 'Fee Threshold',
        yAxis: feeThresholdPrice,
        label: {
          show: true,
          formatter: `Fee (${feePercent}%): $${feeThresholdPrice.toFixed(4)}`,
          position: 'insideEndTop',
          fontSize: 10,
          color: '#f57c00',
          fontWeight: 600
        },
        lineStyle: {
          color: '#f57c00',
          width: 2,
          type: 'dashed'
        }
      })

      // Profit target line (fee + desired profit / leverage)
      thresholdLines.push({
        name: 'Profit Target',
        yAxis: profitThresholdPrice,
        label: {
          show: true,
          formatter: `Target (${profitTargetPercent.toFixed(2)}% ÷ ${leverage}x = ${totalTargetPercent.toFixed(2)}%): $${profitThresholdPrice.toFixed(4)}`,
          position: 'insideEndTop',
          fontSize: 10,
          color: '#2e7d32',
          fontWeight: 600
        },
        lineStyle: {
          color: '#2e7d32',
          width: 2,
          type: 'dashed'
        }
      })
    }

    // Prepare position lines (connect entry to exit)
    const positionConnectLines = selectedPositions
      .filter(pos => pos.openTime && pos.closeTime && pos.entryPrice && pos.exitPrice)
      .map(pos => {
        const isProfitable = (pos.realizedPnl || 0) >= 0
        return [
          {
            coord: [new Date(pos.openTime).getTime(), pos.entryPrice]
          },
          {
            coord: [new Date(pos.closeTime).getTime(), pos.exitPrice],
            lineStyle: {
              color: isProfitable ? '#1976d2' : '#f57c00',
              width: 2,
              type: 'dashed'
            }
          }
        ]
      })

    // Combine position lines and threshold lines
    const positionMarkLines = [
      ...positionConnectLines,
      ...thresholdLines
    ]

    return {
      animation: false,
      backgroundColor: '#ffffff',
      grid: {
        left: '3%',
        right: '3%',
        top: '10%',
        bottom: '15%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params) => {
          if (!params || params.length === 0) return ''

          const dataIndex = params[0].dataIndex
          const candle = candleData[dataIndex]
          if (!candle) return ''

          // Format timestamp properly
          const date = new Date(candle.time)
          const dateStr = date.toLocaleDateString()
          const timeStr = date.toLocaleTimeString()

          let html = `<div style="font-size: 12px;">
            <div style="font-weight: 600; margin-bottom: 5px;">${dateStr} ${timeStr}</div>
            <div>Open: $${candle.open.toFixed(2)}</div>
            <div>High: $${candle.high.toFixed(2)}</div>
            <div>Low: $${candle.low.toFixed(2)}</div>
            <div>Close: $${candle.close.toFixed(2)}</div>`

          selectedMAs.forEach(period => {
            const value = candle.movingAverages?.[period]
            if (value) {
              html += `<div>MA${period}: $${value.toFixed(2)}</div>`
            }
          })

          html += '</div>'
          return html
        }
      },
      xAxis: {
        type: 'time',
        boundaryGap: ['2%', '2%'],
        axisLine: { lineStyle: { color: '#e0e0e0' } },
        axisLabel: {
          color: '#666666',
          fontSize: 11,
          formatter: (value) => {
            const date = new Date(value)
            const hours = date.getHours().toString().padStart(2, '0')
            const minutes = date.getMinutes().toString().padStart(2, '0')
            return `${hours}:${minutes}`
          }
        },
        splitLine: { show: false }
      },
      yAxis: {
        scale: true,
        axisLine: { lineStyle: { color: '#e0e0e0' } },
        axisLabel: {
          color: '#666666',
          fontSize: 11,
          formatter: (value) => `$${value.toFixed(2)}`
        },
        splitLine: {
          lineStyle: {
            color: '#f0f0f0'
          }
        }
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 30,
          bottom: 10,
          borderColor: '#d0d0d0',
          fillerColor: 'rgba(74, 144, 226, 0.2)',
          handleStyle: {
            color: '#4a90e2'
          },
          textStyle: {
            color: '#666666',
            fontSize: 11
          }
        }
      ],
      series: [
        {
          name: 'Candlestick',
          type: 'candlestick',
          data: ohlcData,
          itemStyle: {
            color: '#2e7d32',
            color0: '#c62828',
            borderColor: '#2e7d32',
            borderColor0: '#c62828'
          },
          markArea: {
            silent: false,
            data: markAreas,
            label: {
              show: true,
              position: 'top',
              fontSize: 11,
              fontWeight: 600,
              color: '#333333'
            }
          },
          markPoint: {
            data: positionMarkPoints,
            silent: false
          },
          markLine: {
            data: positionMarkLines,
            silent: false
          },
          z: 1
        },
        ...maSeries
      ]
    }
  }

  if (loading) {
    return (
      <div className="echarts-wrapper">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading chart data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="echarts-wrapper">
        <div className="error-message">
          <p>❌ Error: {error}</p>
          <p className="error-hint">Please check that your CryptoTrader API is running on localhost:8080</p>
        </div>
      </div>
    )
  }

  // Handle adding a new MA from dropdown
  const handleAddMA = (e) => {
    const period = parseInt(e.target.value)
    if (!isNaN(period) && period >= 1 && period <= 200 && !selectedMAs.includes(period)) {
      setSelectedMAs([...selectedMAs, period].sort((a, b) => a - b))
    }
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

  const MA_COLORS = ['#1976d2', '#f57c00', '#388e3c', '#d32f2f', '#7b1fa2']

  return (
    <div className="echarts-wrapper">
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
            if (index === -1) return null
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
                  <option key={period} value={period}>MA{period}</option>
                ))}
              </select>
            </div>

            {/* MA Chips */}
            <div className="ma-chips">
              {selectedMAs.map((period, index) => {
                const color = MA_COLORS[index % MA_COLORS.length]
                return (
                  <div
                    key={period}
                    className="ma-chip"
                    style={{ borderColor: color, color: color }}
                  >
                    <span>MA{period}</span>
                    <button
                      className="ma-remove-btn"
                      onClick={() => handleRemoveMA(period)}
                      title={`Remove MA${period}`}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <ReactECharts
        option={getOption()}
        style={{ height: 'calc(100vh - 140px)', width: '100%' }}
        notMerge={true}
        lazyUpdate={true}
        onEvents={{
          click: (params) => {
            console.log('Chart clicked:', params)
            // Handle click on position markers
            if (params.componentType === 'markPoint' && params.data && params.data.positionId) {
              const clickedPosition = selectedPositions.find(p => p.id === params.data.positionId)
              console.log('Clicked position:', clickedPosition)
              if (clickedPosition) {
                // Toggle selection - if same position clicked, deselect
                if (selectedPosition && selectedPosition.id === clickedPosition.id) {
                  console.log('Deselecting position')
                  setSelectedPosition(null)
                } else {
                  console.log('Selecting position:', clickedPosition)
                  setSelectedPosition(clickedPosition)
                }
              }
            }
          }
        }}
      />

      {lastUpdate && (
        <div className="last-update">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}

export default EChartsCandles

