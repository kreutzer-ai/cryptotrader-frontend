import React, { useState, useEffect } from 'react'
import CandlestickChart from './components/CandlestickChart'
import RechartsCandles from './components/RechartsCandles'
import EChartsCandles from './components/EChartsCandles'
import MultiResolutionChart from './components/MultiResolutionChart'
import CyclesPanel from './components/CyclesPanel'
import StrategyManager from './components/StrategyManager'
import WalletManager from './components/WalletManager'
import { fetchStrategies } from './services/cryptotraderApi'
import './App.css'

function App() {
  // Initialize from URL params or use defaults
  const getInitialMAs = () => {
    const params = new URLSearchParams(window.location.search)
    const masParam = params.get('mas')

    if (masParam) {
      // Parse comma-separated MA periods from URL
      const mas = masParam.split(',')
        .map(Number)
        .filter(n => !isNaN(n) && n >= 1 && n <= 200)

      if (mas.length > 0) {
        return mas.sort((a, b) => a - b)
      }
    }

    // Default MAs
    return [5, 25]
  }

  const getInitialLimit = () => {
    const params = new URLSearchParams(window.location.search)
    const limitParam = params.get('limit')

    if (limitParam) {
      const limit = Number(limitParam)
      if (!isNaN(limit) && limit > 0 && limit <= 10000) {
        return limit
      }
    }

    // Default limit
    return 300
  }

  const getInitialStrategy = () => {
    const params = new URLSearchParams(window.location.search)
    const strategyParam = params.get('strategy')
    return strategyParam || null // Return strategy name from URL or null
  }

  const [selectedMAs, setSelectedMAs] = useState(getInitialMAs())
  const [candleLimit, setCandleLimit] = useState(getInitialLimit())
  const [showCycles, setShowCycles] = useState(true)
  const [cycles, setCycles] = useState([]) // Shared cycles state
  const [selectedPositions, setSelectedPositions] = useState([]) // Positions to visualize on chart
  const [selectedStrategy, setSelectedStrategy] = useState(null) // Currently selected strategy
  const [chartType, setChartType] = useState('multiresolution') // 'tradingview', 'recharts', 'echarts', or 'multiresolution'
  const [activeTab, setActiveTab] = useState('chart') // 'chart' or 'strategies'
  const [strategies, setStrategies] = useState([])
  const [strategiesLoading, setStrategiesLoading] = useState(false)

  // Load strategies on mount
  useEffect(() => {
    loadStrategies()
  }, [])

  const loadStrategies = async () => {
    setStrategiesLoading(true)
    try {
      const data = await fetchStrategies()
      setStrategies(data)

      // After loading strategies, restore selected strategy from URL
      const initialStrategyName = getInitialStrategy()
      console.log('App.jsx - Initial strategy from URL:', initialStrategyName)
      if (initialStrategyName && data.length > 0) {
        const strategy = data.find(s => s.strategyName === initialStrategyName)
        console.log('App.jsx - Found strategy:', strategy)
        if (strategy) {
          console.log('App.jsx - Setting selected strategy:', strategy.strategyName)
          setSelectedStrategy(strategy)
          // Set MAs from strategy config
          if (strategy.shortMaPeriod && strategy.longMaPeriod) {
            const mas = [strategy.shortMaPeriod, strategy.longMaPeriod].sort((a, b) => a - b)
            setSelectedMAs(mas)
          }
        }
      }
    } catch (error) {
      console.error('Error loading strategies:', error)
    } finally {
      setStrategiesLoading(false)
    }
  }

  // Handle strategy selection - automatically set MAs based on strategy config
  const handleStrategyChange = (strategy) => {
    console.log('App.jsx - handleStrategyChange called with:', strategy)
    setSelectedStrategy(strategy)
    if (strategy && strategy.shortMaPeriod && strategy.longMaPeriod) {
      const mas = [strategy.shortMaPeriod, strategy.longMaPeriod].sort((a, b) => a - b)
      setSelectedMAs(mas)
    }
  }

  // Update URL when selectedMAs, candleLimit, or selectedStrategy changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (selectedMAs.length > 0) {
      params.set('mas', selectedMAs.join(','))
    } else {
      params.delete('mas')
    }

    if (candleLimit !== 300) {
      params.set('limit', candleLimit.toString())
    } else {
      params.delete('limit')
    }

    if (selectedStrategy && selectedStrategy.strategyName) {
      console.log('App.jsx - Updating URL with strategy:', selectedStrategy.strategyName)
      params.set('strategy', selectedStrategy.strategyName)
    } else {
      console.log('App.jsx - Removing strategy from URL')
      params.delete('strategy')
    }

    // Update URL without reloading the page
    const newUrl = `${window.location.pathname}?${params.toString()}`
    console.log('App.jsx - New URL:', newUrl)
    window.history.replaceState({}, '', newUrl)
  }, [selectedMAs, candleLimit, selectedStrategy])

  return (
    <div className="app">
      <header className="app-header">
        <h1>SOL/USD Trading Dashboard</h1>

        <div className="header-controls">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
              onClick={() => setActiveTab('chart')}
            >
              Chart
            </button>
            <button
              className={`tab-btn ${activeTab === 'strategies' ? 'active' : ''}`}
              onClick={() => setActiveTab('strategies')}
            >
              Strategies
            </button>
            <button
              className={`tab-btn ${activeTab === 'wallets' ? 'active' : ''}`}
              onClick={() => setActiveTab('wallets')}
            >
              Wallets
            </button>
          </div>

          {/* Cycles Toggle - only show on chart tab */}
          {activeTab === 'chart' && (
            <label className="cycles-toggle">
              <input
                type="checkbox"
                className="cycles-checkbox"
                checked={showCycles}
                onChange={(e) => setShowCycles(e.target.checked)}
              />
              <span className="checkbox-label">Show Strategies</span>
            </label>
          )}
        </div>
      </header>

      {activeTab === 'chart' ? (
        <>
          {chartType === 'multiresolution' ? (
            <MultiResolutionChart
              selectedMAs={selectedMAs}
              setSelectedMAs={setSelectedMAs}
              cycles={cycles}
              selectedPositions={selectedPositions}
              selectedStrategy={selectedStrategy}
              candleLimit={candleLimit}
              setCandleLimit={setCandleLimit}
            />
          ) : chartType === 'echarts' ? (
            <EChartsCandles
              selectedMAs={selectedMAs}
              setSelectedMAs={setSelectedMAs}
              cycles={cycles}
              selectedPositions={selectedPositions}
              selectedStrategy={selectedStrategy}
              candleLimit={candleLimit}
              setCandleLimit={setCandleLimit}
            />
          ) : chartType === 'recharts' ? (
            <RechartsCandles
              selectedMAs={selectedMAs}
              setSelectedMAs={setSelectedMAs}
              cycles={cycles}
              selectedPositions={selectedPositions}
              selectedStrategy={selectedStrategy}
              candleLimit={candleLimit}
              setCandleLimit={setCandleLimit}
            />
          ) : (
            <CandlestickChart
              selectedMAs={selectedMAs}
              setSelectedMAs={setSelectedMAs}
              cycles={cycles}
              selectedPositions={selectedPositions}
              selectedStrategy={selectedStrategy}
              candleLimit={candleLimit}
              setCandleLimit={setCandleLimit}
            />
          )}

          {showCycles && (
            <CyclesPanel
              onCyclesChange={setCycles}
              onStrategyChange={handleStrategyChange}
              onPositionsVisualize={setSelectedPositions}
              initialStrategy={selectedStrategy}
              strategies={strategies}
              strategiesLoading={strategiesLoading}
            />
          )}
        </>
      ) : activeTab === 'strategies' ? (
        <StrategyManager
          strategies={strategies}
          onStrategyChange={handleStrategyChange}
          onRefresh={loadStrategies}
        />
      ) : (
        <WalletManager />
      )}
    </div>
  )
}

export default App

