import React, { useState, useEffect } from 'react'
import { createUser, getAllUsers, disableUser, enableUser } from '../services/userApi'
import './UserManager.css'

const UserManager = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllUsers()
      // Sort: active first, then by creation date (newest first)
      const sorted = data.sort((a, b) => {
        if (a.isActive === b.isActive) {
          return new Date(b.createdAt) - new Date(a.createdAt)
        }
        return a.isActive ? -1 : 1
      })
      setUsers(sorted)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validation
    if (!formData.username.trim()) {
      setError('Username is required')
      return
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await createUser(formData.username, formData.password, formData.email)
      setSuccess(`User "${formData.username}" created successfully!`)
      setFormData({ username: '', password: '', email: '' })
      setShowCreateForm(false)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleUser = async (user) => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (user.isActive) {
        await disableUser(user.id)
        setSuccess(`User "${user.username}" disabled`)
      } else {
        await enableUser(user.id)
        setSuccess(`User "${user.username}" enabled`)
      }
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (showCreateForm) {
    return (
      <div className="user-manager-overlay">
        <div className="user-manager-form-container">
          <div className="form-header">
            <h2>Create New User</h2>
            <button
              className="close-btn"
              onClick={() => {
                setShowCreateForm(false)
                setFormData({ username: '', password: '', email: '' })
                setError(null)
              }}
            >
              ✕
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={handleCreateUser} className="user-form">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter username"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Minimum 6 characters"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email (Optional)</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="user@example.com"
                disabled={loading}
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-create"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setShowCreateForm(false)
                  setFormData({ username: '', password: '', email: '' })
                  setError(null)
                }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="user-manager-container">
      <div className="user-manager-header">
        <h2>User Management</h2>
        <button
          className="btn-create-user"
          onClick={() => setShowCreateForm(true)}
          disabled={loading}
        >
          + Create User
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading && users.length === 0 ? (
        <div className="loading">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p>No users found</p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={`user-row ${!user.isActive ? 'disabled' : ''}`}>
                  <td className="username-cell">
                    <span className="username">{user.username}</span>
                    {user.username === 'admin' && <span className="admin-badge">ADMIN</span>}
                  </td>
                  <td className="email-cell">{user.email || '-'}</td>
                  <td className="status-cell">
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? '✓ Active' : '✗ Disabled'}
                    </span>
                  </td>
                  <td className="created-cell">{formatDate(user.createdAt)}</td>
                  <td className="actions-cell">
                    {user.username !== 'admin' && (
                      <button
                        className={`action-btn ${user.isActive ? 'btn-disable' : 'btn-enable'}`}
                        onClick={() => handleToggleUser(user)}
                        disabled={loading}
                        title={user.isActive ? 'Disable user' : 'Enable user'}
                      >
                        {user.isActive ? '🔒 Disable' : '🔓 Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default UserManager

