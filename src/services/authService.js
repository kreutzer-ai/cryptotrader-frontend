/**
 * Authentication service for managing user credentials
 * Uses sessionStorage to store credentials (cleared on browser close)
 */

/**
 * Store user credentials in sessionStorage
 * @param {string} username 
 * @param {string} password 
 */
export const setCredentials = (username, password) => {
  const encoded = btoa(`${username}:${password}`)
  sessionStorage.setItem('auth', encoded)
  sessionStorage.setItem('username', username)
}

/**
 * Get Authorization header for API requests
 * @returns {Object} Authorization header object or empty object
 */
export const getAuthHeader = () => {
  const auth = sessionStorage.getItem('auth')
  return auth ? { 'Authorization': `Basic ${auth}` } : {}
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if credentials are stored
 */
export const isAuthenticated = () => {
  return sessionStorage.getItem('auth') !== null
}

/**
 * Get current username
 * @returns {string|null} Username or null if not authenticated
 */
export const getUsername = () => {
  return sessionStorage.getItem('username')
}

/**
 * Clear credentials and reload page
 */
export const logout = () => {
  sessionStorage.removeItem('auth')
  sessionStorage.removeItem('username')
  window.location.reload()
}

/**
 * Check if we're in production environment
 * @returns {boolean} True if running in production
 */
export const isProduction = () => {
  return window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
}

