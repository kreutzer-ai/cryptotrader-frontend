import axios from 'axios'
import { getAuthHeader } from './authService'
import { setupApiInterceptor } from './apiInterceptor'

// Use relative URL - Vite proxy will forward to localhost:8080
const CRYPTOTRADER_API_BASE = '/api/cryptotrader/v1'

// Solana mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112'

// Setup JWT token refresh interceptor
setupApiInterceptor(axios)

// Configure axios to include auth headers
axios.interceptors.request.use(
  (config) => {
    const authHeaders = getAuthHeader()
    config.headers = { ...config.headers, ...authHeaders }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Fetch candle data from CryptoTrader API
 * @param {string} mint - Token mint address (default: SOL)
 * @param {number} limit - Number of candles to fetch (default: 300)
 * @returns {Promise<Array>} Array of candle data with MA indicators
 */
export const fetchCandles = async (mint = SOL_MINT, limit = 300) => {
  try {
    const response = await axios.get(`${CRYPTOTRADER_API_BASE}/price/candles/${mint}`, {
      params: { limit }
    })

    // Transform CryptoTrader candle data to our format
    // Sort by timestamp ascending (oldest first)
    const sortedData = response.data.sort((a, b) => a.timestamp - b.timestamp)

    return sortedData.map(candle => ({
      time: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      movingAverages: candle.movingAverages || {},
      direction: candle.direction,
      complete: candle.complete,
      numberOfPolls: candle.numberOfPolls,
    }))
  } catch (error) {
    console.error('Error fetching candles from CryptoTrader API:', error)
    throw new Error('Failed to fetch price data from CryptoTrader API')
  }
}

/**
 * Fetch current price for Solana
 * @returns {Promise<number>} Current price
 */
export const fetchCurrentPrice = async () => {
  try {
    const candles = await fetchCandles()
    if (candles.length > 0) {
      return candles[candles.length - 1].close
    }
    throw new Error('No candle data available')
  } catch (error) {
    console.error('Error fetching current price:', error)
    throw new Error('Failed to fetch current price')
  }
}

/**
 * Fetch all trading strategies
 * @param {Object} filters - Optional filters
 * @param {number} filters.walletId - Filter by wallet ID
 * @param {string} filters.mint - Filter by mint address
 * @param {boolean} filters.enabled - Filter by enabled status
 * @returns {Promise<Array>} Array of strategy configurations
 */
export const fetchStrategies = async (filters = {}) => {
  try {
    const params = {}
    if (filters.walletId) params.walletId = filters.walletId
    if (filters.mint) params.mint = filters.mint
    if (filters.enabled !== undefined) params.enabled = filters.enabled

    const response = await axios.get(`${CRYPTOTRADER_API_BASE}/strategies`, { params })
    return response.data
  } catch (error) {
    console.error('Error fetching strategies:', error)
    throw new Error('Failed to fetch strategies')
  }
}

/**
 * Fetch trading cycles
 * @param {Object} filters - Optional filters
 * @param {number} filters.strategyConfigId - Filter by strategy ID
 * @param {number} filters.walletId - Filter by wallet ID
 * @param {string} filters.mint - Filter by mint address
 * @param {string} filters.status - Filter by status (ACTIVE, CLOSED_PROFIT, CLOSED_DURATION)
 * @returns {Promise<Array>} Array of trading cycles
 */
export const fetchCycles = async (filters = {}) => {
  try {
    const params = {}
    if (filters.strategyConfigId) params.strategyConfigId = filters.strategyConfigId
    if (filters.walletId) params.walletId = filters.walletId
    if (filters.mint) params.mint = filters.mint
    if (filters.status) params.status = filters.status

    const response = await axios.get(`${CRYPTOTRADER_API_BASE}/cycles`, { params })
    return response.data
  } catch (error) {
    console.error('Error fetching cycles:', error)
    throw new Error('Failed to fetch cycles')
  }
}

/**
 * Fetch active cycles
 * @returns {Promise<Array>} Array of active trading cycles
 */
export const fetchActiveCycles = async () => {
  try {
    const response = await axios.get(`${CRYPTOTRADER_API_BASE}/cycles/active`)
    return response.data
  } catch (error) {
    console.error('Error fetching active cycles:', error)
    throw new Error('Failed to fetch active cycles')
  }
}

/**
 * Fetch positions for a specific cycle
 * @param {number} cycleId - Cycle ID
 * @returns {Promise<Array>} Array of positions in the cycle
 */
export const fetchCyclePositions = async (cycleId) => {
  try {
    const response = await axios.get(`${CRYPTOTRADER_API_BASE}/cycles/${cycleId}/positions`)
    return response.data
  } catch (error) {
    console.error(`Error fetching positions for cycle ${cycleId}:`, error)
    throw new Error('Failed to fetch cycle positions')
  }
}

/**
 * Fetch price ticks (raw price updates every 3 seconds)
 * @param {string} mint - Token mint address (default: SOL)
 * @param {number} limit - Number of ticks to fetch (default: 100)
 * @returns {Promise<Array>} Array of price tick data
 */
export const fetchPriceTicks = async (mint = SOL_MINT, limit = 100) => {
  try {
    const response = await axios.get(`${CRYPTOTRADER_API_BASE}/price/ticks/${mint}`, {
      params: { limit }
    })

    // Transform tick data to our format
    // Sort by timestamp ascending (oldest first)
    const sortedData = response.data.sort((a, b) =>
      new Date(a.tickTime).getTime() - new Date(b.tickTime).getTime()
    )

    return sortedData.map(tick => ({
      time: new Date(tick.tickTime).getTime() / 1000, // Convert to seconds
      price: tick.price,
      tickTimeIso: tick.tickTimeIso
    }))
  } catch (error) {
    console.error('Error fetching price ticks:', error)
    throw new Error('Failed to fetch price ticks')
  }
}

/**
 * Fetch 15-second candles
 * @param {string} mint - Token mint address (default: SOL)
 * @param {number} limit - Number of candles to fetch (default: 240 = 1 hour)
 * @returns {Promise<Array>} Array of 15-second candle data
 */
export const fetch15SecCandles = async (mint = SOL_MINT, limit = 240) => {
  try {
    const response = await axios.get(`${CRYPTOTRADER_API_BASE}/price/candles-15sec/${mint}`, {
      params: { limit }
    })

    // Transform 15-sec candle data to our format
    // Sort by timestamp ascending (oldest first)
    const sortedData = response.data.sort((a, b) =>
      new Date(a.time).getTime() - new Date(b.time).getTime()
    )

    return sortedData.map(candle => ({
      time: new Date(candle.time).getTime() / 1000, // Convert to seconds
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      numberOfTicks: candle.numberOfTicks,
      complete: candle.complete,
      timeIso: candle.timeIso
    }))
  } catch (error) {
    console.error('Error fetching 15-second candles:', error)
    throw new Error('Failed to fetch 15-second candles')
  }
}

/**
 * Fetch price ticks in a time range
 * @param {string} mint - Token mint address
 * @param {number} startTime - Start timestamp (Unix seconds)
 * @param {number} endTime - End timestamp (Unix seconds)
 * @returns {Promise<Array>} Array of price tick data
 */
export const fetchPriceTicksRange = async (mint = SOL_MINT, startTime, endTime) => {
  try {
    const response = await axios.get(`${CRYPTOTRADER_API_BASE}/price/ticks/${mint}/range`, {
      params: { startTime, endTime }
    })

    const sortedData = response.data.sort((a, b) =>
      new Date(a.tickTime).getTime() - new Date(b.tickTime).getTime()
    )

    return sortedData.map(tick => ({
      time: new Date(tick.tickTime).getTime() / 1000,
      price: tick.price,
      tickTimeIso: tick.tickTimeIso
    }))
  } catch (error) {
    console.error('Error fetching price ticks range:', error)
    throw new Error('Failed to fetch price ticks range')
  }
}

/**
 * Fetch 15-second candles in a time range
 * @param {string} mint - Token mint address
 * @param {number} startTime - Start timestamp (Unix seconds)
 * @param {number} endTime - End timestamp (Unix seconds)
 * @returns {Promise<Array>} Array of 15-second candle data
 */
export const fetch15SecCandlesRange = async (mint = SOL_MINT, startTime, endTime) => {
  try {
    const response = await axios.get(`${CRYPTOTRADER_API_BASE}/price/candles-15sec/${mint}/range`, {
      params: { startTime, endTime }
    })

    const sortedData = response.data.sort((a, b) =>
      new Date(a.time).getTime() - new Date(b.time).getTime()
    )

    return sortedData.map(candle => ({
      time: new Date(candle.time).getTime() / 1000,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      numberOfTicks: candle.numberOfTicks,
      complete: candle.complete,
      timeIso: candle.timeIso
    }))
  } catch (error) {
    console.error('Error fetching 15-second candles range:', error)
    throw new Error('Failed to fetch 15-second candles range')
  }
}

/**
 * Fetch cycle current value with latest price and position details
 * @param {number} cycleId - Cycle ID
 * @returns {Promise<Object>} Cycle current value with unrealized PnL for open positions
 */
export const fetchCycleCurrentValue = async (cycleId) => {
  try {
    const response = await axios.get(`${CRYPTOTRADER_API_BASE}/cycles/${cycleId}/current-value`)
    return response.data
  } catch (error) {
    console.error(`Error fetching current value for cycle ${cycleId}:`, error)
    throw new Error('Failed to fetch cycle current value')
  }
}

/**
 * Fetch active cycle for a specific strategy
 * @param {number} strategyId - Strategy ID
 * @returns {Promise<Object>} Active cycle data
 */
export const fetchActiveCycleForStrategy = async (strategyId) => {
  try {
    const response = await axios.get(`${CRYPTOTRADER_API_BASE}/cycles`, {
      params: { strategyConfigId: strategyId, status: 'ACTIVE' }
    })
    return response.data && response.data.length > 0 ? response.data[0] : null
  } catch (error) {
    console.error(`Error fetching active cycle for strategy ${strategyId}:`, error)
    throw new Error('Failed to fetch active cycle')
  }
}
