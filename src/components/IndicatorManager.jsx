import React, { useState, useEffect } from 'react'
import {
  registerIndicator,
  deregisterIndicator,
  getRegisteredIndicators
} from '../services/cryptotraderApi'

/**
 * IndicatorManager - UI for dynamically registering/deregistering indicators
 */
const IndicatorManager = ({ interval = '1min' }) => {
  const [registeredIndicators, setRegisteredIndicators] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Form state
  const [indicatorType, setIndicatorType] = useState('MA')
  const [period, setPeriod] = useState(20)
  const [backfill, setBackfill] = useState(false)
  const [backfillPeriods, setBackfillPeriods] = useState(500)

  // Available indicator types
  const indicatorTypes = [
    { value: 'MA', label: 'Moving Average' },
    { value: 'MA_DERIVATION', label: 'MA Derivation' },
    { value: 'RSI', label: 'RSI' },
    { value: 'PRICE_MA_DEVIATION', label: 'Price/MA Deviation' },
    { value: 'MA_TICK', label: 'Tick MA' },
    { value: 'MA_TICK_DERIVATION', label: 'Tick MA Derivation' },
    { value: 'PRICE_MA_TICK_DEVIATION', label: 'Price/Tick MA Deviation' }
  ]

  // Load registered indicators on mount and interval change
  useEffect(() => {
    loadRegisteredIndicators()
  }, [interval])

  const loadRegisteredIndicators = async () => {
    try {
      setLoading(true)
      const data = await getRegisteredIndicators(interval)
      setRegisteredIndicators(data)
      setError(null)
    } catch (err) {
      setError('Failed to load registered indicators: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await registerIndicator(
        interval,
        indicatorType,
        period,
        {},
        backfill,
        backfillPeriods
      )
      setSuccess(`✅ Registered ${result.indicatorKey}`)
      await loadRegisteredIndicators()
      
      // Reset form
      setPeriod(20)
      setBackfill(false)
    } catch (err) {
      setError('Failed to register indicator: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeregister = async (indicatorKey) => {
    if (!window.confirm(`Are you sure you want to deregister ${indicatorKey}?`)) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await deregisterIndicator(interval, indicatorKey)
      setSuccess(`✅ Deregistered ${indicatorKey}`)
      await loadRegisteredIndicators()
    } catch (err) {
      setError('Failed to deregister indicator: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Indicator Manager</h2>
      <p style={styles.subtitle}>Interval: {interval}</p>

      {/* Error/Success Messages */}
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Registration Form */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Register New Indicator</h3>
        <form onSubmit={handleRegister} style={styles.form}>
          <div style={styles.formRow}>
            <label style={styles.label}>
              Type:
              <select
                value={indicatorType}
                onChange={(e) => setIndicatorType(e.target.value)}
                style={styles.select}
              >
                {indicatorTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              Period:
              <input
                type="number"
                value={period}
                onChange={(e) => setPeriod(parseInt(e.target.value))}
                min="1"
                max="500"
                style={styles.input}
              />
            </label>
          </div>

          <div style={styles.formRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={backfill}
                onChange={(e) => setBackfill(e.target.checked)}
              />
              Backfill historical values
            </label>

            {backfill && (
              <label style={styles.label}>
                Backfill periods:
                <input
                  type="number"
                  value={backfillPeriods}
                  onChange={(e) => setBackfillPeriods(parseInt(e.target.value))}
                  min="1"
                  max="5000"
                  style={styles.input}
                />
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Registering...' : 'Register Indicator'}
          </button>
        </form>
      </div>

      {/* Registered Indicators List */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          Registered Indicators ({registeredIndicators.length})
        </h3>
        {loading && <p>Loading...</p>}
        {!loading && registeredIndicators.length === 0 && (
          <p style={styles.emptyMessage}>No indicators registered for this interval</p>
        )}
        {!loading && registeredIndicators.length > 0 && (
          <div style={styles.indicatorList}>
            {registeredIndicators.map((indicator, index) => (
              <div key={`${indicator.indicatorKey}-${indicator.interval || interval}-${index}`} style={styles.indicatorCard}>
                <div style={styles.indicatorInfo}>
                  <strong>{indicator.indicatorKey}</strong>
                  <span style={styles.indicatorType}>{indicator.indicatorType}</span>
                  {indicator.parameters?.period && (
                    <span style={styles.indicatorPeriod}>
                      Period: {indicator.parameters.period}
                    </span>
                  )}
                  <span style={indicator.enabled ? styles.statusEnabled : styles.statusDisabled}>
                    {indicator.enabled ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
                <button
                  onClick={() => handleDeregister(indicator.indicatorKey)}
                  disabled={loading}
                  style={styles.deleteButton}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    height: 'calc(100vh - 100px)',
    overflow: 'auto'
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#1a1a1a'
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#666',
    marginBottom: '20px'
  },
  section: {
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#fafafa',
    border: '1px solid #e0e0e0',
    borderRadius: '4px'
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '15px',
    color: '#333'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  formRow: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontSize: '14px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  select: {
    padding: '8px',
    fontSize: '14px',
    borderRadius: '4px',
    border: '1px solid #ccc'
  },
  input: {
    padding: '8px',
    fontSize: '14px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    width: '120px'
  },
  button: {
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: '500',
    backgroundColor: '#4a90e2',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    transition: 'background 0.2s'
  },
  deleteButton: {
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: '500',
    backgroundColor: '#ef5350',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  indicatorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  indicatorCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #ddd'
  },
  indicatorInfo: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  indicatorType: {
    fontSize: '12px',
    color: '#666',
    backgroundColor: '#e9ecef',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  indicatorPeriod: {
    fontSize: '12px',
    color: '#666'
  },
  statusEnabled: {
    fontSize: '12px',
    color: '#28a745',
    fontWeight: 'bold'
  },
  statusDisabled: {
    fontSize: '12px',
    color: '#dc3545',
    fontWeight: 'bold'
  },
  error: {
    padding: '12px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    marginBottom: '15px'
  },
  success: {
    padding: '12px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '4px',
    marginBottom: '15px'
  },
  emptyMessage: {
    color: '#666',
    fontStyle: 'italic'
  }
}

export default IndicatorManager

