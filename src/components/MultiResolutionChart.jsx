import React, { useEffect, useState, useRef, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  fetchCandles,
  fetchCandlesRange,
  fetchPriceTicks,
  fetchPriceTicksRange,
  fetch15SecCandles,
  fetch15SecCandlesRange,
  exportCandlesCsv,
  export15SecCandlesCsv,
  exportPriceTicksCsv,
  exportAllCandlesCsv,
  exportAll15SecCandlesCsv,
  exportAllPriceTicksCsv,
  fetchAvailableIndicators
} from '../services/cryptotraderApi'
import './MultiResolutionChart.css'

const MultiResolutionChart = ({
  selectedMAs,
  setSelectedMAs,
  cycles = [],
  selectedPositions = [],
  selectedStrategy = null,
  candleLimit = 3600, // Default to 1 hour for 1-min candles
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
  const [selectedMADerivations, setSelectedMADerivations] = useState([]) // MA derivations to display
  const [selectedIndicators, setSelectedIndicators] = useState([]) // Selected indicators to display
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [dataZoomState, setDataZoomState] = useState(null) // Track zoom/pan state (null = use default)
  const chartRef = useRef(null)
  const prevDataRef = useRef(null)
  const userHasZoomedRef = useRef(false) // Track if user has manually zoomed
  const SOL_MINT = 'So11111111111111111111111111111111111111112'

  // Available indicators (loaded from backend)
  const [availableIndicators, setAvailableIndicators] = useState([])

  // Indicator management
  const handleAddIndicator = (indicatorKey) => {
    if (!selectedIndicators.includes(indicatorKey)) {
      setSelectedIndicators([...selectedIndicators, indicatorKey])
    }
  }

  const handleRemoveIndicator = (indicatorKey) => {
    setSelectedIndicators(selectedIndicators.filter(key => key !== indicatorKey))
  }

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
    // Return all periods 1-200 that aren't already selected
    const allPeriods = Array.from({ length: 200 }, (_, i) => i + 1)
    return allPeriods.filter(p => !selectedMADerivations.includes(p))
  }

  // Export handlers
  const handleExportCandles = async () => {
    try {
      setExporting(true)
      setExportError(null)
      await exportCandlesCsv(SOL_MINT, candleLimit)
    } catch (err) {
      console.error('Export error:', err)
      setExportError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExport15SecCandles = async () => {
    try {
      setExporting(true)
      setExportError(null)
      await export15SecCandlesCsv(SOL_MINT, candleLimit)
    } catch (err) {
      console.error('Export error:', err)
      setExportError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportPriceTicks = async () => {
    try {
      setExporting(true)
      setExportError(null)
      await exportPriceTicksCsv(SOL_MINT, candleLimit)
    } catch (err) {
      console.error('Export error:', err)
      setExportError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportAllCandles = async () => {
    try {
      setExporting(true)
      setExportError(null)
      await exportAllCandlesCsv(SOL_MINT)
    } catch (err) {
      console.error('Export error:', err)
      setExportError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportAll15SecCandles = async () => {
    try {
      setExporting(true)
      setExportError(null)
      await exportAll15SecCandlesCsv(SOL_MINT)
    } catch (err) {
      console.error('Export error:', err)
      setExportError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleExportAllPriceTicks = async () => {
    try {
      setExporting(true)
      setExportError(null)
      await exportAllPriceTicksCsv(SOL_MINT)
    } catch (err) {
      console.error('Export error:', err)
      setExportError(err.message)
    } finally {
      setExporting(false)
    }
  }

  // Resolution-specific presets (now in seconds for time ranges)
  const getPresetTimeRanges = () => {
    switch (resolution) {
      case 'tick':
        return [
          { label: '1min', seconds: 60 },
          { label: '5min', seconds: 300 },
          { label: '15min', seconds: 900 },
          { label: '30min', seconds: 1800 },
          { label: '1h', seconds: 3600 },
          { label: '2h', seconds: 7200 },
          { label: '4h', seconds: 14400 },
          { label: '8h', seconds: 28800 },
          { label: '12h', seconds: 43200 },
          { label: '1d', seconds: 86400 },
          { label: '2d', seconds: 172800 },
          { label: '3d', seconds: 259200 },
          { label: '1w', seconds: 604800 }
        ]
      case '15sec':
        return [
          { label: '15min', seconds: 900 },
          { label: '30min', seconds: 1800 },
          { label: '1h', seconds: 3600 },
          { label: '2h', seconds: 7200 },
          { label: '4h', seconds: 14400 },
          { label: '8h', seconds: 28800 },
          { label: '12h', seconds: 43200 },
          { label: '1d', seconds: 86400 },
          { label: '2d', seconds: 172800 },
          { label: '3d', seconds: 259200 },
          { label: '1w', seconds: 604800 }
        ]
      case '1min':
      default:
        return [
          { label: '1h', seconds: 3600 },
          { label: '2h', seconds: 7200 },
          { label: '4h', seconds: 14400 },
          { label: '8h', seconds: 28800 },
          { label: '12h', seconds: 43200 },
          { label: '1d', seconds: 86400 },
          { label: '2d', seconds: 172800 },
          { label: '3d', seconds: 259200 },
          { label: '1w', seconds: 604800 },
          { label: '2w', seconds: 1209600 },
          { label: '1mo', seconds: 2592000 }
        ]
    }
  }

  const handleTimeRangeChange = (e) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value >= 60 && value <= 2592000) {
      setCandleLimit(value)
      // Reset zoom when time range changes
      setDataZoomState(null)
      userHasZoomedRef.current = false
    }
  }

  const handleResolutionChange = (newResolution) => {
    setResolution(newResolution)
    // Reset zoom when resolution changes
    setDataZoomState(null)
    userHasZoomedRef.current = false
    // Adjust time range based on resolution (in seconds)
    if (newResolution === 'tick') {
      setCandleLimit(300) // Default: 5 minutes
    } else if (newResolution === '15sec') {
      setCandleLimit(3600) // Default: 1 hour
    } else {
      setCandleLimit(3600) // Default: 1 hour
    }
  }

  // Load available indicators when resolution changes
  useEffect(() => {
    const loadIndicators = async () => {
      try {
        const indicators = await fetchAvailableIndicators(resolution)
        console.log('Loaded indicators for', resolution, ':', indicators)
        setAvailableIndicators(indicators)
      } catch (error) {
        console.error('Error loading indicators:', error)
        setAvailableIndicators([])
      }
    }

    if (resolution === '1min' || resolution === '15sec') {
      loadIndicators()
    } else {
      setAvailableIndicators([])
    }
  }, [resolution])

  // Load data based on resolution
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        let data
        const mint = 'So11111111111111111111111111111111111111112'

        // Calculate time range (candleLimit is now in seconds)
        const now = Math.floor(Date.now() / 1000) // Current time in seconds
        const startTime = now - candleLimit // Go back by the time range
        const endTime = now

        console.log(`Fetching ${resolution} data - Time range: ${candleLimit}s (${new Date(startTime * 1000).toISOString()} to ${new Date(endTime * 1000).toISOString()})`)

        if (resolution === 'tick') {
          // Fetch price ticks in time range
          data = await fetchPriceTicksRange(mint, startTime, endTime)
          console.log(`Fetched ${data.length} price ticks`)

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
          // Fetch 15-second candles in time range
          data = await fetch15SecCandlesRange(mint, startTime, endTime)
          console.log(`Fetched ${data.length} 15-second candles`)

          const dataWithMs = data.map((candle, index) => {
            // Calculate MA derivations (compare with previous candle)
            const maDerivations = {}
            const maDerivationPercents = {}
            if (index > 0 && candle.movingAverages) {
              const prevCandle = data[index - 1]
              if (prevCandle && prevCandle.movingAverages) {
                Object.keys(candle.movingAverages).forEach(period => {
                  const currentMA = parseFloat(candle.movingAverages[period])
                  const prevMA = parseFloat(prevCandle.movingAverages[period])
                  if (!isNaN(currentMA) && !isNaN(prevMA) && prevMA !== 0) {
                    const derivation = currentMA - prevMA
                    const derivationPercent = (derivation / prevMA) * 100
                    maDerivations[period] = derivation
                    maDerivationPercents[period] = derivationPercent
                  }
                })
              }
            }

            return {
              time: candle.time * 1000,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              numberOfTicks: candle.numberOfTicks,
              complete: candle.complete,
              movingAverages: candle.movingAverages || {},
              indicators: candle.indicators || {},
              maDerivations,
              maDerivationPercents,
              direction: candle.direction,
              type: 'candle'
            }
          })

          console.log(`Fetched ${dataWithMs.length} 15-sec candles`)
          if (dataWithMs.length > 0) {
            console.log('Sample 15-sec candle:', dataWithMs[0])
            console.log('Indicators in first candle:', dataWithMs[0].indicators)
          }

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
          // Fetch 1-minute candles in time range
          data = await fetchCandlesRange(mint, startTime, endTime)
          console.log(`Fetched ${data.length} 1-minute candles`)

          const dataWithMs = data.map((candle, index) => {
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
              ...candle,
              time: candle.time * 1000,
              type: 'candle',
              maDerivations,
              maDerivationPercents
            }
          })

          console.log(`Fetched ${dataWithMs.length} 1-minute candles`)
          if (dataWithMs.length > 0) {
            console.log('Sample 1-min candle:', dataWithMs[0])
            console.log('Indicators in first candle:', dataWithMs[0].indicators)
            console.log('Available indicator keys:', Object.keys(dataWithMs[0].indicators || {}))
          }

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
          min: () => {
            // Set min to the start of the requested time range
            const now = Date.now()
            return now - (candleLimit * 1000)
          },
          max: () => {
            // Set max to current time
            return Date.now()
          },
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
            start: dataZoomState?.start ?? 0,
            end: dataZoomState?.end ?? 100
          },
          {
            type: 'slider',
            start: dataZoomState?.start ?? 0,
            end: dataZoomState?.end ?? 100,
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
          lineStyle: { color: colors[index % colors.length], width: 2 },
          yAxisIndex: 0
        })
      })
    }

    // Add MA derivation lines only for 1-min candles
    if (!is15Sec && selectedMADerivations && selectedMADerivations.length > 0) {
      const colors = ['#9c27b0', '#e91e63', '#ff5722', '#795548', '#607d8b']
      selectedMADerivations.forEach((period, index) => {
        series.push({
          name: `MA${period} Δ%`,
          type: 'line',
          data: chartData.map(c => [c.time, c.maDerivationPercents?.[String(period)] || null]),
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: colors[index % colors.length],
            width: 1.5,
            type: 'dashed'
          },
          yAxisIndex: 1
        })
      })
    }

    // Add indicator lines in separate sub-charts
    const indicatorGrids = []
    const indicatorXAxes = []
    const indicatorYAxes = []
    const indicatorSeries = []

    if (!isTick && selectedIndicators.length > 0) {
      console.log('Adding indicator sub-charts, selectedIndicators:', selectedIndicators)
      console.log('Available indicators:', availableIndicators)

      const colors = ['#ff9800', '#03a9f4', '#4caf50', '#e91e63', '#9c27b0']
      const numIndicators = selectedIndicators.length

      // Calculate grid heights
      // Main chart gets 60%, indicators share the remaining 40%
      const mainChartHeight = 60
      const indicatorTotalHeight = 35
      const indicatorHeight = indicatorTotalHeight / numIndicators

      selectedIndicators.forEach((indicatorKey, index) => {
        const indicator = availableIndicators.find(ind => ind.key === indicatorKey)
        console.log(`Looking for indicator ${indicatorKey}, found:`, indicator)
        if (!indicator) {
          console.warn(`Indicator ${indicatorKey} not found in availableIndicators`)
          return
        }

        const indicatorData = chartData.map(c => {
          const value = c.indicators?.[indicatorKey]
          return [c.time, value !== undefined && value !== null ? Number(value) : null]
        }).filter(([time, value]) => value !== null)

        console.log(`Indicator ${indicatorKey} data points:`, indicatorData.length, 'sample:', indicatorData.slice(0, 3))

        // Grid for this indicator sub-chart
        const gridTop = mainChartHeight + (index * indicatorHeight)
        indicatorGrids.push({
          left: '3%',
          right: '3%',
          top: `${gridTop}%`,
          height: `${indicatorHeight - 2}%`,
          containLabel: true
        })

        // X-axis for this indicator (linked to main chart with same min/max)
        indicatorXAxes.push({
          type: 'time',
          gridIndex: index + 1,
          show: index === numIndicators - 1, // Only show on last indicator
          min: () => {
            const now = Date.now()
            return now - (candleLimit * 1000)
          },
          max: () => Date.now(),
          axisLabel: { color: '#666' },
          axisLine: { lineStyle: { color: '#ddd' } }
        })

        // Y-axis for this indicator - auto-scale based on actual data range
        // Calculate min/max from actual data for better visibility
        const values = indicatorData.map(([time, value]) => value).filter(v => v !== null)
        let minValue = Math.min(...values)
        let maxValue = Math.max(...values)

        // Add 5% padding for better visibility
        const range = maxValue - minValue
        const padding = range * 0.05
        minValue = minValue - padding
        maxValue = maxValue + padding

        const yAxisConfig = {
          type: 'value',
          gridIndex: index + 1,
          scale: true,
          min: minValue,
          max: maxValue,
          name: indicator.label,
          nameTextStyle: { color: colors[index % colors.length], fontSize: 11 },
          axisLabel: {
            color: '#666',
            formatter: (value) => value.toFixed(2)
          },
          axisLine: { lineStyle: { color: '#ddd' } },
          splitLine: { lineStyle: { color: '#f5f5f5' } }
        }

        indicatorYAxes.push(yAxisConfig)

        // Series for this indicator
        indicatorSeries.push({
          name: indicator.label,
          type: 'line',
          data: indicatorData,
          xAxisIndex: index + 1,
          yAxisIndex: index + 1 + (selectedMADerivations.length > 0 ? 1 : 0),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: colors[index % colors.length], width: 2 }
        })
      })

      // Add all indicator series to main series array
      series.push(...indicatorSeries)
    }

    console.log('Total series count:', series.length)
    console.log('All series:', series.map(s => ({ name: s.name, type: s.type, dataPoints: s.data?.length })))

    // Calculate main chart height based on number of indicators
    const hasIndicators = selectedIndicators.length > 0
    const mainChartHeight = hasIndicators ? 60 : 85

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
      grid: [
        // Main chart grid
        {
          left: '3%',
          right: '3%',
          top: '3%',
          height: `${mainChartHeight}%`,
          containLabel: true
        },
        // Indicator sub-chart grids
        ...indicatorGrids
      ],
      xAxis: [
        // Main chart X-axis
        {
          type: 'time',
          gridIndex: 0,
          show: !hasIndicators, // Hide if indicators are shown (they have their own)
          min: () => {
            const now = Date.now()
            return now - (candleLimit * 1000)
          },
          max: () => Date.now(),
          axisLabel: { color: '#666' },
          axisLine: { lineStyle: { color: '#ddd' } }
        },
        // Indicator X-axes
        ...indicatorXAxes
      ],
      yAxis: [
        // Main chart Y-axis (price)
        {
          type: 'value',
          gridIndex: 0,
          scale: true,
          position: 'left',
          axisLabel: {
            color: '#666',
            formatter: (value) => `$${value.toFixed(2)}`
          },
          axisLine: { lineStyle: { color: '#ddd' } },
          splitLine: { lineStyle: { color: '#f0f0f0' } }
        },
        // Second Y-axis for MA derivations (percentage)
        ...(selectedMADerivations.length > 0 ? [{
          type: 'value',
          gridIndex: 0,
          scale: true,
          position: 'right',
          offset: 0,
          axisLabel: {
            color: '#9c27b0',
            formatter: (value) => `${value.toFixed(2)}%`
          },
          axisLine: { lineStyle: { color: '#ddd' } },
          splitLine: { show: false }
        }] : []),
        // Indicator Y-axes
        ...indicatorYAxes
      ],
      dataZoom: [
        {
          type: 'inside',
          start: dataZoomState?.start ?? 0,
          end: dataZoomState?.end ?? 100,
          xAxisIndex: [0, ...indicatorXAxes.map((_, i) => i + 1)] // Link all X-axes
        },
        {
          type: 'slider',
          start: dataZoomState?.start ?? 0,
          end: dataZoomState?.end ?? 100,
          bottom: '2%',
          height: 20,
          textStyle: { color: '#666' },
          borderColor: '#ddd',
          xAxisIndex: [0, ...indicatorXAxes.map((_, i) => i + 1)] // Link all X-axes
        }
      ],
      series
    }
  }, [chartData, resolution, selectedMAs, selectedMADerivations, selectedIndicators, availableIndicators, showCandles, prepareMarkAreas, preparePositionMarkers, prepareThresholdLines, dataZoomState, candleLimit])

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

        {/* Time Range Controls */}
        <div className="limit-controls">
          <label>Time Range:</label>
          <select
            value={candleLimit}
            onChange={(e) => {
              setCandleLimit(Number(e.target.value))
              // Reset zoom when preset changes
              setDataZoomState(null)
              userHasZoomedRef.current = false
            }}
            className="limit-dropdown"
          >
            {getPresetTimeRanges().map(preset => (
              <option key={preset.seconds} value={preset.seconds}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
          <input
            type="number"
            value={candleLimit}
            onChange={handleTimeRangeChange}
            min="60"
            max="2592000"
            step="60"
            className="limit-input"
            placeholder="Seconds"
            title="Enter custom time range in seconds (60-2592000)"
          />
        </div>

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

        {/* MA Derivation Chips - Only show for 1-min candles */}
        {resolution === '1min' && selectedMADerivations && selectedMADerivations.length > 0 && (
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

        {/* Indicator Selector - Only show for 1-min candles */}
        {resolution === '1min' && (
          <div className="indicator-selector">
            <label>Add Indicator:</label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddIndicator(e.target.value)
                  e.target.value = '' // Reset selection
                }
              }}
              className="indicator-dropdown"
            >
              <option value="">Select...</option>
              {availableIndicators
                .filter(ind => !selectedIndicators.includes(ind.key))
                .map(ind => (
                  <option key={ind.key} value={ind.key}>
                    {ind.label}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Indicator Chips - Only show for 1-min candles */}
        {resolution === '1min' && selectedIndicators.length > 0 && (
          <div className="indicator-chips">
            {selectedIndicators.map((indicatorKey, index) => {
              const indicator = availableIndicators.find(ind => ind.key === indicatorKey)
              if (!indicator) return null

              const colors = ['#ff9800', '#03a9f4', '#4caf50', '#e91e63', '#9c27b0']
              const color = colors[index % colors.length]
              return (
                <div
                  key={indicatorKey}
                  className="indicator-chip"
                  style={{ borderColor: color, color: color }}
                >
                  <span>{indicator.label}</span>
                  <button
                    className="indicator-remove-btn"
                    onClick={() => handleRemoveIndicator(indicatorKey)}
                    title={`Remove ${indicator.label}`}
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

        {/* Export Menu */}
        <div className="export-menu-container">
          <button
            className="export-menu-btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={exporting}
            title="Export data as CSV"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>

          {showExportMenu && (
            <div className="export-dropdown">
              <div className="export-section">
                <div className="export-section-title">Shown Data</div>
                <button
                  className="export-menu-item"
                  onClick={() => {
                    handleExportCandles()
                    setShowExportMenu(false)
                  }}
                  disabled={exporting || !chartData.length}
                >
                  1-min Candles
                </button>
                <button
                  className="export-menu-item"
                  onClick={() => {
                    handleExport15SecCandles()
                    setShowExportMenu(false)
                  }}
                  disabled={exporting || !chartData.length}
                >
                  15-sec Candles
                </button>
                <button
                  className="export-menu-item"
                  onClick={() => {
                    handleExportPriceTicks()
                    setShowExportMenu(false)
                  }}
                  disabled={exporting || !chartData.length}
                >
                  Price Ticks
                </button>
              </div>

              <div className="export-section">
                <div className="export-section-title">All Data</div>
                <button
                  className="export-menu-item export-menu-item-all"
                  onClick={() => {
                    handleExportAllCandles()
                    setShowExportMenu(false)
                  }}
                  disabled={exporting}
                >
                  1-min Candles (All)
                </button>
                <button
                  className="export-menu-item export-menu-item-all"
                  onClick={() => {
                    handleExportAll15SecCandles()
                    setShowExportMenu(false)
                  }}
                  disabled={exporting}
                >
                  15-sec Candles (All)
                </button>
                <button
                  className="export-menu-item export-menu-item-all"
                  onClick={() => {
                    handleExportAllPriceTicks()
                    setShowExportMenu(false)
                  }}
                  disabled={exporting}
                >
                  Price Ticks (All)
                </button>
              </div>
            </div>
          )}

          {exportError && (
            <div className="export-error" title={exportError}>
              ⚠️ {exportError}
            </div>
          )}
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
            },
            dataZoom: (params) => {
              console.log('dataZoom event:', params)

              // Only capture if user has manually interacted with zoom
              // We detect user interaction by checking if the zoom values are different from defaults
              let zoomStart, zoomEnd

              if (params.batch && params.batch.length > 0) {
                const zoom = params.batch[0]
                zoomStart = zoom.start
                zoomEnd = zoom.end
              } else {
                zoomStart = params.start
                zoomEnd = params.end
              }

              // If zoom values are undefined, skip
              if (zoomStart === undefined || zoomEnd === undefined) {
                return
              }

              // Check if this is different from default (0, 100)
              const isNotDefault = Math.abs(zoomStart - 0) > 0.1 || Math.abs(zoomEnd - 100) > 0.1

              if (isNotDefault) {
                // User has zoomed - mark it and save state
                userHasZoomedRef.current = true
                setDataZoomState({ start: zoomStart, end: zoomEnd })
              } else if (userHasZoomedRef.current) {
                // User previously zoomed, now back to default - save it
                setDataZoomState({ start: zoomStart, end: zoomEnd })
              }
              // Otherwise, ignore (initial render with default values)
            }
          }}
        />
        </div>
      )}
    </div>
  )
}

export default MultiResolutionChart

