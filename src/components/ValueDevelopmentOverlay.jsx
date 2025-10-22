import React, { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { fetchCycles } from '../services/cryptotraderApi'
import './ValueDevelopmentOverlay.css'

const ValueDevelopmentOverlay = ({ onClose, selectedStrategy }) => {
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (selectedStrategy) {
      loadCycles()
    }
  }, [selectedStrategy])

  const loadCycles = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchCycles({ strategyConfigId: selectedStrategy.id })
      setCycles(data)
    } catch (err) {
      console.error('Failed to load cycles:', err)
      setError('Failed to load strategy data')
    } finally {
      setLoading(false)
    }
  }

  const buildChartData = () => {
    if (!cycles || cycles.length === 0) {
      return { timestamps: [], values: [], pnls: [] }
    }

    // Sort all cycles by start time
    const sortedCycles = [...cycles].sort((a, b) =>
      new Date(a.startTime) - new Date(b.startTime)
    )

    const timestamps = []
    const values = []
    const pnls = []

    // Add each cycle's starting balance at its start time
    sortedCycles.forEach(cycle => {
      timestamps.push(new Date(cycle.startTime).getTime())
      values.push(cycle.startingBalance || 0)
      pnls.push(0) // No PnL at start
    })

    return { timestamps, values, pnls }
  }

  const getChartOption = () => {
    const { timestamps, values, pnls } = buildChartData()

    if (timestamps.length === 0) {
      return null
    }

    return {
      title: {
        text: `${selectedStrategy?.strategyName || 'Strategy'} - Value Development`,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 600,
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const date = new Date(params[0].value[0])
          const value = params[0].value[1]
          const pnl = pnls[params[0].dataIndex]
          
          return `
            <div style="font-size: 12px;">
              <div style="margin-bottom: 4px;"><b>${date.toLocaleString()}</b></div>
              <div style="color: #333;">Total Value: <b>$${value.toFixed(2)}</b></div>
              ${pnl !== undefined ? `<div style="color: ${pnl >= 0 ? '#2e7d32' : '#c62828'};">Cycle P&L: <b>${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}</b></div>` : ''}
            </div>
          `
        }
      },
      grid: {
        left: '60px',
        right: '40px',
        top: '80px',
        bottom: '60px'
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          formatter: (value) => {
            const date = new Date(value)
            return date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          },
          rotate: 45,
          fontSize: 10
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'Total Value ($)',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: {
          fontSize: 12,
          fontWeight: 600,
          color: '#666'
        },
        axisLabel: {
          formatter: (value) => `$${value.toFixed(0)}`,
          fontSize: 11,
          color: '#666'
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#e0e0e0',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: 'Total Value',
          type: 'line',
          data: timestamps.map((time, idx) => [time, values[idx]]),
          smooth: false,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: '#4a90e2'
          },
          itemStyle: {
            color: '#4a90e2'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(74, 144, 226, 0.3)' },
                { offset: 1, color: 'rgba(74, 144, 226, 0.05)' }
              ]
            }
          }
        }
      ]
    }
  }

  const calculateStats = () => {
    if (cycles.length === 0) {
      return {
        startValue: 0,
        currentValue: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        closedCycles: 0,
        profitableCycles: 0
      }
    }

    // Sort cycles by start time
    const sortedCycles = [...cycles].sort((a, b) =>
      new Date(a.startTime) - new Date(b.startTime)
    )

    const startValue = sortedCycles[0].startingBalance || 0
    const currentValue = selectedStrategy.simulatedBalance || 0
    const totalPnl = currentValue - startValue
    const totalPnlPercent = startValue > 0 ? (totalPnl / startValue) * 100 : 0

    const closedCycles = cycles.filter(c => c.status !== 'ACTIVE' && c.status !== 'WAITING').length
    const profitableCycles = cycles.filter(c => (c.netPnl || 0) > 0 && c.status !== 'ACTIVE' && c.status !== 'WAITING').length

    return {
      startValue,
      currentValue,
      totalPnl,
      totalPnlPercent,
      closedCycles,
      profitableCycles
    }
  }

  const stats = calculateStats()
  const chartOption = getChartOption()

  return (
    <>
      {/* Backdrop */}
      <div className="value-dev-overlay-backdrop" onClick={onClose}></div>

      {/* Overlay */}
      <div className="value-dev-overlay">
        {/* Header */}
        <div className="value-dev-overlay-header">
          <h2>Strategy Value Development</h2>
          <button className="value-dev-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Content */}
        <div className="value-dev-overlay-content">
          {loading ? (
            <div className="value-dev-loading">Loading strategy data...</div>
          ) : error ? (
            <div className="value-dev-error">{error}</div>
          ) : !selectedStrategy ? (
            <div className="value-dev-empty">No strategy selected</div>
          ) : (
            <>
              {/* Stats Summary */}
              <div className="value-dev-stats">
                <div className="stat-card">
                  <div className="stat-label">Starting Value</div>
                  <div className="stat-value">${stats.startValue.toFixed(2)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Current Value</div>
                  <div className="stat-value">${stats.currentValue.toFixed(2)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total P&L</div>
                  <div className={`stat-value ${stats.totalPnl >= 0 ? 'positive' : 'negative'}`}>
                    {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total P&L %</div>
                  <div className={`stat-value ${stats.totalPnlPercent >= 0 ? 'positive' : 'negative'}`}>
                    {stats.totalPnlPercent >= 0 ? '+' : ''}{stats.totalPnlPercent.toFixed(2)}%
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Closed Cycles</div>
                  <div className="stat-value">{stats.closedCycles}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Profitable</div>
                  <div className="stat-value">
                    {stats.profitableCycles}/{stats.closedCycles}
                  </div>
                </div>
              </div>

              {/* Chart */}
              {chartOption ? (
                <div className="value-dev-chart">
                  <ReactECharts 
                    option={chartOption} 
                    style={{ height: '500px', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                </div>
              ) : (
                <div className="value-dev-empty">No cycle data available for this strategy</div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default ValueDevelopmentOverlay

