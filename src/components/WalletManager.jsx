import React, { useState, useEffect } from 'react'
import { fetchAllWallets, createWallet, deactivateWallet, reactivateWallet } from '../services/strategyApi'
import './WalletManager.css'

const WalletManager = () => {
  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    privateKeyBase58: ''
  })

  useEffect(() => {
    loadWallets()
  }, [])

  const loadWallets = async () => {
    setLoading(true)
    try {
      const data = await fetchAllWallets()
      setWallets(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateRandomPrivateKey = () => {
    // Generate a random base58 private key (64 characters for Solana)
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleGenerateKey = () => {
    setFormData(prev => ({
      ...prev,
      privateKeyBase58: generateRandomPrivateKey()
    }))
  }

  const handleCreateWallet = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await createWallet(formData)
      setFormData({ name: '', privateKeyBase58: '' })
      setShowCreateForm(false)
      await loadWallets()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (wallet) => {
    setLoading(true)
    setError(null)

    try {
      if (wallet.isActive) {
        await deactivateWallet(wallet.name)
      } else {
        await reactivateWallet(wallet.name)
      }
      await loadWallets()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="wallet-manager">
      <div className="wallet-manager-header">
        <h2>Wallet Management</h2>
        <button 
          className="btn-create" 
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={loading}
        >
          {showCreateForm ? 'Cancel' : '+ Create Wallet'}
        </button>
      </div>

      {error && (
        <div className="manager-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showCreateForm && (
        <div className="create-wallet-form">
          <h3>Create New Wallet</h3>
          <form onSubmit={handleCreateWallet}>
            <div className="form-group">
              <label htmlFor="walletName">Wallet Name *</label>
              <input
                type="text"
                id="walletName"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., test-wallet-1"
                required
              />
              <small>Use descriptive names like: provider-TEST/PROD-name-timestamp</small>
            </div>

            <div className="form-group">
              <label htmlFor="privateKey">Private Key (Base58) *</label>
              <div className="key-input-group">
                <input
                  type="text"
                  id="privateKey"
                  value={formData.privateKeyBase58}
                  onChange={(e) => setFormData(prev => ({ ...prev, privateKeyBase58: e.target.value }))}
                  placeholder="Base58 encoded private key"
                  required
                />
                <button 
                  type="button" 
                  className="btn-generate"
                  onClick={handleGenerateKey}
                >
                  Generate Random (Test)
                </button>
              </div>
              <small className="warning">⚠️ Random keys are for TESTING only. Use real keys for production.</small>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn-cancel"
                onClick={() => {
                  setShowCreateForm(false)
                  setFormData({ name: '', privateKeyBase58: '' })
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Wallet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && wallets.length === 0 ? (
        <div className="loading-state">Loading wallets...</div>
      ) : wallets.length === 0 ? (
        <div className="empty-state">
          <p>No wallets configured yet.</p>
          <button className="btn-create-large" onClick={() => setShowCreateForm(true)}>
            Create Your First Wallet
          </button>
        </div>
      ) : (
        <div className="wallets-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Public Key</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map(wallet => (
                <tr key={wallet.id} className={!wallet.isActive ? 'inactive' : ''}>
                  <td className="wallet-name">{wallet.name}</td>
                  <td className="wallet-key">
                    <span className="key-short">{wallet.publicKey.substring(0, 8)}...{wallet.publicKey.substring(wallet.publicKey.length - 8)}</span>
                    <button 
                      className="btn-copy"
                      onClick={() => copyToClipboard(wallet.publicKey)}
                      title="Copy full public key"
                    >
                      📋
                    </button>
                  </td>
                  <td>
                    {wallet.isActive ? (
                      <span className="status-badge status-active">Active</span>
                    ) : (
                      <span className="status-badge status-inactive">Inactive</span>
                    )}
                  </td>
                  <td className="date-cell">{formatDate(wallet.createdAt)}</td>
                  <td className="date-cell">{formatDate(wallet.lastUsedAt)}</td>
                  <td className="actions-cell">
                    <button
                      className={`action-btn ${wallet.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                      onClick={() => handleToggleActive(wallet)}
                      disabled={loading}
                      title={wallet.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {wallet.isActive ? 'Deactivate' : 'Activate'}
                    </button>
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

export default WalletManager

