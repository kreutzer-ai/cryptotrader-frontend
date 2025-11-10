import React, { useState, useEffect } from 'react'
import './DynamicStrategyForm.css'
import { createStrategy, updateStrategy, fetchWallets, fetchSignals } from '../services/strategyApi'

const DynamicStrategyForm = ({ template, initialConfig, onChange, onSuccess }) => {
  const [formData, setFormData] = useState({})
  const [wallets, setWallets] = useState([])
  const [signals, setSignals] = useState([])
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(null)

  const isEditing = !!initialConfig?.id

  useEffect(() => {
    loadWallets()
    loadSignals()
  }, [])

  useEffect(() => {
    if (initialConfig) {
      setFormData(initialConfig)
    } else {
      // Initialize with default values from schema
      const defaults = {}
      template?.configSchema?.sections?.forEach(section => {
        section.fields?.forEach(field => {
          if (field.defaultValue !== undefined) {
            defaults[field.key] = field.defaultValue
          }
        })
      })
      setFormData(defaults)
    }
  }, [template, initialConfig])

  useEffect(() => {
    onChange(formData)
  }, [formData])

  const loadWallets = async () => {
    try {
      const walletList = await fetchWallets()
      setWallets(walletList)
    } catch (err) {
      console.error('Error loading wallets:', err)
    }
  }

  const loadSignals = async () => {
    try {
      const signalList = await fetchSignals()
      setSignals(signalList)
    } catch (err) {
      console.error('Error loading signals:', err)
    }
  }

  const handleChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[key]
      return newErrors
    })
  }

  const applyPreset = (preset) => {
    setSelectedPreset(preset.name)
    setFormData(prev => ({
      ...prev,
      ...preset.config
    }))
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Validate required fields
    template?.configSchema?.sections?.forEach(section => {
      section.fields?.forEach(field => {
        if (field.required && !formData[field.key]) {
          newErrors[field.key] = `${field.label} is required`
        }
        
        // Validate min/max for numbers
        if (field.type === 'number' || field.type === 'slider') {
          const value = parseFloat(formData[field.key])
          if (field.min !== undefined && value < field.min) {
            newErrors[field.key] = `Must be at least ${field.min}`
          }
          if (field.max !== undefined && value > field.max) {
            newErrors[field.key] = `Must be at most ${field.max}`
          }
        }
      })
    })

    // Validate wallet selection
    if (!formData.walletId) {
      newErrors.walletId = 'Wallet is required'
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

      // Separate fields into proper structure for backend
      const {
        name,
        walletId,
        mint,
        enabled,
        testMode,
        allocatedCapital,
        reservedSol,
        leverage,
        openFeeRate,
        closeFeeRate,
        antimartingaleFactor,
        maxAntimartingaleSteps,
        invertOnStoploss,
        longEntrySignalId,
        shortEntrySignalId,
        takeProfitSignalId,
        stopLossSignalId,
        ...otherFields
      } = formData

      const payload = {
        strategyDefinitionId: template.id, // Use template ID, not name
        name: name || `${template.displayName} Instance`,
        walletId: walletId ? parseInt(walletId) : null,
        mint: mint || 'So11111111111111111111111111111111111111112',
        enabled: enabled || false,
        allocatedCapital: allocatedCapital ? parseFloat(allocatedCapital) : null,

        // Config object for strategy-specific settings
        config: {
          testMode: testMode !== undefined ? testMode : true,
          leverage: leverage ? parseFloat(leverage) : null,
          openFeeRate: openFeeRate ? parseFloat(openFeeRate) : null,
          closeFeeRate: closeFeeRate ? parseFloat(closeFeeRate) : null,
          antimartingaleFactor: antimartingaleFactor ? parseFloat(antimartingaleFactor) : null,
          maxAntimartingaleSteps: maxAntimartingaleSteps ? parseInt(maxAntimartingaleSteps) : null,
          invertOnStoploss: invertOnStoploss || false,
          ...otherFields
        },

        // Capital config
        capitalConfig: {
          allocatedCapital: allocatedCapital ? parseFloat(allocatedCapital) : null,
          reservedSol: reservedSol ? parseFloat(reservedSol) : null
        },

        // Signal IDs
        entrySignalLongId: longEntrySignalId ? parseInt(longEntrySignalId) : null,
        entrySignalShortId: shortEntrySignalId ? parseInt(shortEntrySignalId) : null,
        exitSignalTakeProfitId: takeProfitSignalId ? parseInt(takeProfitSignalId) : null,
        exitSignalStopLossId: stopLossSignalId ? parseInt(stopLossSignalId) : null
      }

      if (isEditing) {
        await updateStrategy(initialConfig.id, payload)
      } else {
        await createStrategy(payload)
      }

      onSuccess()
    } catch (err) {
      console.error('Error saving strategy:', err)
      setErrors({ submit: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (field) => {
    const value = formData[field.key]
    const error = errors[field.key]

    switch (field.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleChange(field.key, parseFloat(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step || 'any'}
            className={error ? 'error' : ''}
          />
        )

      case 'slider':
        return (
          <div className="slider-input">
            <input
              type="range"
              value={value || field.min || 0}
              onChange={(e) => handleChange(field.key, parseFloat(e.target.value))}
              min={field.min}
              max={field.max}
              step={field.step || 0.1}
            />
            <span className="slider-value">{value || field.min || 0}</span>
          </div>
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleChange(field.key, field.options.includes(parseInt(e.target.value)) ? parseInt(e.target.value) : e.target.value)}
            className={error ? 'error' : ''}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'duration':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className={error ? 'error' : ''}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'boolean':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleChange(field.key, e.target.checked)}
            />
            <span>{field.label}</span>
          </label>
        )

      case 'wallet':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleChange(field.key, e.target.value ? parseInt(e.target.value) : null)}
            className={error ? 'error' : ''}
          >
            <option value="">Select wallet...</option>
            {wallets.map(wallet => (
              <option key={wallet.id} value={wallet.id}>
                ID: {wallet.id} - {wallet.name} ({wallet.address?.slice(0, 8)}...)
              </option>
            ))}
          </select>
        )

      case 'signal':
        // Filter signals by type if specified
        const filteredSignals = field.signalType
          ? signals.filter(s => s.signalType === field.signalType)
          : signals

        return (
          <div className="signal-selector">
            <select
              value={value || ''}
              onChange={(e) => handleChange(field.key, e.target.value ? parseInt(e.target.value) : null)}
              className={error ? 'error' : ''}
            >
              <option value="">None (optional)</option>
              {filteredSignals.map(signal => (
                <option key={signal.id} value={signal.id}>
                  {signal.name} - {signal.description}
                </option>
              ))}
            </select>
            {value && (
              <div className="signal-preview">
                {(() => {
                  const selectedSignal = signals.find(s => s.id === parseInt(value))
                  if (!selectedSignal) return null
                  return (
                    <div className="signal-details">
                      <span className="signal-type">{selectedSignal.signalType}</span>
                      <span className="signal-config">{JSON.stringify(selectedSignal.config)}</span>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className={error ? 'error' : ''}
          />
        )
    }
  }

  return (
    <div className="dynamic-strategy-form">
      <h3>{isEditing ? 'Edit' : 'Create'} {template.displayName || template.name}</h3>

      <form onSubmit={handleSubmit}>
        {/* Dynamic Sections from Schema */}
        {template?.configSchema?.sections?.map(section => (
          <div key={section.name} className="form-section">
            <h4>{section.name}</h4>
            {section.fields?.map(field => (
              <div key={field.key} className="form-field">
                <label>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                {renderField(field)}
                {field.description && (
                  <span className="field-description">{field.description}</span>
                )}
                {errors[field.key] && (
                  <span className="error-message">{errors[field.key]}</span>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Submit Error */}
        {errors.submit && (
          <div className="submit-error">{errors.submit}</div>
        )}

        {/* Submit Button */}
        <button type="submit" className="btn-submit" disabled={submitting}>
          {submitting ? 'Saving...' : isEditing ? 'Update Strategy' : 'Create Strategy'}
        </button>
      </form>
    </div>
  )
}

export default DynamicStrategyForm

