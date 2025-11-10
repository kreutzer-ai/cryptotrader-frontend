import axios from 'axios'
import { getAuthHeader } from './authService'

const STRATEGY_API_BASE = '/api/strategy/v1'
const WALLET_API_BASE = '/api/wallet/v1'
const SIGNAL_API_BASE = '/api/signal/v1'

// Note: axios interceptor is already configured in cryptotraderApi.js
// which is imported globally, so auth headers will be included automatically

/**
 * Fetch all wallets
 * @returns {Promise<Array>} Array of wallet objects
 */
export const fetchWallets = async () => {
  try {
    const response = await axios.get(`${WALLET_API_BASE}/wallets`)
    return response.data
  } catch (error) {
    console.error('Error fetching wallets:', error)
    throw new Error('Failed to fetch wallets')
  }
}

/**
 * Fetch all signals
 * @param {string} signalType - Optional filter by signal type
 * @returns {Promise<Array>} Array of signal objects
 */
export const fetchSignals = async (signalType = null) => {
  try {
    const params = signalType ? { type: signalType } : {}
    const response = await axios.get(`${SIGNAL_API_BASE}/signals`, { params })
    return response.data
  } catch (error) {
    console.error('Error fetching signals:', error)
    throw new Error('Failed to fetch signals')
  }
}

/**
 * Create a new signal
 * @param {Object} signalData - Signal configuration
 * @returns {Promise<Object>} Created signal
 */
export const createSignal = async (signalData) => {
  try {
    const response = await axios.post(`${SIGNAL_API_BASE}/signals`, signalData)
    return response.data
  } catch (error) {
    console.error('Error creating signal:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Failed to create signal')
  }
}

/**
 * Update an existing signal
 * @param {number} signalId - Signal ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated signal
 */
export const updateSignal = async (signalId, updates) => {
  try {
    const response = await axios.put(`${SIGNAL_API_BASE}/signals/${signalId}`, updates)
    return response.data
  } catch (error) {
    console.error('Error updating signal:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Failed to update signal')
  }
}

/**
 * Delete a signal
 * @param {number} signalId - Signal ID
 * @returns {Promise<void>}
 */
export const deleteSignal = async (signalId) => {
  try {
    await axios.delete(`${SIGNAL_API_BASE}/signals/${signalId}`)
  } catch (error) {
    console.error('Error deleting signal:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Failed to delete signal')
  }
}

/**
 * Fetch signal states for a specific mint
 * @param {string} mint - Token mint address
 * @returns {Promise<Array>} Array of signal states
 */
export const fetchSignalStates = async (mint) => {
  try {
    const response = await axios.get('/api/signals/states', { params: { mint } })
    return response.data
  } catch (error) {
    console.error('Error fetching signal states:', error)
    throw new Error('Failed to fetch signal states')
  }
}

/**
 * Fetch active signal states for a specific mint
 * @param {string} mint - Token mint address
 * @returns {Promise<Array>} Array of active signal states
 */
export const fetchActiveSignalStates = async (mint) => {
  try {
    const response = await axios.get('/api/signals/states/active', { params: { mint } })
    return response.data
  } catch (error) {
    console.error('Error fetching active signal states:', error)
    throw new Error('Failed to fetch active signal states')
  }
}

/**
 * Fetch all signal states across all mints
 * @returns {Promise<Array>} Array of all signal states
 */
export const fetchAllSignalStates = async () => {
  try {
    const response = await axios.get('/api/signals/states/all')
    return response.data
  } catch (error) {
    console.error('Error fetching all signal states:', error)
    throw new Error('Failed to fetch all signal states')
  }
}

/**
 * Create a new strategy
 * @param {Object} strategyData - Strategy configuration
 * @returns {Promise<Object>} Created strategy
 */
export const createStrategy = async (strategyData) => {
  try {
    const response = await axios.post(`${STRATEGY_API_BASE}/strategies`, strategyData)
    return response.data
  } catch (error) {
    console.error('Error creating strategy:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Failed to create strategy')
  }
}

