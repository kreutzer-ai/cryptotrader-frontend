import React from 'react'
import './Controls.css'

const Controls = ({
  showShortMa,
  setShowShortMa,
  showLongMa,
  setShowLongMa
}) => {
  return (
    <div className="controls">
      <div className="control-group">
        <label>Moving Averages:</label>
        <div className="ma-toggles">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showShortMa}
              onChange={(e) => setShowShortMa(e.target.checked)}
            />
            <span className="ma-short">Short MA</span>
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showLongMa}
              onChange={(e) => setShowLongMa(e.target.checked)}
            />
            <span className="ma-long">Long MA</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default Controls

