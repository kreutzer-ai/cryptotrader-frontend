import React, { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchDetailedLiquidationCurve, calculateLiquidationLimit } from '../services/strategyApi'
import './LiquidationCurveOverlay.css'

const LiquidationCurveOverlay = ({ onClose, currentLeverage = null }) => {
  const [curveData, setCurveData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedLeverage, setSelectedLeverage] = useState(currentLeverage || 5)
  const [calculatedData, setCalculatedData] = useState(null)
  const [entryPrice, setEntryPrice] = useState('')
  const [liquidationPrices, setLiquidationPrices] = useState(null)

  // Load curve data on mount
  useEffect(() => {
    loadCurveData()
  }, [])

  // Calculate liquidation limit when leverage changes
  useEffect(() => {
    if (selectedLeverage) {
      calculateLimit()
    }
  }, [selectedLeverage])

  // Calculate liquidation prices when entry price or calculated data changes
  useEffect(() => {
    if (entryPrice && calculatedData) {
      calculateLiquidationPrices()
    } else {
      setLiquidationPrices(null)
    }
  }, [entryPrice, calculatedData])

  const loadCurveData = async () => {
    try {
      setLoading(true)
      const data = await fetchDetailedLiquidationCurve(200) // 200 points for smooth curve
      setCurveData(data)
    } catch (error) {
      console.error('Failed to load curve data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateLimit = async () => {
    try {
      const result = await calculateLiquidationLimit(selectedLeverage)
      setCalculatedData(result)
    } catch (error) {
      console.error('Failed to calculate liquidation limit:', error)
    }
  }

  const calculateLiquidationPrices = () => {
    const price = parseFloat(entryPrice)
    if (isNaN(price) || price <= 0 || !calculatedData) {
      setLiquidationPrices(null)
      return
    }

    const liquidationLimitDecimal = parseFloat(calculatedData.liquidationLimit)

    // For LONG: liquidation happens when price drops by liquidationLimit%
    // Liquidation price = entry price * (1 - liquidationLimit)
    const longLiquidationPrice = price * (1 - liquidationLimitDecimal)

    // For SHORT: liquidation happens when price rises by liquidationLimit%
    // Liquidation price = entry price * (1 + liquidationLimit)
    const shortLiquidationPrice = price * (1 + liquidationLimitDecimal)

    setLiquidationPrices({
      long: longLiquidationPrice.toFixed(4),
      short: shortLiquidationPrice.toFixed(4),
      longDrop: (liquidationLimitDecimal * 100).toFixed(2),
      shortRise: (liquidationLimitDecimal * 100).toFixed(2)
    })
  }

  const getChartOption = () => {
    if (!curveData || !curveData.curvePoints) {
      return {}
    }

    const chartData = curveData.curvePoints.map(point => [
      parseFloat(point.leverage),
      parseFloat(point.liquidationLimit) * 100 // Convert to percentage
    ])

    return {
      title: {
        text: 'Liquidation Limit vs Leverage',
        left: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 'normal',
          color: '#555'
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '12%',
        bottom: '12%'
      },
      xAxis: {
        type: 'value',
        name: 'Leverage',
        nameLocation: 'middle',
        nameGap: 30,
        min: 1,
        max: 100,
        axisLabel: {
          formatter: '{value}x'
        }
      },
      yAxis: {
        type: 'value',
        name: 'Liquidation Limit (%)',
        nameLocation: 'middle',
        nameGap: 50,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          type: 'line',
          data: chartData,
          smooth: false,
          lineStyle: {
            color: '#2196f3',
            width: 2
          },
          itemStyle: {
            color: '#2196f3'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(33, 150, 243, 0.3)' },
                { offset: 1, color: 'rgba(33, 150, 243, 0.05)' }
              ]
            }
          },
          markPoint: selectedLeverage && calculatedData ? {
            data: [
              {
                coord: [selectedLeverage, parseFloat(calculatedData.liquidationLimit) * 100],
                symbol: 'circle',
                symbolSize: 10,
                itemStyle: {
                  color: '#1976d2',
                  borderColor: '#fff',
                  borderWidth: 2
                },
                label: {
                  show: true,
                  formatter: `${selectedLeverage}x: ${calculatedData.liquidationLimitPercent}`,
                  position: 'top',
                  color: '#333',
                  fontSize: 11,
                  fontWeight: 'bold'
                }
              }
            ]
          } : undefined
        }
      ],
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const leverage = params[0].data[0].toFixed(1)
          const limit = params[0].data[1].toFixed(2)
          return `<b>Leverage:</b> ${leverage}x<br/><b>Liquidation Limit:</b> ${limit}%`
        }
      }
    }
  }

  const leverageOptions = [1.1, 2, 3, 5, 7, 10, 15, 20, 30, 50, 70, 100]

  return (
    <>
      {/* Backdrop */}
      <div className="liquidation-overlay-backdrop" onClick={onClose}></div>

      {/* Overlay */}
      <div className="liquidation-overlay">
        {/* Header */}
        <div className="liquidation-overlay-header">
          <h2>Liquidation Limit Calculator</h2>
          <button className="liquidation-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Content */}
        <div className="liquidation-overlay-content">
          {loading ? (
            <div className="liquidation-loading">Loading curve data...</div>
          ) : (
            <>
              {/* Chart */}
              <div className="liquidation-chart-container">
                <ReactECharts
                  option={getChartOption()}
                  style={{ height: '300px', width: '100%' }}
                  notMerge={true}
                />
              </div>

              {/* Calculator */}
              <div className="liquidation-calculator">
                <h3>Calculate Liquidation Limit</h3>
                <div className="calculator-row">
                  <label>Leverage:</label>
                  <div className="leverage-input-group">
                    <select
                      value={selectedLeverage}
                      onChange={(e) => setSelectedLeverage(parseFloat(e.target.value))}
                    >
                      {leverageOptions.map(lev => (
                        <option key={lev} value={lev}>{lev}x</option>
                      ))}
                    </select>
                    <span className="input-separator">or</span>
                    <input
                      type="number"
                      min="1.1"
                      max="100"
                      step="0.1"
                      value={selectedLeverage}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val) && val >= 1.1 && val <= 100) {
                          setSelectedLeverage(val)
                        }
                      }}
                      placeholder="Type leverage"
                      className="leverage-input"
                    />
                  </div>
                </div>

                {calculatedData && (
                  <div className="calculator-results">
                    <div className="result-row">
                      <span className="result-label">Liquidation Limit:</span>
                      <span className="result-value highlight">{calculatedData.liquidationLimitPercent}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Price-based Liquidation Calculator */}
              <div className="liquidation-calculator">
                <h3>Calculate Liquidation Prices</h3>
                <div className="calculator-row">
                  <label>Entry Price:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder="Enter price (e.g., 100.50)"
                    className="price-input"
                  />
                </div>

                {liquidationPrices && (
                  <div className="calculator-results">
                    <div className="liquidation-prices-grid">
                      <div className="liquidation-price-card long">
                        <div className="card-header">LONG Position</div>
                        <div className="card-body">
                          <div className="price-display">
                            <span className="price-label">Liquidation Price:</span>
                            <span className="price-value">${liquidationPrices.long}</span>
                          </div>
                          <div className="price-info">
                            Price drops by {liquidationPrices.longDrop}%
                          </div>
                          <div className="price-calculation">
                            ${entryPrice} → ${liquidationPrices.long}
                          </div>
                        </div>
                      </div>
                      <div className="liquidation-price-card short">
                        <div className="card-header">SHORT Position</div>
                        <div className="card-body">
                          <div className="price-display">
                            <span className="price-label">Liquidation Price:</span>
                            <span className="price-value">${liquidationPrices.short}</span>
                          </div>
                          <div className="price-info">
                            Price rises by {liquidationPrices.shortRise}%
                          </div>
                          <div className="price-calculation">
                            ${entryPrice} → ${liquidationPrices.short}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Strategy Info */}
              {currentLeverage && (
                <div className="current-strategy-info">
                  <h3>Current Strategy</h3>
                  <div className="strategy-detail">
                    <span className="detail-label">Leverage:</span>
                    <span className="detail-value">{currentLeverage}x</span>
                  </div>
                  <div className="strategy-detail">
                    <span className="detail-label">Liquidation Limit:</span>
                    <span className="detail-value highlight">
                      {calculatedData && selectedLeverage === currentLeverage
                        ? calculatedData.liquidationLimitPercent
                        : 'Select leverage to calculate'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default LiquidationCurveOverlay