/**
 * Update an existing strategy
 * @param {number} strategyId - Strategy ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated strategy
 */
export const updateStrategy = async (strategyId, updates) => {
  try {
    const response = await axios.put(`${STRATEGY_API_BASE}/strategies/${strategyId}`, updates)
    return response.data
  } catch (error) {
    console.error('Error updating strategy:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Failed to update strategy')
  }
}

/**
 * Enable a strategy
 * @param {number} strategyId - Strategy ID
 * @returns {Promise<Object>} Updated strategy
 */
export const enableStrategy = async (strategyId) => {
  try {
    const response = await axios.post(`${STRATEGY_API_BASE}/strategies/${strategyId}/enable`)
    return response.data
  } catch (error) {
    console.error('Error enabling strategy:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Failed to enable strategy')
  }
}

/**
 * Disable a strategy
 * @param {number} strategyId - Strategy ID
 * @returns {Promise<Object>} Updated strategy
 */
export const disableStrategy = async (strategyId) => {
  try {
    const response = await axios.post(`${STRATEGY_API_BASE}/strategies/${strategyId}/disable`)
    return response.data
  } catch (error) {
    console.error('Error disabling strategy:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Failed to disable strategy')
  }
}

/**
 * Delete a strategy
 * @param {number} strategyId - Strategy ID
 * @returns {Promise<void>}
 */
export const deleteStrategy = async (strategyId) => {
  try {
    await axios.delete(`${STRATEGY_API_BASE}/strategies/${strategyId}`)
  } catch (error) {
    console.error('Error deleting strategy:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Failed to delete strategy')
  }
}

/**
 * Create a new wallet
 * @param {Object} walletData - Wallet data {name, privateKeyBase58}
 * @returns {Promise<Object>} Created wallet
 */
export const createWallet = async (walletData) => {
  try {
    const response = await axios.post(`${WALLET_API_BASE}/wallets`, walletData)
    return response.data
  } catch (error) {
    console.error('Error creating wallet:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Failed to create wallet')
  }
}

/**
 * Deactivate a wallet
 * @param {string} walletName - Wallet name
 * @returns {Promise<void>}
 */
export const deactivateWallet = async (walletName) => {
  try {
    await axios.post(`${WALLET_API_BASE}/wallets/${walletName}/deactivate`)
  } catch (error) {
    console.error('Error deactivating wallet:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Failed to deactivate wallet')
  }
}

/**
 * Reactivate a wallet
 * @param {string} walletName - Wallet name
 * @returns {Promise<void>}
 */
export const reactivateWallet = async (walletName) => {
  try {
    await axios.post(`${WALLET_API_BASE}/wallets/${walletName}/reactivate`)
  } catch (error) {
    console.error('Error reactivating wallet:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Failed to reactivate wallet')
  }
}

/**
 * Fetch all wallets (including inactive)
 * @returns {Promise<Array>} Array of all wallet objects
 */
export const fetchAllWallets = async () => {
  try {
    const response = await axios.get(`${WALLET_API_BASE}/wallets?includeInactive=true`)
    return response.data
  } catch (error) {
    console.error('Error fetching all wallets:', error)
    throw new Error('Failed to fetch all wallets')
  }
}




/**
 * Calculate liquidation limit for a given leverage
 * @param {number} leverage - Leverage value (e.g., 5 for 5x)
 * @param {number} entryPrice - Optional entry price
 * @param {string} direction - Optional direction (LONG or SHORT)
 * @returns {Promise<Object>} Liquidation limit data
 */
export const calculateLiquidationLimit = async (leverage, entryPrice = null, direction = null) => {
  try {
    const requestBody = { leverage }
    if (entryPrice !== null) {
      requestBody.entryPrice = entryPrice
    }
    if (direction !== null) {
      requestBody.direction = direction
    }
    const response = await axios.post('/api/jupiter/perps/v1/liquidation/calculate', requestBody)
    return response.data
  } catch (error) {
    console.error('Error calculating liquidation limit:', error)
    throw new Error('Failed to calculate liquidation limit')
  }
}

