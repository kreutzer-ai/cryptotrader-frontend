import React, { useState, useEffect } from 'react'
import { fetchWallets, createStrategy, updateStrategy } from '../services/strategyApi'
import './StrategyForm.css'

const StrategyForm = ({ strategy, onSuccess, onCancel }) => {
  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    walletId: '',
    mint: 'So11111111111111111111111111111111111111112', // SOL default
    strategyName: '',
    strategyType: 'MOVING_AVERAGE_CYCLE', // New field to select strategy type
    enabled: false,
    testMode: true,
    baseCurrencyMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    capitalAllocationPercent: '100.00',
    reserveSol: '0.1',
    profitThreshold: '0.08',
    shortMaPeriod: '5',
    longMaPeriod: '25',
    cycleBalanceAfter: '500',
    cycleMaxDuration: '15',
    positionOpenInterval: '1',
    trendChangeStrategy: false,
    leverage: '5.5',
    maxCapitalPerCycle: '',
    simulatedBalance: '10000.00',
    // MA Derivation fields
    maDerivationPeriod: '20',
    longEntryThreshold: '0.15',
    longExitThreshold: '0.05',
    shortEntryThreshold: '-0.15',
    shortExitThreshold: '-0.05'
  })

  const isEditMode = !!strategy

  // Load wallets on mount
  useEffect(() => {
    loadWallets()
  }, [])

  // Populate form when editing
  useEffect(() => {
    if (strategy) {
      setFormData({
        walletId: strategy.walletId?.toString() || '',
        mint: strategy.mint || 'So11111111111111111111111111111111111111112',
        strategyName: strategy.strategyName || '',
        strategyType: strategy.strategyName || 'MOVING_AVERAGE_CYCLE',
        enabled: strategy.enabled || false,
        testMode: strategy.testMode !== undefined ? strategy.testMode : true,
        baseCurrencyMint: strategy.baseCurrencyMint || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        capitalAllocationPercent: strategy.capitalAllocationPercent?.toString() || '100.00',
        reserveSol: strategy.reserveSol?.toString() || '0.1',
        profitThreshold: strategy.profitThreshold?.toString() || '0.08',
        shortMaPeriod: strategy.shortMaPeriod?.toString() || '5',
        longMaPeriod: strategy.longMaPeriod?.toString() || '25',
        cycleBalanceAfter: strategy.cycleBalanceAfter?.toString() || '500',
        cycleMaxDuration: strategy.cycleMaxDuration?.toString() || '15',
        positionOpenInterval: strategy.positionOpenInterval?.toString() || '1',
        trendChangeStrategy: strategy.trendChangeStrategy || false,
        leverage: strategy.leverage?.toString() || '5.5',
        maxCapitalPerCycle: strategy.maxCapitalPerCycle?.toString() || '',
        simulatedBalance: strategy.simulatedBalance?.toString() || '10000.00',
        maDerivationPeriod: strategy.maDerivationPeriod?.toString() || '20',
        longEntryThreshold: strategy.longEntryThreshold?.toString() || '0.15',
        longExitThreshold: strategy.longExitThreshold?.toString() || '0.05',
        shortEntryThreshold: strategy.shortEntryThreshold?.toString() || '-0.15',
        shortExitThreshold: strategy.shortExitThreshold?.toString() || '-0.05'
      })
    }
  }, [strategy])

  const loadWallets = async () => {
    try {
      const data = await fetchWallets()
      setWallets(data)
    } catch (err) {
      console.error('Error loading wallets:', err)
      setError('Failed to load wallets')
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Convert form data to API format
      const payload = {
        ...(!isEditMode && { walletId: parseInt(formData.walletId) }),
        ...(!isEditMode && { mint: formData.mint }),
        ...(!isEditMode && { strategyName: formData.strategyType }), // Use strategyType as strategyName
        enabled: formData.enabled,
        testMode: formData.testMode,
        baseCurrencyMint: formData.baseCurrencyMint,
        capitalAllocationPercent: parseFloat(formData.capitalAllocationPercent),
        reserveSol: parseFloat(formData.reserveSol),
        profitThreshold: parseFloat(formData.profitThreshold),
        leverage: parseFloat(formData.leverage),
        ...(formData.maxCapitalPerCycle && { maxCapitalPerCycle: parseFloat(formData.maxCapitalPerCycle) }),
        simulatedBalance: parseFloat(formData.simulatedBalance)
      }

      // Add strategy-specific fields based on type
      if (formData.strategyType === 'MA_DERIVATION') {
        // MA Derivation strategy fields
        payload.maDerivationPeriod = parseInt(formData.maDerivationPeriod)
        payload.longEntryThreshold = parseFloat(formData.longEntryThreshold)
        payload.longExitThreshold = parseFloat(formData.longExitThreshold)
        payload.shortEntryThreshold = parseFloat(formData.shortEntryThreshold)
        payload.shortExitThreshold = parseFloat(formData.shortExitThreshold)
      } else {
        // MA Crossover strategy fields
        payload.shortMaPeriod = parseInt(formData.shortMaPeriod)
        payload.longMaPeriod = parseInt(formData.longMaPeriod)
        payload.cycleBalanceAfter = parseInt(formData.cycleBalanceAfter)
        payload.cycleMaxDuration = parseInt(formData.cycleMaxDuration)
        payload.positionOpenInterval = parseInt(formData.positionOpenInterval)
        payload.trendChangeStrategy = formData.trendChangeStrategy
      }

      let result
      if (isEditMode) {
        result = await updateStrategy(strategy.id, payload)
      } else {
        result = await createStrategy(payload)
      }

      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      setError(err.message || 'Failed to save strategy')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="strategy-form-container">
      <div className="strategy-form-header">
        <h2>{isEditMode ? 'Edit Strategy' : 'Create New Strategy'}</h2>
        <button className="close-btn" onClick={onCancel} type="button">×</button>
      </div>

      {error && (
        <div className="form-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="strategy-form">
        {/* Basic Info */}
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="walletId">Wallet *</label>
              <select
                id="walletId"
                name="walletId"
                value={formData.walletId}
                onChange={handleChange}
                required
                disabled={isEditMode}
              >
                <option value="">Select wallet...</option>
                {wallets.map(wallet => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} ({wallet.publicKey.substring(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="strategyType">Strategy Type *</label>
              <select
                id="strategyType"
                name="strategyType"
                value={formData.strategyType}
                onChange={handleChange}
                required
                disabled={isEditMode}
              >
                <option value="MOVING_AVERAGE_CYCLE">MA Crossover (Time-based/Trend)</option>
                <option value="MA_DERIVATION">MA Derivation (Momentum)</option>
              </select>
              <small>
                {formData.strategyType === 'MA_DERIVATION'
                  ? 'Trade based on MA rate of change (momentum)'
                  : 'Trade based on MA crossovers'}
              </small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mint">Token Mint *</label>
              <select
                id="mint"
                name="mint"
                value={formData.mint}
                onChange={handleChange}
                required
                disabled={isEditMode}
              >
                <option value="So11111111111111111111111111111111111111112">SOL</option>
                <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">USDC</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="baseCurrencyMint">Base Currency</label>
              <select
                id="baseCurrencyMint"
                name="baseCurrencyMint"
                value={formData.baseCurrencyMint}
                onChange={handleChange}
              >
                <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">USDC</option>
                <option value="So11111111111111111111111111111111111111112">SOL</option>
              </select>
            </div>
          </div>

          <div className="form-row form-row-checkboxes">
            <div className="form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  name="enabled"
                  checked={formData.enabled}
                  onChange={handleChange}
                />
                <span>Enabled</span>
              </label>
            </div>

            <div className="form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  name="testMode"
                  checked={formData.testMode}
                  onChange={handleChange}
                />
                <span>Test Mode (Paper Trading)</span>
              </label>
            </div>

            <div className="form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  name="trendChangeStrategy"
                  checked={formData.trendChangeStrategy}
                  onChange={handleChange}
                />
                <span>Trend Change Strategy</span>
              </label>
            </div>
          </div>
        </div>

        {/* Capital Management */}
        <div className="form-section">
          <h3>Capital Management</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="capitalAllocationPercent">Capital Allocation (%)</label>
              <input
                type="number"
                id="capitalAllocationPercent"
                name="capitalAllocationPercent"
                value={formData.capitalAllocationPercent}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                required
              />
              <small>Percentage of wallet balance to use (0-100%)</small>
            </div>

            <div className="form-group">
              <label htmlFor="reserveSol">Reserve SOL</label>
              <input
                type="number"
                id="reserveSol"
                name="reserveSol"
                value={formData.reserveSol}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
              />
              <small>SOL to keep for transaction fees</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="leverage">Leverage</label>
              <input
                type="number"
                id="leverage"
                name="leverage"
                value={formData.leverage}
                onChange={handleChange}
                min="0.1"
                step="0.1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxCapitalPerCycle">Max Capital Per Cycle</label>
              <input
                type="number"
                id="maxCapitalPerCycle"
                name="maxCapitalPerCycle"
                value={formData.maxCapitalPerCycle}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="Optional"
              />
              <small>Leave empty for no limit</small>
            </div>
          </div>
        </div>

        {/* Strategy Parameters - MA Derivation */}
        {formData.strategyType === 'MA_DERIVATION' && (
          <div className="form-section">
            <h3>MA Derivation Parameters</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="maDerivationPeriod">MA Period to Monitor</label>
                <input
                  type="number"
                  id="maDerivationPeriod"
                  name="maDerivationPeriod"
                  value={formData.maDerivationPeriod}
                  onChange={handleChange}
                  min="1"
                  max="200"
                  required
                />
                <small>Which MA to monitor for rate of change (1-200)</small>
              </div>

              <div className="form-group">
                <label htmlFor="leverage">Leverage</label>
                <input
                  type="number"
                  id="leverage"
                  name="leverage"
                  value={formData.leverage}
                  onChange={handleChange}
                  min="0.1"
                  step="0.1"
                  required
                />
                <small>Position leverage multiplier</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="longEntryThreshold">LONG Entry Threshold (%)</label>
                <input
                  type="number"
                  id="longEntryThreshold"
                  name="longEntryThreshold"
                  value={formData.longEntryThreshold}
                  onChange={handleChange}
                  step="0.01"
                  required
                />
                <small>Enter LONG when MA Δ &gt; this (e.g., 0.15)</small>
              </div>

              <div className="form-group">
                <label htmlFor="longExitThreshold">LONG Exit Threshold (%)</label>
                <input
                  type="number"
                  id="longExitThreshold"
                  name="longExitThreshold"
                  value={formData.longExitThreshold}
                  onChange={handleChange}
                  step="0.01"
                  required
                />
                <small>Exit LONG when MA Δ &lt; this (e.g., 0.05)</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="shortEntryThreshold">SHORT Entry Threshold (%)</label>
                <input
                  type="number"
                  id="shortEntryThreshold"
                  name="shortEntryThreshold"
                  value={formData.shortEntryThreshold}
                  onChange={handleChange}
                  step="0.01"
                  required
                />
                <small>Enter SHORT when MA Δ &lt; this (e.g., -0.15)</small>
              </div>

              <div className="form-group">
                <label htmlFor="shortExitThreshold">SHORT Exit Threshold (%)</label>
                <input
                  type="number"
                  id="shortExitThreshold"
                  name="shortExitThreshold"
                  value={formData.shortExitThreshold}
                  onChange={handleChange}
                  step="0.01"
                  required
                />
                <small>Exit SHORT when MA Δ &gt; this (e.g., -0.05)</small>
              </div>
            </div>
          </div>
        )}

        {/* Strategy Parameters - MA Crossover */}
        {formData.strategyType === 'MOVING_AVERAGE_CYCLE' && (
          <div className="form-section">
            <h3>MA Crossover Parameters</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="shortMaPeriod">Short MA Period</label>
                <input
                  type="number"
                  id="shortMaPeriod"
                  name="shortMaPeriod"
                  value={formData.shortMaPeriod}
                  onChange={handleChange}
                  min="1"
                  max="50"
                  required
                />
                <small>Fast moving average (1-50 candles)</small>
              </div>

              <div className="form-group">
                <label htmlFor="longMaPeriod">Long MA Period</label>
                <input
                  type="number"
                  id="longMaPeriod"
                  name="longMaPeriod"
                  value={formData.longMaPeriod}
                  onChange={handleChange}
                  min="1"
                  max="50"
                  required
                />
                <small>Slow moving average (1-50 candles)</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="profitThreshold">Profit Threshold</label>
                <input
                  type="number"
                  id="profitThreshold"
                  name="profitThreshold"
                  value={formData.profitThreshold}
                  onChange={handleChange}
                  min="0.0001"
                  step="0.0001"
                  required
                />
                <small>Close cycle at this profit (e.g., 0.08 = 8%)</small>
              </div>

              <div className="form-group">
                <label htmlFor="positionOpenInterval">Position Open Interval (min)</label>
                <input
                  type="number"
                  id="positionOpenInterval"
                  name="positionOpenInterval"
                  value={formData.positionOpenInterval}
                  onChange={handleChange}
                  min="1"
                  required
                />
                <small>Minutes between opening positions</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cycleMaxDuration">Cycle Max Duration (candles)</label>
                <input
                  type="number"
                  id="cycleMaxDuration"
                  name="cycleMaxDuration"
                  value={formData.cycleMaxDuration}
                  onChange={handleChange}
                  min="1"
                  required
                />
                <small>Maximum cycle length in 1-minute candles</small>
              </div>

              <div className="form-group">
                <label htmlFor="cycleBalanceAfter">Cycle Balance After</label>
                <input
                  type="number"
                  id="cycleBalanceAfter"
                  name="cycleBalanceAfter"
                  value={formData.cycleBalanceAfter}
                  onChange={handleChange}
                  min="1"
                  required
                />
                <small>Candles before balancing activates</small>
              </div>
            </div>
          </div>
        )}

        {/* Test Mode Settings */}
        {formData.testMode && (
          <div className="form-section">
            <h3>Test Mode Settings</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="simulatedBalance">Simulated Balance</label>
                <input
                  type="number"
                  id="simulatedBalance"
                  name="simulatedBalance"
                  value={formData.simulatedBalance}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                />
                <small>Virtual balance for paper trading</small>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Saving...' : (isEditMode ? 'Update Strategy' : 'Create Strategy')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default StrategyForm

