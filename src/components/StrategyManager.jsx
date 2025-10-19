import React, { useState } from 'react'
import StrategyForm from './StrategyForm'
import { enableStrategy, disableStrategy, deleteStrategy } from '../services/strategyApi'
import './StrategyManager.css'

const StrategyManager = ({ strategies, onStrategyChange, onRefresh }) => {
  const [showForm, setShowForm] = useState(false)
  const [editingStrategy, setEditingStrategy] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = () => {
    setEditingStrategy(null)
    setShowForm(true)
  }

  const handleEdit = (strategy) => {
    setEditingStrategy(strategy)
    setShowForm(true)
  }

  const handleFormSuccess = async (strategy) => {
    setShowForm(false)
    setEditingStrategy(null)
    if (onRefresh) {
      await onRefresh()
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingStrategy(null)
    setError(null)
  }

  const handleToggleEnabled = async (strategy) => {
    setLoading(true)
    setError(null)
    try {
      if (strategy.enabled) {
        await disableStrategy(strategy.id)
      } else {
        await enableStrategy(strategy.id)
      }
      if (onRefresh) {
        await onRefresh()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (strategy) => {
    if (!window.confirm(`Are you sure you want to delete strategy "${strategy.strategyName}"? This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      await deleteStrategy(strategy.id)
      if (onRefresh) {
        await onRefresh()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (strategy) => {
    if (strategy.enabled) {
      return <span className="status-badge status-enabled">Enabled</span>
    }
    return <span className="status-badge status-disabled">Disabled</span>
  }

  const getModeBadge = (strategy) => {
    if (strategy.testMode) {
      return <span className="mode-badge mode-test">Test</span>
    }
    return <span className="mode-badge mode-live">Live</span>
  }

  if (showForm) {
    return (
      <div className="strategy-manager-overlay">
        <StrategyForm
          strategy={editingStrategy}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    )
  }

  return (
    <div className="strategy-manager">
      <div className="strategy-manager-header">
        <h2>Strategy Management</h2>
        <button className="btn-create" onClick={handleCreate} disabled={loading}>
          + Create Strategy
        </button>
      </div>

      {error && (
        <div className="manager-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {strategies.length === 0 ? (
        <div className="empty-state">
          <p>No strategies configured yet.</p>
          <button className="btn-create-large" onClick={handleCreate}>
            Create Your First Strategy
          </button>
        </div>
      ) : (
        <div className="strategies-grid">
          {strategies.map(strategy => (
            <div key={strategy.id} className="strategy-card">
              <div className="strategy-card-header">
                <div className="strategy-title">
                  <h3>{strategy.strategyName}</h3>
                  <div className="strategy-badges">
                    {getStatusBadge(strategy)}
                    {getModeBadge(strategy)}
                  </div>
                </div>
                <div className="strategy-actions">
                  <button
                    className="action-btn"
                    onClick={() => handleEdit(strategy)}
                    disabled={loading}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className={`action-btn ${strategy.enabled ? 'btn-disable' : 'btn-enable'}`}
                    onClick={() => handleToggleEnabled(strategy)}
                    disabled={loading}
                    title={strategy.enabled ? 'Disable' : 'Enable'}
                  >
                    {strategy.enabled ? '⏸' : '▶'}
                  </button>
                  <button
                    className="action-btn btn-delete"
                    onClick={() => handleDelete(strategy)}
                    disabled={loading}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="strategy-card-body">
                <div className="strategy-info-grid">
                  <div className="info-item">
                    <span className="info-label">Wallet:</span>
                    <span className="info-value">{strategy.walletName || `ID: ${strategy.walletId}`}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Token:</span>
                    <span className="info-value">
                      {strategy.mint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'Other'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">MAs:</span>
                    <span className="info-value">
                      {strategy.shortMaPeriod}/{strategy.longMaPeriod}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Leverage:</span>
                    <span className="info-value">{strategy.leverage}x</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Profit Target:</span>
                    <span className="info-value">{(strategy.profitThreshold * 100).toFixed(2)}%</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Capital:</span>
                    <span className="info-value">{strategy.capitalAllocationPercent}%</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Max Duration:</span>
                    <span className="info-value">{strategy.cycleMaxDuration} candles</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Trend Strategy:</span>
                    <span className="info-value">{strategy.trendChangeStrategy ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default StrategyManager

