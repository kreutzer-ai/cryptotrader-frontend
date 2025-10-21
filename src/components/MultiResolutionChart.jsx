import React, { useEffect, useState, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchCandles, fetchPriceTicks, fetch15SecCandles } from '../services/cryptotraderApi'
import './MultiResolutionChart.css'

const MultiResolutionChart = ({ 
  selectedMAs, 
  setSelectedMAs, 
  cycles = [], 
  selectedPositions = [], 
  selectedStrategy = null, 
  candleLimit = 300, 
  setCandleLimit 
}) => {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [stats, setStats] = useState(null)
  const [resolution, setResolution] = useState('1min') // '1min', '15sec', 'tick'
  const [selectedPosition, setSelectedPosition] = useState(null) // For showing threshold lines
  const [showPositions, setShowPositions] = useState(true) // Toggle position markers visibility
  const [showCandles, setShowCandles] = useState(true) // Toggle candle/line visibility
  const chartRef = useRef(null)
  const prevDataRef = useRef(null)

  // MA management
  const handleAddMA = (period) => {
    if (period && !selectedMAs.includes(period)) {
      setSelectedMAs([...selectedMAs, period].sort((a, b) => a - b))
    }
  }

  const handleRemoveMA = (period) => {
    setSelectedMAs(selectedMAs.filter(p => p !== period))
  }

  const getAvailableMAPeriods = () => {
    const allPeriods = Array.from({ length: 200 }, (_, i) => i + 1)
    return allPeriods.filter(p => !selectedMAs.includes(p))
  }

  // Resolution-specific presets
  const getPresetLimits = () => {
    switch (resolution) {
      case 'tick':
        return [
          { label: '1min', value: 20 },
          { label: '5min', value: 100 },
          { label: '15min', value: 300 },
          { label: '30min', value: 600 },
          { label: '1h', value: 1200 },
          { label: '2h', value: 2400 }
        ]
      case '15sec':
        return [
          { label: '15min', value: 60 },
          { label: '30min', value: 120 },
          { label: '1h', value: 240 },
          { label: '2h', value: 480 },
          { label: '4h', value: 960 },
          { label: '8h', value: 1920 }
        ]
      case '1min':
      default:
        return [
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
    }
  }

  const handleLimitChange = (e) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value > 0 && value <= 10000) {
      setCandleLimit(value)
    }
  }

  const handleResolutionChange = (newResolution) => {
    setResolution(newResolution)
    // Adjust limit based on resolution
    if (newResolution === 'tick') {
      setCandleLimit(100) // Default: 5 minutes of ticks
    } else if (newResolution === '15sec') {
      setCandleLimit(240) // Default: 1 hour of 15-sec candles
    } else {
      setCandleLimit(300) // Default: 5 hours of 1-min candles
    }
  }

  // Load data based on resolution
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        let data
        const mint = 'So11111111111111111111111111111111111111112'

        if (resolution === 'tick') {
          // Fetch price ticks
          data = await fetchPriceTicks(mint, candleLimit)
          
          // Convert to chart format (line chart for ticks)
          const dataWithMs = data.map(tick => ({
            time: tick.time * 1000,
            price: tick.price,
            type: 'tick'
          }))
          setChartData(dataWithMs)

          // Calculate stats from latest tick
          if (data.length > 0) {
            const latest = data[data.length - 1]
            const previous = data[data.length - 2]
            if (previous) {
              const priceChange = latest.price - previous.price
              const priceChangePercent = (priceChange / previous.price) * 100
              setStats({
                currentPrice: latest.price,
                priceChange,
                priceChangePercent,
                dataPoints: data.length
              })
            }
          }

        } else if (resolution === '15sec') {
          // Fetch 15-second candles
          data = await fetch15SecCandles(mint, candleLimit)
          
          const dataWithMs = data.map(candle => ({
            time: candle.time * 1000,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            numberOfTicks: candle.numberOfTicks,
            complete: candle.complete,
            type: 'candle'
          }))
          setChartData(dataWithMs)

          // Calculate stats from latest candle
          if (data.length > 0) {
            const latest = data[data.length - 1]
            const previous = data[data.length - 2]
            if (previous) {
              const priceChange = latest.close - previous.close
              const priceChangePercent = (priceChange / previous.close) * 100
              setStats({
                currentPrice: latest.close,
                priceChange,
                priceChangePercent,
                dataPoints: data.length,
                avgTicksPerCandle: data.reduce((sum, c) => sum + c.numberOfTicks, 0) / data.length
              })
            }
          }

        } else {
          // Fetch 1-minute candles (existing)
          data = await fetchCandles(mint, candleLimit)
          
          const dataWithMs = data.map(candle => ({
            ...candle,
            time: candle.time * 1000,
            type: 'candle'
          }))
          setChartData(dataWithMs)

          // Calculate stats from latest candle
          if (data.length > 0) {
            const latest = data[data.length - 1]
            const previous = data[data.length - 2]
            if (previous) {
              const priceChange = latest.close - previous.close
              const priceChangePercent = (priceChange / previous.close) * 100
              setStats({
                currentPrice: latest.close,
                priceChange,
                priceChangePercent,
                direction: latest.direction,
                maValues: latest.movingAverages || {},
                dataPoints: data.length
              })
            }
          }
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

    // Auto-refresh based on resolution
    const refreshInterval = resolution === 'tick' ? 5000 : resolution === '15sec' ? 15000 : 60000
    const interval = setInterval(loadData, refreshInterval)
    return () => clearInterval(interval)
  }, [resolution, candleLimit])

  // Prepare cycle markAreas
  const prepareMarkAreas = useMemo(() => {
    if (!showPositions) return []
    return cycles.map(cycle => {
      const startTime = new Date(cycle.startTime).getTime()
      const endTime = cycle.endTime ? new Date(cycle.endTime).getTime() : Date.now()

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
  }, [cycles, showPositions])

  // Prepare position markers
  const preparePositionMarkers = useMemo(() => {
    if (!showPositions) return []
    return selectedPositions.flatMap(pos => {
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
  }, [selectedPositions, showPositions])

  // Prepare threshold lines for selected position
  const prepareThresholdLines = useMemo(() => {
    const thresholdLines = []

    if (!showPositions) return []

    if (selectedPosition && selectedStrategy) {
      const feePercent = 0.16 // 0.16% fee
      const profitTargetPercent = (selectedStrategy.profitThreshold * 100) // Convert to percentage
      const leverage = selectedStrategy.leverage || 1

      // Divide profit target by leverage
      const priceMovementPercent = profitTargetPercent / leverage
      const totalTargetPercent = feePercent + priceMovementPercent

      const entryPrice = selectedPosition.entryPrice

      // Calculate threshold prices based on direction
      let feeThresholdPrice, profitThresholdPrice
      if (selectedPosition.direction === 'LONG') {
        feeThresholdPrice = entryPrice * (1 + feePercent / 100)
        profitThresholdPrice = entryPrice * (1 + totalTargetPercent / 100)
      } else {
        feeThresholdPrice = entryPrice * (1 - feePercent / 100)
        profitThresholdPrice = entryPrice * (1 - totalTargetPercent / 100)
      }

      // Entry price line
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

      // Fee threshold line
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

      // Profit target line
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

    // Position connect lines (entry to exit)
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

    return [...positionConnectLines, ...thresholdLines]
  }, [selectedPositions, selectedPosition, selectedStrategy, showPositions])

  // Prepare ECharts option with memoization to prevent unnecessary recalculations
  const chartOption = useMemo(() => {
    if (!chartData || chartData.length === 0) return {}

    const isTick = resolution === 'tick'
    const is15Sec = resolution === '15sec'

    if (isTick) {
      // Line chart for price ticks
      return {
        animation: false,
        backgroundColor: '#fff',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#ccc',
          textStyle: { color: '#333' },
          formatter: (params) => {
            const data = params[0]
            const date = new Date(data.value[0])
            return `
              <div style="font-weight: bold; margin-bottom: 5px;">
                ${date.toLocaleString()}
              </div>
              <div>Price: $${data.value[1].toFixed(4)}</div>
            `
          }
        },
        grid: {
          left: '3%',
          right: '3%',
          bottom: '15%',
          top: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'time',
          axisLabel: {
            color: '#666',
            formatter: (value) => {
              const date = new Date(value)
              return date.toLocaleTimeString()
            }
          },
          axisLine: { lineStyle: { color: '#ddd' } }
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLabel: {
            color: '#666',
            formatter: (value) => `$${value.toFixed(2)}`
          },
          axisLine: { lineStyle: { color: '#ddd' } },
          splitLine: { lineStyle: { color: '#f0f0f0' } }
        },
        dataZoom: [
          {
            type: 'inside',
            start: 0,
            end: 100
          },
          {
            type: 'slider',
            start: 0,
            end: 100,
            bottom: '5%',
            textStyle: { color: '#666' },
            borderColor: '#ddd',
            fillerColor: 'rgba(33, 150, 243, 0.15)',
            handleStyle: { color: '#999' }
          }
        ],
        series: [
          {
            name: 'Price',
            type: 'line',
            data: chartData.map(d => [d.time, d.price]),
            smooth: false,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { color: '#2196f3', width: 2 },
            itemStyle: { color: '#2196f3' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(33, 150, 243, 0.3)' },
                  { offset: 1, color: 'rgba(33, 150, 243, 0.05)' }
                ]
              }
            },
            markArea: {
              silent: true,
              data: prepareMarkAreas
            },
            markPoint: {
              data: preparePositionMarkers
            },
            markLine: {
              symbol: 'none',
              data: prepareThresholdLines
            }
          }
        ]
      }
    }

    // Candlestick chart for 15-sec or 1-min candles
    const ohlcData = chartData.map(c => [c.time, c.open, c.close, c.low, c.high])

    const series = []

    // Only add candlestick series if showCandles is true
    if (showCandles) {
      series.push({
        name: is15Sec ? '15-sec Candles' : '1-min Candles',
        type: 'candlestick',
        data: ohlcData,
        itemStyle: {
          color: '#26a69a',
          color0: '#ef5350',
          borderColor: '#26a69a',
          borderColor0: '#ef5350'
        },
        markArea: {
          silent: true,
          data: prepareMarkAreas
        },
        markPoint: {
          data: preparePositionMarkers
        },
        markLine: {
          symbol: 'none',
          data: prepareThresholdLines
        }
      })
    }

    // Add MA lines only for 1-min candles
    if (!is15Sec && selectedMAs && selectedMAs.length > 0) {
      const colors = ['#1976d2', '#f57c00', '#388e3c', '#d32f2f', '#7b1fa2']
      selectedMAs.forEach((period, index) => {
        series.push({
          name: `MA${period}`,
          type: 'line',
          data: chartData.map(c => [c.time, c.movingAverages?.[period] || null]),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: colors[index % colors.length], width: 2 }
        })
      })
    }

    return {
      animation: false,
      backgroundColor: '#fff',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#ccc',
        textStyle: { color: '#333' }
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '15%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        axisLabel: { color: '#666' },
        axisLine: { lineStyle: { color: '#ddd' } }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          color: '#666',
          formatter: (value) => `$${value.toFixed(2)}`
        },
        axisLine: { lineStyle: { color: '#ddd' } },
        splitLine: { lineStyle: { color: '#f0f0f0' } }
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: '5%',
          textStyle: { color: '#666' },
          borderColor: '#ddd'
        }
      ],
      series
    }
  }, [chartData, resolution, selectedMAs, showCandles, prepareMarkAreas, preparePositionMarkers, prepareThresholdLines])

  return (
    <div className="multi-resolution-chart">
      {/* Combined Controls Bar */}
      <div className="resolution-controls">
        {/* Resolution Selector */}
        <div className="resolution-selector">
          <label>Chart Type:</label>
          <select
            value={resolution}
            onChange={(e) => handleResolutionChange(e.target.value)}
            className="resolution-dropdown"
          >
            <option value="1min">1-Minute Candles</option>
            <option value="15sec">15-Second Candles</option>
            <option value="tick">Price Ticks (3s)</option>
          </select>
        </div>

        {/* Limit Controls */}
        <div className="limit-controls">
          <label>Data Points:</label>
          <select
            value={candleLimit}
            onChange={(e) => setCandleLimit(Number(e.target.value))}
            className="limit-dropdown"
          >
            {getPresetLimits().map(preset => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {/* MA Selector - Only show for 1-min candles */}
        {resolution === '1min' && (
          <div className="ma-selector">
            <label>Add MA:</label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddMA(Number(e.target.value))
                  e.target.value = ''
                }
              }}
              className="ma-dropdown"
            >
              <option value="">Select MA</option>
              {getAvailableMAPeriods().map(period => (
                <option key={period} value={period}>MA{period}</option>
              ))}
            </select>
          </div>
        )}

        {/* MA Chips - Only show for 1-min candles */}
        {resolution === '1min' && selectedMAs && selectedMAs.length > 0 && (
          <div className="ma-chips">
            {selectedMAs.map((period, index) => {
              const colors = ['#1976d2', '#f57c00', '#388e3c', '#d32f2f', '#7b1fa2']
              const color = colors[index % colors.length]
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
        )}

        {/* Candle Toggle */}
        <div className="candle-toggle">
          <button
            className={showCandles ? 'active' : ''}
            onClick={() => setShowCandles(!showCandles)}
            title={showCandles ? 'Hide candles' : 'Show candles'}
          >
            {showCandles ? 'Hide Candles' : 'Show Candles'}
          </button>
        </div>

        {/* Position Toggle */}
        <div className="position-toggle">
          <button
            className={showPositions ? 'active' : ''}
            onClick={() => {
              console.log('Toggle button clicked. Current showPositions:', showPositions)
              setShowPositions(!showPositions)
              console.log('New showPositions will be:', !showPositions)
            }}
            title={showPositions ? 'Hide positions' : 'Show positions'}
          >
            {showPositions ? 'Hide Positions' : 'Show Positions'}
          </button>
        </div>

        {/* Stats Display - Inline */}
        {stats && (
          <div className="stats-inline">
            <span className="stat-item">
              <span className="label">Price:</span>
              <span className="value">${stats.currentPrice?.toFixed(4)}</span>
            </span>
            <span className="stat-item">
              <span className="label">Change:</span>
              <span className={`value ${stats.priceChange >= 0 ? 'positive' : 'negative'}`}>
                {stats.priceChange >= 0 ? '+' : ''}${stats.priceChange?.toFixed(4)}
                ({stats.priceChangePercent >= 0 ? '+' : ''}{stats.priceChangePercent?.toFixed(2)}%)
              </span>
            </span>
            {lastUpdate && (
              <span className="stat-item">
                <span className="label">Updated:</span>
                <span className="value">{lastUpdate.toLocaleTimeString()}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      {loading && <div className="loading">Loading chart data...</div>}
      {error && <div className="error">Error: {error}</div>}
      {!loading && !error && chartData.length > 0 && (
        <div style={{ padding: '0 10px' }}>
          <ReactECharts
            ref={chartRef}
            option={chartOption}
            style={{ height: 'calc(100vh - 140px)', width: '100%' }}
            notMerge={false}
            lazyUpdate={false}
            opts={{ renderer: 'canvas' }}
          onEvents={{
            click: (params) => {
              // Handle click on position markers
              if (params.componentType === 'markPoint' && params.data && params.data.positionId) {
                const clickedPosition = selectedPositions.find(p => p.id === params.data.positionId)
                if (clickedPosition) {
                  // Toggle selection - if same position clicked, deselect
                  if (selectedPosition && selectedPosition.id === clickedPosition.id) {
                    setSelectedPosition(null)
                  } else {
                    setSelectedPosition(clickedPosition)
                  }
                }
              }
            }
          }}
        />
        </div>
      )}
    </div>
  )
}

export default MultiResolutionChart

