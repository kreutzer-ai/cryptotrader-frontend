/**
 * Authentication service for managing JWT tokens
 * Access token: stored in sessionStorage (memory), expires in 15 minutes
 * Refresh token: stored in httpOnly cookie (automatic), expires in 7 days
 */

// Determine API base URL - use window.location for production, localhost for development
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? `${window.location.protocol}//${window.location.hostname}`
  : 'http://localhost:8080'

/**
 * Login with username and password
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>} Auth response with tokens
 */
export const login = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies (refresh token)
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()

    // Store access token in sessionStorage
    sessionStorage.setItem('accessToken', data.accessToken)
    sessionStorage.setItem('username', data.username)
    sessionStorage.setItem('tokenExpiry', Date.now() + data.expiresIn * 1000)

    return data
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

/**
 * Refresh access token using refresh token from cookie
 * @returns {Promise<Object>} New access token
 */
export const refreshToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include refresh token cookie
    })

    if (!response.ok) {
      // Refresh failed, user needs to re-login
      logout()
      throw new Error('Token refresh failed')
    }

    const data = await response.json()

    // Update access token
    sessionStorage.setItem('accessToken', data.accessToken)
    sessionStorage.setItem('tokenExpiry', Date.now() + data.expiresIn * 1000)

    return data
  } catch (error) {
    console.error('Token refresh error:', error)
    throw error
  }
}

/**
 * Get Authorization header for API requests
 * @returns {Object} Authorization header object or empty object
 */
export const getAuthHeader = () => {
  const token = sessionStorage.getItem('accessToken')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

/**
 * Get access token
 * @returns {string|null} Access token or null
 */
export const getAccessToken = () => {
  return sessionStorage.getItem('accessToken')
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if access token exists
 */
export const isAuthenticated = () => {
  return sessionStorage.getItem('accessToken') !== null
}

/**
 * Check if token is expired
 * @returns {boolean} True if token is expired or about to expire (within 1 minute)
 */
export const isTokenExpired = () => {
  const expiry = sessionStorage.getItem('tokenExpiry')
  if (!expiry) return true

  // Refresh if token expires within 1 minute
  return Date.now() > parseInt(expiry) - 60000
}

/**
 * Get current username
 * @returns {string|null} Username or null if not authenticated
 */
export const getUsername = () => {
  return sessionStorage.getItem('username')
}

/**
 * Get current user object
 * @returns {Object|null} User object with username or null if not authenticated
 */
export const getCurrentUser = () => {
  const username = sessionStorage.getItem('username')
  return username ? { username } : null
}

/**
 * Logout and clear tokens
 */
export const logout = async () => {
  try {
    // Call logout endpoint to blacklist tokens
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    // Clear local storage
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('username')
    sessionStorage.removeItem('tokenExpiry')
    // Redirect to root (/) without query params to avoid redirect loop
    window.location.href = '/'
  }
}

/**
 * Check if we're in production environment
 * @returns {boolean} True if running in production
 */
export const isProduction = () => {
  return window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
}

