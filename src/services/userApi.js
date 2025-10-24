import axios from 'axios'

const API_BASE_URL = '/api/auth'

/**
 * Create a new user (admin only)
 */
export const createUser = async (username, password, email) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/users`, {
      username,
      password,
      email
    })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to create user')
  }
}

/**
 * Get all users (admin only)
 */
export const getAllUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/users`)
    return response.data.users || []
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch users')
  }
}

/**
 * Disable a user (admin only)
 */
export const disableUser = async (userId) => {
  try {
    const response = await axios.patch(`${API_BASE_URL}/users/${userId}/active`, {
      isActive: false
    })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to disable user')
  }
}

/**
 * Enable a user (admin only)
 */
export const enableUser = async (userId) => {
  try {
    const response = await axios.patch(`${API_BASE_URL}/users/${userId}/active`, {
      isActive: true
    })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to enable user')
  }
}

