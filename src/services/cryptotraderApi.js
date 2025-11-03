import axios from 'axios'
import { getAuthHeader } from './authService'
import { setupApiInterceptor } from './apiInterceptor'

// Use relative URL - Vite proxy will forward to localhost:8080
const CYCLES_API_BASE = '/api/cycles/v1'
const JUPITER_PRICE_API_BASE = '/api/jupiter/price/v1'

// Solana mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112'

// Setup JWT token refresh interceptor
setupApiInterceptor(axios)

// Configure axios to include auth headers (only if token exists)
axios.interceptors.request.use(
  (config) => {
    const authHeaders = getAuthHeader()
    // Only add auth headers if we have a token
    if (Object.keys(authHeaders).length > 0) {
      config.headers = { ...config.headers, ...authHeaders }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Fetch candle data from Jupiter Price API
 * @param {string} mint - Token mint address (default: SOL)
 * @param {number} limit - Number of candles to fetch (default: 300)
 * @param {string} interval - Candle interval: "15sec" or "1min" (default: "1min")
 * @returns {Promise<Array>} Array of candle data with MA indicators
 */
export const fetchCandles = async (mint = SOL_MINT, limit = 300, interval = '1min') => {
  try {
    const response = await axios.get(`${JUPITER_PRICE_API_BASE}/candles/${mint}`, {
      params: { limit, interval }
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

    const response = await axios.get('/api/strategy/v1/strategies', { params })
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

    const response = await axios.get(`${CYCLES_API_BASE}/cycles`, { params })
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
    const response = await axios.get(`${CYCLES_API_BASE}/cycles/active`)
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
    const response = await axios.get(`${JUPITER_PRICE_API_BASE}/ticks/${mint}`, {
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
    const response = await axios.get(`${JUPITER_PRICE_API_BASE}/candles/${mint}`, {
      params: { limit, interval: '15sec' }
    })

    // Transform 15-sec candle data to our format
    // Sort by timestamp ascending (oldest first)
    const sortedData = response.data.sort((a, b) => a.timestamp - b.timestamp)

    return sortedData.map(candle => ({
      time: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      numberOfTicks: candle.numberOfTicks,
      complete: candle.complete,
      movingAverages: candle.movingAverages || {},
      direction: candle.direction
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
    const response = await axios.get(`${JUPITER_PRICE_API_BASE}/ticks/${mint}/range`, {
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
    const response = await axios.get(`${JUPITER_PRICE_API_BASE}/candles/${mint}/range`, {
      params: { startTime, endTime, interval: '15sec' }
    })

    const sortedData = response.data.sort((a, b) => a.timestamp - b.timestamp)

    return sortedData.map(candle => ({
      time: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      numberOfTicks: candle.numberOfTicks,
      complete: candle.complete,
      movingAverages: candle.movingAverages || {},
      direction: candle.direction
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
    const response = await axios.get(`${CYCLES_API_BASE}/cycles/${cycleId}/current-value`)
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
    const response = await axios.get(`${CYCLES_API_BASE}/cycles`, {
      params: { strategyConfigId: strategyId, status: 'ACTIVE' }
    })
    return response.data && response.data.length > 0 ? response.data[0] : null
  } catch (error) {
    console.error(`Error fetching active cycle for strategy ${strategyId}:`, error)
    throw new Error('Failed to fetch active cycle')
  }
}

// ============================================================================
// CSV EXPORT FUNCTIONS
// ============================================================================

/**
 * Export recent price ticks as CSV
 * @param {string} mint - Token mint address (default: SOL)
 * @param {number} limit - Number of ticks to export (default: 100)
 * @param {string} filename - Optional filename for download
 */
export const exportPriceTicksCsv = async (mint = SOL_MINT, limit = 100, filename = null) => {
  try {
    const url = `${JUPITER_PRICE_API_BASE}/ticks/${mint}/export?limit=${limit}`
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    })

    const downloadFilename = filename || `price-ticks-${mint.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`
    downloadBlob(response.data, downloadFilename)
  } catch (error) {
    console.error('Error exporting price ticks:', error)
    throw new Error('Failed to export price ticks')
  }
}

/**
 * Export price ticks in time range as CSV
 * @param {string} mint - Token mint address (default: SOL)
 * @param {number} startTime - Start timestamp (Unix seconds)
 * @param {number} endTime - End timestamp (Unix seconds)
 * @param {string} filename - Optional filename for download
 */
export const exportPriceTicksRangeCsv = async (mint = SOL_MINT, startTime, endTime, filename = null) => {
  try {
    const url = `${JUPITER_PRICE_API_BASE}/ticks/${mint}/export/range?startTime=${startTime}&endTime=${endTime}`
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    })

    const downloadFilename = filename || `price-ticks-${mint.slice(0, 8)}-range-${new Date().toISOString().slice(0, 10)}.csv`
    downloadBlob(response.data, downloadFilename)
  } catch (error) {
    console.error('Error exporting price ticks range:', error)
    throw new Error('Failed to export price ticks range')
  }
}

/**
 * Export recent 15-second candles as CSV
 * @param {string} mint - Token mint address (default: SOL)
 * @param {number} limit - Number of candles to export (default: 240 = 1 hour)
 * @param {string} filename - Optional filename for download
 */
export const export15SecCandlesCsv = async (mint = SOL_MINT, limit = 240, filename = null) => {
  try {
    const url = `${JUPITER_PRICE_API_BASE}/candles/${mint}/export?interval=15sec&limit=${limit}`
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    })

    const downloadFilename = filename || `candles-15sec-${mint.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`
    downloadBlob(response.data, downloadFilename)
  } catch (error) {
    console.error('Error exporting 15-second candles:', error)
    throw new Error('Failed to export 15-second candles')
  }
}

/**
 * Export 15-second candles in time range as CSV
 * @param {string} mint - Token mint address (default: SOL)
 * @param {number} startTime - Start timestamp (Unix seconds)
 * @param {number} endTime - End timestamp (Unix seconds)
 * @param {string} filename - Optional filename for download
 */
export const export15SecCandlesRangeCsv = async (mint = SOL_MINT, startTime, endTime, filename = null) => {
  try {
    const url = `${JUPITER_PRICE_API_BASE}/candles/${mint}/export/range?interval=15sec&startTime=${startTime}&endTime=${endTime}`
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    })

    const downloadFilename = filename || `candles-15sec-${mint.slice(0, 8)}-range-${new Date().toISOString().slice(0, 10)}.csv`
    downloadBlob(response.data, downloadFilename)
  } catch (error) {
    console.error('Error exporting 15-second candles range:', error)
    throw new Error('Failed to export 15-second candles range')
  }
}

/**
 * Export recent 1-minute candles as CSV
 * @param {string} mint - Token mint address (default: SOL)
 * @param {number} limit - Number of candles to export (default: 60 = 1 hour)
 * @param {string} filename - Optional filename for download
 */
export const exportCandlesCsv = async (mint = SOL_MINT, limit = 60, filename = null) => {
  try {
    const url = `${CRYPTOTRADER_API_BASE}/price/candles/${mint}/export?limit=${limit}`
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    })

    const downloadFilename = filename || `candles-1min-${mint.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`
    downloadBlob(response.data, downloadFilename)
  } catch (error) {
    console.error('Error exporting 1-minute candles:', error)
    throw new Error('Failed to export 1-minute candles')
  }
}

/**
 * Export 1-minute candles in time range as CSV
 * @param {string} mint - Token mint address (default: SOL)
 * @param {number} startTime - Start timestamp (Unix seconds)
 * @param {number} endTime - End timestamp (Unix seconds)
 * @param {string} filename - Optional filename for download
 */
export const exportCandlesRangeCsv = async (mint = SOL_MINT, startTime, endTime, filename = null) => {
  try {
    const url = `${CRYPTOTRADER_API_BASE}/price/candles/${mint}/export/range?startTime=${startTime}&endTime=${endTime}`
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    })

    const downloadFilename = filename || `candles-1min-${mint.slice(0, 8)}-range-${new Date().toISOString().slice(0, 10)}.csv`
    downloadBlob(response.data, downloadFilename)
  } catch (error) {
    console.error('Error exporting 1-minute candles range:', error)
    throw new Error('Failed to export 1-minute candles range')
  }
}

/**
 * Export ALL 1-minute candles in database as CSV
 * @param {string} mint - Token mint address (default: SOL)
 * @param {string} filename - Optional filename for download
 */
export const exportAllCandlesCsv = async (mint = SOL_MINT, filename = null) => {
  try {
    // Use a very large limit to get all data (10000 should cover most cases)
    const url = `${JUPITER_PRICE_API_BASE}/candles/${mint}/export?interval=1min&limit=10000`
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    })

    const downloadFilename = filename || `candles-1min-${mint.slice(0, 8)}-ALL-${new Date().toISOString().slice(0, 10)}.csv`
    downloadBlob(response.data, downloadFilename)
  } catch (error) {
    console.error('Error exporting all 1-minute candles:', error)
    throw new Error('Failed to export all 1-minute candles')
  }
}

/**
 * Export ALL 15-second candles in database as CSV
 * @param {string} mint - Token mint address (default: SOL)
 * @param {string} filename - Optional filename for download
 */
export const exportAll15SecCandlesCsv = async (mint = SOL_MINT, filename = null) => {
  try {
    // Use a very large limit to get all data (50000 for 15-sec candles)
    const url = `${CRYPTOTRADER_API_BASE}/price/candles-15sec/${mint}/export?limit=50000`
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    })

    const downloadFilename = filename || `candles-15sec-${mint.slice(0, 8)}-ALL-${new Date().toISOString().slice(0, 10)}.csv`
    downloadBlob(response.data, downloadFilename)
  } catch (error) {
    console.error('Error exporting all 15-second candles:', error)
    throw new Error('Failed to export all 15-second candles')
  }
}

