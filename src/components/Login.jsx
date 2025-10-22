import React, { useState } from 'react'
import { setCredentials } from '../services/authService'
import './Login.css'

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Test authentication with a simple API call
      const authHeader = `Basic ${btoa(`${username}:${password}`)}`
      const response = await fetch('/api/cryptotrader/v1/price/current/So11111111111111111111111111111111111111112', {
        headers: {
          'Authorization': authHeader
        }
      })

      if (response.ok) {
        // Authentication successful - store credentials
        setCredentials(username, password)
        onLogin()
      } else if (response.status === 401) {
        setError('Invalid username or password')
      } else {
        setError('Login failed. Please try again.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Connection error. Please check your network.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>SOL/USD Trader</h1>
          <p className="login-subtitle">Please sign in to continue</p>
        </div>

        {error && (
          <div className="login-error">
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              disabled={loading}
              placeholder="Enter username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Secure access to your trading dashboard</p>
        </div>
      </div>
    </div>
  )
}

export default Login

