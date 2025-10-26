import React, { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart
} from 'recharts'
import { getAuthHeader } from '../services/authService'
import './PriceRangePnLChart.css'

/**
 * Price Range PnL Chart Component
 * Shows total cycle gain/loss across a range of prices
 */
export function PriceRangePnLChart({ cycleId, currentPrice }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [stepSize, setStepSize] = useState('0.5')

  useEffect(() => {
    if (currentPrice) {
      // Set default range: ±20% from current price
      const min = (currentPrice * 0.8).toFixed(2)
      const max = (currentPrice * 1.2).toFixed(2)
      setMinPrice(min)
      setMaxPrice(max)
      fetchPriceRangePnL(min, max, '0.5')
    }
  }, [cycleId, currentPrice])

  const fetchPriceRangePnL = async (min, max, step) => {
    try {
      setLoading(true)
      setError(null)

      const authHeader = getAuthHeader()
      console.log('Price Range PnL - Auth header:', authHeader)

      const response = await fetch(
        `/api/cryptotrader/v1/cycles/${cycleId}/price-range-pnl?` +
        `minPrice=${min}&maxPrice=${max}&stepSize=${step}`,
        {
          headers: authHeader
        }
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()

      // Transform data for chart
      const chartData = result.pricePoints.map(point => ({
        price: parseFloat(point.price).toFixed(2),
        pnlPercent: (parseFloat(point.pnlPercent) * 100).toFixed(2),
        pnlAmount: parseFloat(point.pnlAmount).toFixed(2),
        isLiquidated: point.isLiquidated
      }))

      setData(chartData)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching price range PnL:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    if (minPrice && maxPrice) {
      fetchPriceRangePnL(minPrice, maxPrice, stepSize)
    }
  }

  const handleAutoRange = () => {
    if (currentPrice) {
      const min = (currentPrice * 0.8).toFixed(2)
      const max = (currentPrice * 1.2).toFixed(2)
      setMinPrice(min)
      setMaxPrice(max)
      fetchPriceRangePnL(min, max, stepSize)
    }
  }

  if (loading) {
    return <div className="price-range-chart loading">Loading price range analysis...</div>
  }

  if (error) {
    return <div className="price-range-chart error">Error: {error}</div>
  }

  if (!data || data.length === 0) {
    return <div className="price-range-chart empty">No data available</div>
  }

  // Find current price in data for reference line
  const currentPriceStr = currentPrice?.toFixed(2)

  return (
    <div className="price-range-chart">

      {/* Controls */}
      <div className="chart-controls">
        <div className="control-group">
          <label>Min Price:</label>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            step="0.01"
          />
        </div>

        <div className="control-group">
          <label>Max Price:</label>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            step="0.01"
          />
        </div>

        <div className="control-group">
          <label>Step Size:</label>
          <input
            type="number"
            value={stepSize}
            onChange={(e) => setStepSize(e.target.value)}
            step="0.1"
            min="0.1"
          />
        </div>

        <button onClick={handleRefresh} className="btn-refresh">
          🔄 Refresh
        </button>

        <button onClick={handleAutoRange} className="btn-auto">
          📍 Auto Range (±20%)
        </button>
      </div>

      {/* Chart */}
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="90%">
          <ComposedChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="price"
              label={{ value: 'Price ($)', position: 'insideBottomRight', offset: -5 }}
              stroke="#666"
            />
            <YAxis
              label={{ value: 'PnL %', angle: -90, position: 'insideLeft' }}
              stroke="#666"
            />

            {/* Breakeven line */}
            <ReferenceLine
              y={0}
              stroke="#999"
              strokeDasharray="5 5"
              label={{ value: 'Breakeven', position: 'right', fill: '#999' }}
            />

            {/* Current price line */}
            {currentPriceStr && (
              <ReferenceLine
                x={currentPriceStr}
                stroke="#2196F3"
                strokeWidth={2}
                label={{ value: `Current: $${currentPriceStr}`, position: 'top', fill: '#2196F3' }}
              />
            )}

            {/* PnL line */}
            <Line
              type="monotone"
              dataKey="pnlPercent"
              stroke="#2196F3"
              strokeWidth={2}
              dot={false}
              name="Total PnL %"
              isAnimationActive={false}
            />

            <Tooltip
              formatter={(value, name) => {
                if (name === 'pnlPercent') return `${value}%`
                return value
              }}
              labelFormatter={(label) => `Price: $${label}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '8px'
              }}
            />

            <Legend />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="chart-legend">
        <div className="legend-item profit">
          <span className="legend-color profit"></span>
          <span>Profit Zone (PnL &gt; 0%)</span>
        </div>
        <div className="legend-item loss">
          <span className="legend-color loss"></span>
          <span>Loss Zone (PnL &lt; 0%)</span>
        </div>
        <div className="legend-item liquidation">
          <span className="legend-color liquidation"></span>
          <span>Liquidation Zone</span>
        </div>
        <div className="legend-item current">
          <span className="legend-color current"></span>
          <span>Current Price</span>
        </div>
      </div>

      {/* Stats */}
      <div className="chart-stats">
        <div className="stat-item">
          <span className="stat-label">Data Points:</span>
          <span className="stat-value">{data.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Price Range:</span>
          <span className="stat-value">${minPrice} - ${maxPrice}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Step Size:</span>
          <span className="stat-value">${stepSize}</span>
        </div>
      </div>
    </div>
  )
}
