import React, { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchDetailedLiquidationCurve, calculateLiquidationLimit } from '../services/strategyApi'
import './LiquidationCurveOverlay.css'

const LiquidationCurveOverlay = ({ onClose, currentLeverage = null }) => {
  const [curveData, setCurveData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedLeverage, setSelectedLeverage] = useState(currentLeverage || 5)
  const [calculatedData, setCalculatedData] = useState(null)

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
          fontSize: 16,
          fontWeight: 'normal'
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '15%'
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
            color: '#f44336',
            width: 2
          },
          itemStyle: {
            color: '#f44336'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(244, 67, 54, 0.3)' },
                { offset: 1, color: 'rgba(244, 67, 54, 0.05)' }
              ]
            }
          },
          markPoint: selectedLeverage && calculatedData ? {
            data: [
              {
                coord: [selectedLeverage, parseFloat(calculatedData.liquidationLimit) * 100],
                symbol: 'circle',
                symbolSize: 12,
                itemStyle: {
                  color: '#2196f3',
                  borderColor: '#fff',
                  borderWidth: 2
                },
                label: {
                  show: true,
                  formatter: `${selectedLeverage}x: ${calculatedData.liquidationLimitPercent}`,
                  position: 'top',
                  color: '#333',
                  fontSize: 12,
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
                  style={{ height: '400px', width: '100%' }}
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
                    <div className="result-row">
                      <span className="result-label">Safe Price Drop:</span>
                      <span className="result-value">{calculatedData.liquidationLimitPercent}</span>
                    </div>
                    <div className="result-info">
                      With {selectedLeverage}x leverage, your position will be liquidated if the price moves against you by more than {calculatedData.liquidationLimitPercent}.
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

              {/* Info Box */}
              <div className="liquidation-info-box">
                <h4>ℹ️ About Liquidation</h4>
                <p>
                  <strong>Liquidation</strong> occurs when your position's losses approach your collateral amount.
                  Higher leverage means lower liquidation limits (less room for price movement).
                </p>
                <p>
                  <strong>Example:</strong> With 5x leverage and a liquidation limit of 19.34%, if you enter a LONG position at $100,
                  your position will be liquidated if the price drops below $80.66 (a 19.34% drop).
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default LiquidationCurveOverlay

