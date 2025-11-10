import React, { useState, useEffect } from 'react'
import './SignalManager.css'
import { fetchSignals, createSignal, updateSignal, deleteSignal, fetchAllSignalStates } from '../services/strategyApi'

const SignalManager = () => {
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSignal, setEditingSignal] = useState(null)
  const [filterType, setFilterType] = useState('ALL')
  const [activeView, setActiveView] = useState('definitions') // 'definitions' or 'states'

  useEffect(() => {
    loadSignals()
  }, [])

  const loadSignals = async () => {
    try {
      setLoading(true)
      const data = await fetchSignals()
      setSignals(data)
      setError(null)
    } catch (err) {
      setError('Failed to load signals')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingSignal(null)
    setShowForm(true)
  }

  const handleEdit = (signal) => {
    setEditingSignal(signal)
    setShowForm(true)
  }

  const handleDelete = async (signalId) => {
    if (!window.confirm('Are you sure you want to delete this signal?')) {
      return
    }

    try {
      await deleteSignal(signalId)
      await loadSignals()
    } catch (err) {
      alert('Failed to delete signal: ' + err.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingSignal(null)
  }

  const handleFormSuccess = async () => {
    setShowForm(false)
    setEditingSignal(null)
    await loadSignals()
  }

  const filteredSignals = filterType === 'ALL' 
    ? signals 
    : signals.filter(s => s.signalType === filterType)

  const signalTypes = ['ALL', 'TIME_BASED', 'PRICE_MOVEMENT', 'PROFIT_THRESHOLD', 'INDICATOR_COMPARISON', 'COMPOSITE']

  return (
    <div className="signal-manager">
      <div className="signal-manager-header">
        <h2>Signal Manager</h2>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${activeView === 'definitions' ? 'active' : ''}`}
              onClick={() => setActiveView('definitions')}
            >
              Signal Definitions
            </button>
            <button
              className={`toggle-btn ${activeView === 'states' ? 'active' : ''}`}
              onClick={() => setActiveView('states')}
            >
              Signal States
            </button>
          </div>
          {activeView === 'definitions' && (
            <button className="btn-create" onClick={handleCreate}>
              + Create Signal
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeView === 'definitions' ? (
        <>
          <div className="signal-filters">
            <label>Filter by type:</label>
            <div className="filter-buttons">
              {signalTypes.map(type => (
                <button
                  key={type}
                  className={`filter-btn ${filterType === type ? 'active' : ''}`}
                  onClick={() => setFilterType(type)}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading signals...</div>
          ) : (
            <div className="signals-list">
              {filteredSignals.length === 0 ? (
                <div className="no-signals">
                  No signals found. Create your first signal!
                </div>
              ) : (
                filteredSignals.map(signal => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          )}
        </>
      ) : (
        <SignalStateMonitor />
      )}

      {showForm && (
        <SignalFormModal
          signal={editingSignal}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}

const SignalCard = ({ signal, onEdit, onDelete }) => {
  const isPositionScoped = ['PROFIT_THRESHOLD', 'PRICE_MOVEMENT'].includes(signal.signalType)

  return (
    <div className="signal-card">
      <div className="signal-card-header">
        <div className="signal-name">
          <h3>{signal.name}</h3>
          <div className="signal-badges">
            <span className={`signal-type-badge ${signal.signalType.toLowerCase()}`}>
              {signal.signalType}
            </span>
            {isPositionScoped && (
              <span className="position-scoped-badge" title="Position-scoped: Evaluated per-position, not globally">
                📍 Position-Scoped
              </span>
            )}
          </div>
        </div>
        <div className="signal-actions">
          <button className="btn-edit" onClick={() => onEdit(signal)}>
            Edit
          </button>
          <button className="btn-delete" onClick={() => onDelete(signal.id)}>
            Delete
          </button>
        </div>
      </div>
      <p className="signal-description">{signal.description}</p>
      <div className="signal-config">
        <strong>Config:</strong>
        <pre>{JSON.stringify(signal.config, null, 2)}</pre>
      </div>
      <div className="signal-status">
        <span className={`status-badge ${signal.isActive ? 'active' : 'inactive'}`}>
          {signal.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  )
}

const SignalFormModal = ({ signal, onClose, onSuccess }) => {
  const isEditing = !!signal

  const [formData, setFormData] = useState({
    name: signal?.name || '',
    description: signal?.description || '',
    signalType: signal?.signalType || 'TIME_BASED',
    config: signal?.config || {},
    isActive: signal?.isActive ?? true
  })

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: null }))
  }

  const handleConfigChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.signalType) {
      newErrors.signalType = 'Signal type is required'
    }

    // Validate config based on signal type
    if (formData.signalType === 'TIME_BASED') {
      if (!formData.config.interval) {
        newErrors.interval = 'Interval is required'
      }
    } else if (formData.signalType === 'PRICE_MOVEMENT') {
      if (!formData.config.direction) {
        newErrors.direction = 'Direction is required'
      }
      if (!formData.config.percentage) {
        newErrors.percentage = 'Percentage is required'
      }
      if (!formData.config.reference) {
        newErrors.reference = 'Reference is required'
      }
    } else if (formData.signalType === 'PROFIT_THRESHOLD') {
      if (!formData.config.type) {
        newErrors.type = 'Type is required'
      }
      if (!formData.config.operator) {
        newErrors.operator = 'Operator is required'
      }
      if (formData.config.threshold === undefined || formData.config.threshold === null || formData.config.threshold === '') {
        newErrors.threshold = 'Threshold is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)

      if (isEditing) {
        await updateSignal(signal.id, formData)
      } else {
        await createSignal(formData)
      }

      onSuccess()
    } catch (err) {
      alert('Failed to save signal: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Signal' : 'Create Signal'}</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="signal-form">
          <div className="form-field">
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Every_5_Minutes"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-field">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe what this signal does"
              rows={2}
            />
          </div>

          <div className="form-field">
            <label>Signal Type *</label>
            <select
              value={formData.signalType}
              onChange={(e) => {
                handleChange('signalType', e.target.value)
                // Reset config when type changes
                setFormData(prev => ({ ...prev, config: {} }))
              }}
              className={errors.signalType ? 'error' : ''}
            >
              <option value="TIME_BASED">Time Based</option>
              <option value="PRICE_MOVEMENT">Price Movement</option>
              <option value="PROFIT_THRESHOLD">Profit Threshold</option>
              <option value="INDICATOR_COMPARISON">Indicator Comparison</option>
              <option value="COMPOSITE">Composite</option>
            </select>
            {errors.signalType && <span className="error-text">{errors.signalType}</span>}
          </div>

          {/* Dynamic config fields based on signal type */}
          {formData.signalType === 'TIME_BASED' && (
            <TimeBasedConfig config={formData.config} onChange={handleConfigChange} errors={errors} />
          )}

          {formData.signalType === 'PRICE_MOVEMENT' && (
            <PriceMovementConfig config={formData.config} onChange={handleConfigChange} errors={errors} />
          )}

          {formData.signalType === 'PROFIT_THRESHOLD' && (
            <ProfitThresholdConfig config={formData.config} onChange={handleConfigChange} errors={errors} />
          )}

          {formData.signalType === 'INDICATOR_COMPARISON' && (
            <IndicatorComparisonConfig config={formData.config} onChange={handleConfigChange} errors={errors} />
          )}

          {formData.signalType === 'COMPOSITE' && (
            <CompositeConfig config={formData.config} onChange={handleConfigChange} errors={errors} />
          )}

          <div className="form-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
              />
              <span>Active</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Config components for different signal types
const TimeBasedConfig = ({ config, onChange, errors }) => (
  <div className="config-section">
    <h4>Time-Based Configuration</h4>
    <div className="form-field">
      <label>Interval *</label>
      <select
        value={config.interval || ''}
        onChange={(e) => onChange('interval', e.target.value)}
        className={errors.interval ? 'error' : ''}
      >
        <option value="">Select interval...</option>
        <option value="5sec">5 seconds</option>
        <option value="15sec">15 seconds</option>
        <option value="30sec">30 seconds</option>
        <option value="1min">1 minute</option>
        <option value="5min">5 minutes</option>
        <option value="15min">15 minutes</option>
        <option value="30min">30 minutes</option>
        <option value="1h">1 hour</option>
        <option value="4h">4 hours</option>
        <option value="1d">1 day</option>
      </select>
      {errors.interval && <span className="error-text">{errors.interval}</span>}
    </div>
    <div className="form-field">
      <label>Offset (seconds)</label>
      <input
        type="number"
        value={config.offset || 0}
        onChange={(e) => onChange('offset', parseInt(e.target.value))}
        min={0}
      />
    </div>
  </div>
)

const PriceMovementConfig = ({ config, onChange, errors }) => (
  <div className="config-section">
    <h4>Price Movement Configuration</h4>
    <div className="form-field">
      <label>Direction *</label>
      <select
        value={config.direction || ''}
        onChange={(e) => onChange('direction', e.target.value)}
        className={errors.direction ? 'error' : ''}
      >
        <option value="">Select direction...</option>
        <option value="UP">Up</option>
        <option value="DOWN">Down</option>
      </select>
      {errors.direction && <span className="error-text">{errors.direction}</span>}
    </div>
    <div className="form-field">
      <label>Percentage *</label>
      <input
        type="number"
        value={config.percentage || ''}
        onChange={(e) => onChange('percentage', parseFloat(e.target.value))}
        step="0.1"
        min="0"
        placeholder="e.g., 1.0 for 1%"
        className={errors.percentage ? 'error' : ''}
      />
      {errors.percentage && <span className="error-text">{errors.percentage}</span>}
    </div>
    <div className="form-field">
      <label>Reference *</label>
      <select
        value={config.reference || ''}
        onChange={(e) => onChange('reference', e.target.value)}
        className={errors.reference ? 'error' : ''}
      >
        <option value="">Select reference...</option>
        <option value="ENTRY_PRICE">Entry Price</option>
        <option value="CURRENT_PRICE">Current Price</option>
        <option value="PEAK_PRICE">Peak Price</option>
      </select>
      {errors.reference && <span className="error-text">{errors.reference}</span>}
    </div>
  </div>
)

const ProfitThresholdConfig = ({ config, onChange, errors }) => (
  <div className="config-section">
    <h4>Profit Threshold Configuration</h4>
    <div className="form-field">
      <label>Type *</label>
      <select
        value={config.type || ''}
        onChange={(e) => onChange('type', e.target.value)}
        className={errors.type ? 'error' : ''}
      >
        <option value="">Select type...</option>
        <option value="ABSOLUTE">Absolute (USD)</option>
        <option value="PERCENTAGE">Percentage (% of collateral)</option>
      </select>
      {errors.type && <span className="error-text">{errors.type}</span>}
      <small style={{ color: '#9ca3af', display: 'block', marginTop: '4px' }}>
        Absolute: Dollar amount (e.g., $10). Percentage: % of collateral (e.g., 5%)
      </small>
    </div>
    <div className="form-field">
      <label>Operator *</label>
      <select
        value={config.operator || ''}
        onChange={(e) => onChange('operator', e.target.value)}
        className={errors.operator ? 'error' : ''}
      >
        <option value="">Select operator...</option>
        <option value="GREATER_THAN">Greater Than (&gt;)</option>
        <option value="GREATER_THAN_OR_EQUAL">Greater Than or Equal (&gt;=)</option>
        <option value="LESS_THAN">Less Than (&lt;)</option>
        <option value="LESS_THAN_OR_EQUAL">Less Than or Equal (&lt;=)</option>
        <option value="EQUALS">Equals (=)</option>
      </select>
      {errors.operator && <span className="error-text">{errors.operator}</span>}
    </div>
    <div className="form-field">
      <label>Threshold *</label>
      <input
        type="number"
        value={config.threshold || ''}
        onChange={(e) => onChange('threshold', parseFloat(e.target.value))}
        step="0.1"
        placeholder={config.type === 'PERCENTAGE' ? 'e.g., 5.0 for 5%' : 'e.g., 10.0 for $10'}
        className={errors.threshold ? 'error' : ''}
      />
      {errors.threshold && <span className="error-text">{errors.threshold}</span>}
      <small style={{ color: '#9ca3af', display: 'block', marginTop: '4px' }}>
        {config.type === 'PERCENTAGE'
          ? 'Percentage of collateral (e.g., 5.0 = 5% profit/loss)'
          : 'Dollar amount (e.g., 10.0 = $10 profit, -5.0 = $5 loss)'}
      </small>
    </div>
    <div className="config-note" style={{ marginTop: '15px' }}>
      <strong>Examples:</strong>
      <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#9ca3af' }}>
        <li>Take profit at $10: Type=ABSOLUTE, Operator=GREATER_THAN, Threshold=10</li>
        <li>Stop loss at -$5: Type=ABSOLUTE, Operator=LESS_THAN, Threshold=-5</li>
        <li>Take profit at 5%: Type=PERCENTAGE, Operator=GREATER_THAN, Threshold=5</li>
        <li>Stop loss at -2%: Type=PERCENTAGE, Operator=LESS_THAN, Threshold=-2</li>
      </ul>
    </div>
  </div>
)

const IndicatorComparisonConfig = ({ config, onChange, errors }) => (
  <div className="config-section">
    <h4>Indicator Comparison Configuration</h4>
    <p className="config-note">
      Advanced: Edit the JSON config directly for complex comparisons
    </p>
    <div className="form-field">
      <label>Config JSON</label>
      <textarea
        value={JSON.stringify(config, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value)
            Object.keys(parsed).forEach(key => onChange(key, parsed[key]))
          } catch (err) {
            // Invalid JSON, ignore
          }
        }}
        rows={10}
        placeholder={`{
  "left": { "type": "INDICATOR", "indicator": "MA_50" },
  "operator": "GREATER_THAN",
  "right": { "type": "PRICE" }
}`}
        style={{ fontFamily: 'monospace', fontSize: '12px' }}
      />
    </div>
  </div>
)

const CompositeConfig = ({ config, onChange, errors }) => (
  <div className="config-section">
    <h4>Composite Configuration</h4>
    <p className="config-note">
      Advanced: Edit the JSON config directly to combine multiple signals
    </p>
    <div className="form-field">
      <label>Config JSON</label>
      <textarea
        value={JSON.stringify(config, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value)
            Object.keys(parsed).forEach(key => onChange(key, parsed[key]))
          } catch (err) {
            // Invalid JSON, ignore
          }
        }}
        rows={10}
        placeholder={`{
  "operator": "AND",
  "conditions": [
    { "signalId": 9 },
    { "signalId": 13 }
  ]
}`}
        style={{ fontFamily: 'monospace', fontSize: '12px' }}
      />
    </div>
  </div>
)

// Signal State Monitor Component
const SignalStateMonitor = () => {
  const [signalStates, setSignalStates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filterActive, setFilterActive] = useState('ALL') // 'ALL', 'ACTIVE', 'INACTIVE'
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

  useEffect(() => {
    loadSignalStates()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadSignalStates()
    }, 2000) // Refresh every 2 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  const loadSignalStates = async () => {
    try {
      setLoading(true)
      const data = await fetchAllSignalStates()
      // Filter out position-scoped signals as they are strategy-specific
      // and cannot trigger independently (they require position context)
      const positionScopedTypes = ['PROFIT_THRESHOLD', 'PRICE_MOVEMENT']
      const filteredData = data.filter(state => !positionScopedTypes.includes(state.signalType))
      setSignalStates(filteredData)
      setError(null)
    } catch (err) {
      setError('Failed to load signal states')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredStates = filterActive === 'ALL'
    ? signalStates
    : filterActive === 'ACTIVE'
    ? signalStates.filter(s => s.isActive)
    : signalStates.filter(s => !s.isActive)

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const formatDuration = (timestamp) => {
    if (!timestamp) return ''
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now - then
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)

    if (diffHour > 0) return `${diffHour}h ${diffMin % 60}m ago`
    if (diffMin > 0) return `${diffMin}m ${diffSec % 60}s ago`
    return `${diffSec}s ago`
  }

  return (
    <div className="signal-state-monitor">
      <div className="monitor-info">
        <p className="info-note">
          ℹ️ <strong>Note:</strong> Position-scoped signals (PROFIT_THRESHOLD, PRICE_MOVEMENT) are not shown here
          because they require position context to evaluate. They are evaluated within individual strategies on each
          price tick, not globally. These signals define exit conditions like take-profit, stop-loss, and trailing stops.
        </p>
      </div>

      <div className="monitor-controls">
        <div className="filter-group">
          <label>Filter:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterActive === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterActive('ALL')}
            >
              All ({signalStates.length})
            </button>
            <button
              className={`filter-btn ${filterActive === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setFilterActive('ACTIVE')}
            >
              Active ({signalStates.filter(s => s.isActive).length})
            </button>
            <button
              className={`filter-btn ${filterActive === 'INACTIVE' ? 'active' : ''}`}
              onClick={() => setFilterActive('INACTIVE')}
            >
              Inactive ({signalStates.filter(s => !s.isActive).length})
            </button>
          </div>
        </div>

        <div className="refresh-controls">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh (2s)</span>
          </label>
          <button className="btn-refresh" onClick={loadSignalStates} disabled={loading}>
            {loading ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && signalStates.length === 0 ? (
        <div className="loading">Loading signal states...</div>
      ) : filteredStates.length === 0 ? (
        <div className="no-signals">
          No {filterActive.toLowerCase()} signals found.
        </div>
      ) : (
        <div className="states-table-container">
          <table className="states-table">
            <thead>
              <tr>
                <th>Signal ID</th>
                <th>Signal Name</th>
                <th>Mint</th>
                <th>Status</th>
                <th>Last Transition</th>
                <th>Last Evaluation</th>
                <th>Price at Transition</th>
              </tr>
            </thead>
            <tbody>
              {filteredStates.map((state, index) => (
                <tr key={`${state.signalId}-${state.mint}-${index}`} className={state.isActive ? 'active-row' : 'inactive-row'}>
                  <td className="signal-id">{state.signalId}</td>
                  <td className="signal-name">{state.signalName || 'Unknown'}</td>
                  <td className="mint-address" title={state.mint}>
                    {state.mint === USDC_MINT ? 'USDC' : `${state.mint.substring(0, 8)}...`}
                  </td>
                  <td>
                    <span className={`state-badge ${state.isActive ? 'active' : 'inactive'}`}>
                      {state.isActive ? '● ACTIVE' : '○ INACTIVE'}
                    </span>
                  </td>
                  <td className="timestamp">
                    <div>{formatTimestamp(state.lastTransitionTime)}</div>
                    <div className="time-ago">{formatDuration(state.lastTransitionTime)}</div>
                  </td>
                  <td className="timestamp">
                    <div>{formatTimestamp(state.lastEvaluationTime)}</div>
                    <div className="time-ago">{formatDuration(state.lastEvaluationTime)}</div>
                  </td>
                  <td className="price">
                    {state.priceAtTransition ? `$${state.priceAtTransition.toFixed(2)}` : '-'}
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

export default SignalManager

