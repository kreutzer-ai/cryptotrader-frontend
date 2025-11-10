import React, { useState } from 'react'
import './StrategyList.css'
import { enableStrategy, disableStrategy, deleteStrategy } from '../services/strategyApi'

const StrategyList = ({ strategies, onEdit, onRefresh }) => {
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState({})

  const filteredStrategies = strategies.filter(strategy => {
    const matchesSearch = strategy.strategyName?.toLowerCase().includes(filter.toLowerCase()) ||
                         strategy.id?.toString().includes(filter)
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'ENABLED' && strategy.enabled) ||
                         (statusFilter === 'DISABLED' && !strategy.enabled)
    return matchesSearch && matchesStatus
  })

  const handleToggleEnabled = async (strategy) => {
    try {
      setActionLoading({ ...actionLoading, [strategy.id]: true })
      if (strategy.enabled) {
        await disableStrategy(strategy.id)
      } else {
        await enableStrategy(strategy.id)
      }
      onRefresh()
    } catch (err) {
      console.error('Error toggling strategy:', err)
      alert(`Failed to ${strategy.enabled ? 'disable' : 'enable'} strategy: ${err.message}`)
    } finally {
      setActionLoading({ ...actionLoading, [strategy.id]: false })
    }
  }

  const handleDelete = async (strategy) => {
    if (!confirm(`Are you sure you want to delete strategy "${strategy.strategyName}" (ID: ${strategy.id})?`)) {
      return
    }

    try {
      setActionLoading({ ...actionLoading, [strategy.id]: true })
      await deleteStrategy(strategy.id)
      onRefresh()
    } catch (err) {
      console.error('Error deleting strategy:', err)
      alert(`Failed to delete strategy: ${err.message}`)
    } finally {
      setActionLoading({ ...actionLoading, [strategy.id]: false })
    }
  }

  return (
    <div className="strategy-list">
      {/* Filters */}
      <div className="list-filters">
        <input
          type="text"
          className="search-input"
          placeholder="Search strategies..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="status-filters">
          <button
            className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All
          </button>
          <button
            className={`filter-btn ${statusFilter === 'ENABLED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ENABLED')}
          >
            Enabled
          </button>
          <button
            className={`filter-btn ${statusFilter === 'DISABLED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('DISABLED')}
          >
            Disabled
          </button>
        </div>
      </div>

      {/* Strategy Cards */}
      <div className="strategies-grid">
        {filteredStrategies.length === 0 ? (
          <div className="no-strategies">
            {strategies.length === 0 ? 'No strategies created yet' : 'No strategies match your filters'}
          </div>
        ) : (
          filteredStrategies.map(strategy => (
            <div key={strategy.id} className="strategy-card">
              <div className="strategy-card-header">
                <div className="strategy-title">
                  <h4>{strategy.strategyName}</h4>
                  <span className="strategy-id">ID: {strategy.id}</span>
                </div>
                <div className={`status-badge ${strategy.enabled ? 'enabled' : 'disabled'}`}>
                  {strategy.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              <div className="strategy-card-body">
                <div className="strategy-info">
                  <div className="info-row">
                    <label>Wallet:</label>
                    <span>{strategy.walletId}</span>
                  </div>
                  {strategy.allocatedCapital && (
                    <div className="info-row">
                      <label>Capital:</label>
                      <span>${strategy.allocatedCapital?.toLocaleString()}</span>
                    </div>
                  )}
                  {strategy.leverage && (
                    <div className="info-row">
                      <label>Leverage:</label>
                      <span>{strategy.leverage}x</span>
                    </div>
                  )}
                  {strategy.testMode !== undefined && (
                    <div className="info-row">
                      <label>Mode:</label>
                      <span className={strategy.testMode ? 'test-mode' : 'live-mode'}>
                        {strategy.testMode ? 'Test' : 'Live'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="strategy-card-actions">
                <button
                  className="btn-action btn-edit"
                  onClick={() => onEdit(strategy)}
                  disabled={actionLoading[strategy.id]}
                >
                  Edit
                </button>
                <button
                  className={`btn-action ${strategy.enabled ? 'btn-disable' : 'btn-enable'}`}
                  onClick={() => handleToggleEnabled(strategy)}
                  disabled={actionLoading[strategy.id]}
                >
                  {actionLoading[strategy.id] ? '...' : strategy.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  className="btn-action btn-delete"
                  onClick={() => handleDelete(strategy)}
                  disabled={actionLoading[strategy.id]}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default StrategyList

