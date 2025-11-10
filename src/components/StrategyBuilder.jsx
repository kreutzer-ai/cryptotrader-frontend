import React, { useState, useEffect } from 'react'
import './StrategyBuilder.css'
import StrategyTemplateSelector from './StrategyTemplateSelector'
import DynamicStrategyForm from './DynamicStrategyForm'
import StrategyPreview from './StrategyPreview'
import StrategyList from './StrategyList'
import { fetchStrategyDefinitions, fetchAllStrategies } from '../services/strategyApi'

const StrategyBuilder = () => {
  const [view, setView] = useState('list') // 'list' or 'create'
  const [strategyDefinitions, setStrategyDefinitions] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [strategyConfig, setStrategyConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [strategies, setStrategies] = useState([])
  const [editingStrategy, setEditingStrategy] = useState(null)

  useEffect(() => {
    loadStrategyDefinitions()
    loadStrategies()
  }, [])

  const loadStrategyDefinitions = async () => {
    try {
      setLoading(true)
      const definitions = await fetchStrategyDefinitions()
      setStrategyDefinitions(definitions)
      setError(null)
    } catch (err) {
      console.error('Error loading strategy definitions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStrategies = async () => {
    try {
      const allStrategies = await fetchAllStrategies()
      setStrategies(allStrategies)
    } catch (err) {
      console.error('Error loading strategies:', err)
    }
  }

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template)
    setStrategyConfig({})
    setEditingStrategy(null)
  }

  const handleCreateNew = () => {
    setView('create')
    setSelectedTemplate(null)
    setStrategyConfig({})
    setEditingStrategy(null)
  }

  const handleBackToList = () => {
    setView('list')
    setSelectedTemplate(null)
    setStrategyConfig({})
    setEditingStrategy(null)
    loadStrategies()
  }

  const handleEditStrategy = (strategy) => {
    setEditingStrategy(strategy)
    // Find the template for this strategy
    const template = strategyDefinitions.find(d => d.name === strategy.strategyName)
    setSelectedTemplate(template)
    setStrategyConfig(strategy)
    setView('create')
  }

  const handleStrategyCreated = () => {
    handleBackToList()
  }

  if (loading) {
    return (
      <div className="strategy-builder">
        <div className="loading">Loading strategy definitions...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="strategy-builder">
        <div className="error">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="strategy-builder">
      <div className="strategy-builder-header">
        <h2>Strategy Manager</h2>
        {view === 'list' ? (
          <button className="btn-primary" onClick={handleCreateNew}>
            + Create New Strategy
          </button>
        ) : (
          <button className="btn-secondary" onClick={handleBackToList}>
            ← Back to List
          </button>
        )}
      </div>

      {view === 'list' ? (
        <StrategyList
          strategies={strategies}
          onEdit={handleEditStrategy}
          onRefresh={loadStrategies}
        />
      ) : (
        <div className="strategy-builder-content">
          {/* Left: Template Selection */}
          <div className="template-selector-panel">
            <StrategyTemplateSelector
              definitions={strategyDefinitions}
              selectedTemplate={selectedTemplate}
              onSelect={handleTemplateSelect}
            />
          </div>

          {/* Center: Dynamic Form */}
          <div className="strategy-form-panel">
            {selectedTemplate ? (
              <DynamicStrategyForm
                template={selectedTemplate}
                initialConfig={editingStrategy}
                onChange={setStrategyConfig}
                onSuccess={handleStrategyCreated}
              />
            ) : (
              <div className="no-template-selected">
                <p>← Select a strategy template to begin</p>
              </div>
            )}
          </div>

          {/* Right: Live Preview */}
          <div className="strategy-preview-panel">
            {selectedTemplate && (
              <StrategyPreview
                template={selectedTemplate}
                config={strategyConfig}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StrategyBuilder