/**
 * Fetch liquidation curve data (original data points)
 * @returns {Promise<Object>} Curve data with original points
 */
export const fetchLiquidationCurve = async () => {
  try {
    const response = await axios.get('/api/jupiter/perps/v1/liquidation/curve')
    return response.data
  } catch (error) {
    console.error('Error fetching liquidation curve:', error)
    throw new Error('Failed to fetch liquidation curve')
  }
}

/**
 * Fetch detailed liquidation curve data (interpolated points)
 * @param {number} points - Number of points to generate (default: 100)
 * @returns {Promise<Object>} Curve data with interpolated points
 */
export const fetchDetailedLiquidationCurve = async (points = 100) => {
  try {
    const response = await axios.get(`/api/jupiter/perps/v1/liquidation/curve/detailed?points=${points}`)
    return response.data
  } catch (error) {
    console.error('Error fetching detailed liquidation curve:', error)
    throw new Error('Failed to fetch detailed liquidation curve')
  }
}

/**
 * Fetch all strategy definitions (templates) with their configuration schemas
 * @returns {Promise<Array>} Array of strategy definition objects with schemas
 */
export const fetchStrategyDefinitions = async () => {
  try {
    const response = await axios.get(`${STRATEGY_API_BASE}/definitions`)
    return response.data
  } catch (error) {
    console.error('Error fetching strategy definitions:', error)
    throw new Error('Failed to fetch strategy definitions')
  }
}

/**
 * Fetch a specific strategy definition by ID
 * @param {number} definitionId - Strategy definition ID
 * @returns {Promise<Object>} Strategy definition with schema
 */
export const fetchStrategyDefinition = async (definitionId) => {
  try {
    const response = await axios.get(`${STRATEGY_API_BASE}/definitions/${definitionId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching strategy definition:', error)
    throw new Error('Failed to fetch strategy definition')
  }
}

/**
 * Validate strategy configuration against schema
 * @param {number} definitionId - Strategy definition ID
 * @param {Object} config - Strategy configuration to validate
 * @returns {Promise<Object>} Validation result with errors if any
 */
export const validateStrategyConfig = async (definitionId, config) => {
  try {
    const response = await axios.post(`${STRATEGY_API_BASE}/definitions/${definitionId}/validate`, config)
    return response.data
  } catch (error) {
    console.error('Error validating strategy config:', error)
    if (error.response?.data) {
      return error.response.data
    }
    throw new Error('Failed to validate strategy configuration')
  }
}

/**
 * Fetch available indicators for strategy configuration
 * @param {string} interval - Candle interval (default: "1min")
 * @returns {Promise<Array>} Array of available indicators
 */
export const fetchAvailableIndicatorsForStrategy = async (interval = '1min') => {
  try {
    const response = await axios.get(`${STRATEGY_API_BASE}/indicators/available`, {
      params: { interval }
    })
    return response.data
  } catch (error) {
    console.error('Error fetching available indicators:', error)
    throw new Error('Failed to fetch available indicators')
  }
}

/**
 * Fetch strategy by ID
 * @param {number} strategyId - Strategy ID
 * @returns {Promise<Object>} Strategy object
 */
export const fetchStrategy = async (strategyId) => {
  try {
    const response = await axios.get(`${STRATEGY_API_BASE}/strategies/${strategyId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching strategy:', error)
    throw new Error('Failed to fetch strategy')
  }
}

/**
 * Fetch all strategies (alias for compatibility)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of strategies
 */
export const fetchAllStrategies = async (filters = {}) => {
  try {
    const params = {}
    if (filters.walletId) params.walletId = filters.walletId
    if (filters.mint) params.mint = filters.mint
    if (filters.enabled !== undefined) params.enabled = filters.enabled

    const response = await axios.get(`${STRATEGY_API_BASE}/strategies`, { params })
    return response.data
  } catch (error) {
    console.error('Error fetching strategies:', error)
    throw new Error('Failed to fetch strategies')
  }
}
