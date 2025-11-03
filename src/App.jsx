import React, { useState, useEffect } from 'react'
import CandlestickChart from './components/CandlestickChart'
import RechartsCandles from './components/RechartsCandles'
import MultiResolutionChart from './components/MultiResolutionChart'
import CyclesPanel from './components/CyclesPanel'
import WalletManager from './components/WalletManager'
import UserManager from './components/UserManager'
import LiquidationCurveOverlay from './components/LiquidationCurveOverlay'
import EventLog from './components/EventLog'
import Login from './components/Login'
import { fetchStrategies } from './services/cryptotraderApi'
import { isAuthenticated, logout, getCurrentUser } from './services/authService'
import './App.css'

function App() {
  console.log('App component rendering')
  // In development, skip login requirement
  const isDev = import.meta.env.DEV
  const [isLoggedIn, setIsLoggedIn] = useState(isDev ? true : isAuthenticated())
  const [isAdmin, setIsAdmin] = useState(false)

  // Monitor authentication state changes
  useEffect(() => {
    const checkAuth = () => {
      // In development, always consider user logged in
      const authenticated = isDev ? true : isAuthenticated()
      setIsLoggedIn(authenticated)
      console.log('Auth state updated:', authenticated)

      // Check if user is admin
      const currentUser = getCurrentUser()
      setIsAdmin(currentUser?.username === 'admin')
    }

    // Check auth on mount and when storage changes
    checkAuth()
    window.addEventListener('storage', checkAuth)

    return () => window.removeEventListener('storage', checkAuth)
  }, [])

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

    // Default: no MAs
    return []
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
  const [showLiquidationOverlay, setShowLiquidationOverlay] = useState(false)

  // Load strategies on mount (only if authenticated)
  useEffect(() => {
    if (isLoggedIn) {
      loadStrategies()
    }
  }, [isLoggedIn])

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

  // URL parameter persistence disabled to prevent redirect loops
  // TODO: Re-enable URL persistence once the root cause is identified

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    setIsLoggedIn(false)
  }

  // Handle successful login
  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
    // Don't clear URL params - let user preferences persist
  }

  // Show login screen if not authenticated
  if (!isLoggedIn) {
    return <Login onLogin={handleLoginSuccess} />
  }

  // User is authenticated, show dashboard
  return (
    <div className="app">
      <header className="app-header">
        <h1>SOL/USD Trader</h1>

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
              className={`tab-btn ${activeTab === 'wallets' ? 'active' : ''}`}
              onClick={() => setActiveTab('wallets')}
            >
              Wallets
            </button>
            <button
              className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Event Log
            </button>
            {isAdmin && (
              <button
                className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                Users
              </button>
            )}
            <button
              className="tab-btn"
              onClick={() => setShowLiquidationOverlay(true)}
            >
              Liquidation
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

          {/* Logout Button */}
          <button className="logout-btn" onClick={handleLogout} title="Sign out">
            Logout
          </button>
        </div>
      </header>

      <div className="app-content">
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
        ) : activeTab === 'wallets' ? (
          <WalletManager />
        ) : activeTab === 'users' ? (
          <UserManager />
        ) : null}

        {/* EventLog always mounted, just hidden */}
        <EventLog isVisible={activeTab === 'events'} />
      </div>

      {/* Liquidation Curve Overlay */}
      {showLiquidationOverlay && (
        <LiquidationCurveOverlay
          onClose={() => setShowLiquidationOverlay(false)}
          currentLeverage={selectedStrategy?.leverage || null}
        />
      )}
    </div>
  )
}

export default App

