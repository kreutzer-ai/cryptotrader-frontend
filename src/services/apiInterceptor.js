/**
 * API Interceptor for handling JWT token refresh on 401 responses
 * Automatically refreshes expired tokens without user interaction
 */

import * as authService from './authService'

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  isRefreshing = false
  failedQueue = []
}

/**
 * Setup axios interceptor for JWT token refresh
 * @param {Object} axiosInstance - Axios instance to setup interceptor on
 */
export const setupApiInterceptor = (axiosInstance) => {
  // Response interceptor for handling 401 and token refresh
  axiosInstance.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config

      // If error is 401 and we haven't already tried to refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Token refresh is already in progress, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`
            return axiosInstance(originalRequest)
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          // Try to refresh the token
          const response = await authService.refreshToken()
          const { accessToken } = response

          // Update authorization header
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`

          // Process queued requests
          processQueue(null, accessToken)

          // Retry original request
          return axiosInstance(originalRequest)
        } catch (err) {
          // Refresh failed
          processQueue(err, null)

          // Only logout in production mode (to avoid redirect loops in dev)
          const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          if (!isDev) {
            authService.logout()
          }

          return Promise.reject(err)
        }
      }

      return Promise.reject(error)
    }
  )

  // Request interceptor to add token to all requests
  axiosInstance.interceptors.request.use(
    config => {
      const token = authService.getAccessToken()

      // Only handle token refresh if we have a token
      if (token) {
        // Check if token is about to expire
        if (authService.isTokenExpired()) {
          // Try to refresh before making request
          return authService.refreshToken()
            .then(response => {
              config.headers['Authorization'] = `Bearer ${response.accessToken}`
              return config
            })
            .catch(() => {
              // Refresh failed, proceed with current token (will fail with 401)
              config.headers['Authorization'] = `Bearer ${token}`
              return config
            })
        }

        // Add current token to request
        config.headers['Authorization'] = `Bearer ${token}`
      }

      return config
    },
    error => Promise.reject(error)
  )
}