/**
 * Export ALL price ticks in database as CSV
 * @param {string} mint - Token mint address (default: SOL)
 * @param {string} filename - Optional filename for download
 */
export const exportAllPriceTicksCsv = async (mint = SOL_MINT, filename = null) => {
  try {
    // Use a very large limit to get all data (100000 for price ticks)
    const url = `${CRYPTOTRADER_API_BASE}/price/ticks/${mint}/export?limit=100000`
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    })

    const downloadFilename = filename || `ticks-${mint.slice(0, 8)}-ALL-${new Date().toISOString().slice(0, 10)}.csv`
    downloadBlob(response.data, downloadFilename)
  } catch (error) {
    console.error('Error exporting all price ticks:', error)
    throw new Error('Failed to export all price ticks')
  }
}

/**
 * Helper function to download blob as file
 * @param {Blob} blob - Blob data to download
 * @param {string} filename - Filename for download
 */
const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Fetch strategy current value for PERIODIC_DUAL strategies (cycle-less)
 * @param {number} strategyId - Strategy ID
 * @returns {Promise<Object>} Strategy current value with positions and PnL
 */
export const fetchStrategyCurrentValue = async (strategyId) => {
  try {
    const response = await axios.get(`/api/strategy/v1/strategies/${strategyId}/current-value`)
    return response.data
  } catch (error) {
    console.error(`Error fetching current value for strategy ${strategyId}:`, error)
    throw new Error('Failed to fetch strategy current value')
  }
}

/**
 * Fetch positions for a strategy (PERIODIC_DUAL - cycle-less)
 * @param {number} strategyId - Strategy ID
 * @returns {Promise<Array>} Array of positions
 */
export const fetchStrategyPositions = async (strategyId) => {
  try {
    const response = await axios.get(`/api/strategy/v1/strategies/${strategyId}/positions`)
    return response.data
  } catch (error) {
    console.error(`Error fetching positions for strategy ${strategyId}:`, error)
    throw new Error('Failed to fetch strategy positions')
  }
}
