import axios from 'axios'

const STRATEGY_API_BASE = '/api/strategy/v1'
const WALLET_API_BASE = '/api/wallet/v1'

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
    const response = await axios.get(`${WALLET_API_BASE}/wallets/all`)
    return response.data
  } catch (error) {
    console.error('Error fetching all wallets:', error)
    throw new Error('Failed to fetch all wallets')
  }
}

