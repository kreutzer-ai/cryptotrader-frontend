import React, { useState, useEffect } from 'react'
import { fetchStrategies } from '../services/cryptotraderApi'
import { fetchActiveCycleForStrategy, fetchCycleCurrentValue } from '../services/cryptotraderApi'
import CycleSummary from './CycleSummary'
import PositionList from './PositionList'
import { PriceRangePnLChart } from './PriceRangePnLChart'
import './CycleMonitor.css'

const CycleMonitor = () => {
  const [strategies, setStrategies] = useState([])
  const [selectedStrategyId, setSelectedStrategyId] = useState(null)
  const [activeCycle, setActiveCycle] = useState(null)
  const [cycleData, setCycleData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(3) // seconds
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showPriceRangeModal, setShowPriceRangeModal] = useState(false) // 'overview' or 'price-range'

  // Load strategies on mount
  useEffect(() => {
    loadStrategies()
  }, [])

  // Auto-refresh cycle data
  useEffect(() => {
    if (!autoRefresh || !selectedStrategyId || !activeCycle) {
      return
    }

    const interval = setInterval(() => {
      refreshCycleData()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, selectedStrategyId, activeCycle, refreshInterval])

  const loadStrategies = async () => {
    try {
      setLoading(true)
      const data = await fetchStrategies()
      setStrategies(data)
      if (data.length > 0) {
        setSelectedStrategyId(data[0].id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStrategyChange = async (strategyId) => {
    setSelectedStrategyId(strategyId)
    setActiveCycle(null)
    setCycleData(null)
    await loadActiveCycle(strategyId)
  }

  const loadActiveCycle = async (strategyId) => {
    try {
      setLoading(true)
      setError(null)
      const cycle = await fetchActiveCycleForStrategy(strategyId)
      
      if (cycle) {
        setActiveCycle(cycle)
        await refreshCycleData(cycle.id)
      } else {
        setActiveCycle(null)
        setCycleData(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const refreshCycleData = async (cycleId = null) => {
    const id = cycleId || activeCycle?.id
    if (!id) return

    try {
      const data = await fetchCycleCurrentValue(id)
      setCycleData(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error refreshing cycle data:', err)
    }
  }

  const handleManualRefresh = async () => {
    await refreshCycleData()
  }

  if (loading && !strategies.length) {
    return <div className="cycle-monitor-container"><p>Loading strategies...</p></div>
  }

  return (
    <div className="cycle-monitor-container">
      <div className="cycle-monitor-header">
        <div className="strategy-selector-group">
          <label htmlFor="strategy-select">Strategy:</label>
          <select
            id="strategy-select"
            value={selectedStrategyId || ''}
            onChange={(e) => handleStrategyChange(Number(e.target.value))}
            disabled={loading}
          >
            <option value="">Select a strategy...</option>
            {strategies.map(strategy => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.strategyName}
              </option>
            ))}
          </select>
        </div>

        <div className="refresh-controls">
          <button
            className="btn-refresh"
            onClick={handleManualRefresh}
            disabled={!activeCycle || loading}
            title="Refresh now"
          >
            🔄 Refresh
          </button>

          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              disabled={!activeCycle}
            />
            Auto-refresh
          </label>

          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh || !activeCycle}
            className="refresh-interval-select"
          >
            <option value={2}>2s</option>
            <option value={3}>3s</option>
            <option value={5}>5s</option>
            <option value={10}>10s</option>
          </select>
        </div>

        {lastUpdated && (
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {!activeCycle ? (
        <div className="no-active-cycle">
          <p>No active cycle for selected strategy</p>
        </div>
      ) : cycleData ? (
        <>
          {/* Tabs */}
          <div className="cycle-monitor-tabs">
            <button
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button
              className="tab-button"
              onClick={() => setShowPriceRangeModal(true)}
              title="Open price range analysis in modal"
            >
              📈 Price Range Analysis
            </button>
          </div>

          {/* Tab Content */}
          <div className="cycle-monitor-content">
            {activeTab === 'overview' && (
              <>
                <CycleSummary cycleData={cycleData} />
                <PositionList cycleData={cycleData} />
              </>
            )}
          </div>

          {/* Price Range Modal */}
          {showPriceRangeModal && (
            <div className="modal-overlay" onClick={() => setShowPriceRangeModal(false)}>
              <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>📈 Price Range PnL Analysis</h2>
                  <button
                    className="modal-close-btn"
                    onClick={() => setShowPriceRangeModal(false)}
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="modal-content">
                  <PriceRangePnLChart
                    cycleId={activeCycle.id}
                    currentPrice={cycleData.currentPrice}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="loading-message">Loading cycle data...</div>
      )}
    </div>
  )
}

export default CycleMonitor

