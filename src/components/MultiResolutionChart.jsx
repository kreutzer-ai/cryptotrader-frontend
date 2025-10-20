import React, { useEffect, useState } from 'react'
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

  // Prepare ECharts option
  const getOption = () => {
    if (!chartData || chartData.length === 0) return {}

    const isTick = resolution === 'tick'
    const is15Sec = resolution === '15sec'

    if (isTick) {
      // Line chart for price ticks
      return {
        title: {
          text: 'SOL/USD Price Ticks (3-second intervals)',
          left: 'center',
          textStyle: { color: '#e0e0e0', fontSize: 16 }
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(50, 50, 50, 0.95)',
          borderColor: '#777',
          textStyle: { color: '#fff' },
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
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'time',
          axisLabel: {
            color: '#999',
            formatter: (value) => {
              const date = new Date(value)
              return date.toLocaleTimeString()
            }
          },
          axisLine: { lineStyle: { color: '#444' } }
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLabel: {
            color: '#999',
            formatter: (value) => `$${value.toFixed(2)}`
          },
          axisLine: { lineStyle: { color: '#444' } },
          splitLine: { lineStyle: { color: '#333' } }
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
            textStyle: { color: '#999' },
            borderColor: '#444',
            fillerColor: 'rgba(47, 69, 84, 0.25)',
            handleStyle: { color: '#666' }
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
            }
          }
        ]
      }
    }

    // Candlestick chart for 15-sec or 1-min candles
    const ohlcData = chartData.map(c => [c.time, c.open, c.close, c.low, c.high])
    
    const series = [
      {
        name: is15Sec ? '15-sec Candles' : '1-min Candles',
        type: 'candlestick',
        data: ohlcData,
        itemStyle: {
          color: '#26a69a',
          color0: '#ef5350',
          borderColor: '#26a69a',
          borderColor0: '#ef5350'
        }
      }
    ]

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
      title: {
        text: is15Sec ? 'SOL/USD 15-Second Candles' : 'SOL/USD 1-Minute Candles',
        left: 'center',
        textStyle: { color: '#e0e0e0', fontSize: 16 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(50, 50, 50, 0.95)',
        borderColor: '#777',
        textStyle: { color: '#fff' }
      },
      legend: {
        data: series.map(s => s.name),
        top: '5%',
        textStyle: { color: '#999' }
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        axisLabel: { color: '#999' },
        axisLine: { lineStyle: { color: '#444' } }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          color: '#999',
          formatter: (value) => `$${value.toFixed(2)}`
        },
        axisLine: { lineStyle: { color: '#444' } },
        splitLine: { lineStyle: { color: '#333' } }
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: '5%',
          textStyle: { color: '#999' },
          borderColor: '#444'
        }
      ],
      series
    }
  }

  return (
    <div className="multi-resolution-chart">
      {/* Resolution Selector */}
      <div className="resolution-controls">
        <div className="resolution-buttons">
          <button
            className={resolution === '1min' ? 'active' : ''}
            onClick={() => handleResolutionChange('1min')}
          >
            1-Minute Candles
          </button>
          <button
            className={resolution === '15sec' ? 'active' : ''}
            onClick={() => handleResolutionChange('15sec')}
          >
            15-Second Candles
          </button>
          <button
            className={resolution === 'tick' ? 'active' : ''}
            onClick={() => handleResolutionChange('tick')}
          >
            Price Ticks (3s)
          </button>
        </div>

        {/* Limit Controls */}
        <div className="limit-controls">
          <label>Data Points:</label>
          <input
            type="number"
            value={candleLimit}
            onChange={handleLimitChange}
            min="10"
            max="10000"
          />
          <div className="preset-buttons">
            {getPresetLimits().map(preset => (
              <button
                key={preset.label}
                onClick={() => setCandleLimit(preset.value)}
                className={candleLimit === preset.value ? 'active' : ''}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Display */}
      {stats && (
        <div className="chart-stats">
          <div className="stat">
            <span className="label">Current Price:</span>
            <span className="value">${stats.currentPrice?.toFixed(4)}</span>
          </div>
          <div className="stat">
            <span className="label">Change:</span>
            <span className={`value ${stats.priceChange >= 0 ? 'positive' : 'negative'}`}>
              {stats.priceChange >= 0 ? '+' : ''}${stats.priceChange?.toFixed(4)} 
              ({stats.priceChangePercent >= 0 ? '+' : ''}{stats.priceChangePercent?.toFixed(2)}%)
            </span>
          </div>
          <div className="stat">
            <span className="label">Data Points:</span>
            <span className="value">{stats.dataPoints}</span>
          </div>
          {stats.avgTicksPerCandle && (
            <div className="stat">
              <span className="label">Avg Ticks/Candle:</span>
              <span className="value">{stats.avgTicksPerCandle.toFixed(1)}</span>
            </div>
          )}
          {lastUpdate && (
            <div className="stat">
              <span className="label">Last Update:</span>
              <span className="value">{lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {loading && <div className="loading">Loading chart data...</div>}
      {error && <div className="error">Error: {error}</div>}
      {!loading && !error && chartData.length > 0 && (
        <ReactECharts
          option={getOption()}
          style={{ height: '600px', width: '100%' }}
          theme="dark"
        />
      )}
    </div>
  )
}

export default MultiResolutionChart

