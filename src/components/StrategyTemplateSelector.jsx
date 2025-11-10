import React, { useState } from 'react'
import './StrategyTemplateSelector.css'

const StrategyTemplateSelector = ({ definitions, selectedTemplate, onSelect }) => {
  const [filter, setFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  // Group definitions by category
  const categories = ['ALL', ...new Set(definitions.map(d => d.category || 'UNCATEGORIZED'))]

  const filteredDefinitions = definitions.filter(def => {
    const matchesSearch = def.displayName?.toLowerCase().includes(filter.toLowerCase()) ||
                         def.description?.toLowerCase().includes(filter.toLowerCase())
    const matchesCategory = categoryFilter === 'ALL' || def.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="strategy-template-selector">
      <h3>Strategy Templates</h3>

      {/* Search Filter */}
      <input
        type="text"
        className="template-search"
        placeholder="Search templates..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {/* Category Filter */}
      <div className="category-filter">
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-btn ${categoryFilter === cat ? 'active' : ''}`}
            onClick={() => setCategoryFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template List */}
      <div className="template-list">
        {filteredDefinitions.length === 0 ? (
          <div className="no-templates">No templates found</div>
        ) : (
          filteredDefinitions.map(def => (
            <div
              key={def.id}
              className={`template-card ${selectedTemplate?.id === def.id ? 'selected' : ''}`}
              onClick={() => onSelect(def)}
            >
              <div className="template-header">
                <h4>{def.displayName || def.name}</h4>
                <span className={`template-type ${def.strategyType?.toLowerCase()}`}>
                  {def.strategyType}
                </span>
              </div>
              <p className="template-description">{def.description}</p>
              {def.category && (
                <span className="template-category">{def.category}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default StrategyTemplateSelector

