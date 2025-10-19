import React, { useEffect, useState, useRef } from 'react'
import './CycleTimeline.css'

const CycleTimeline = ({ cycles, chartTimeRange }) => {
  const [visibleCycles, setVisibleCycles] = useState([])
  const timelineRef = useRef(null)

  useEffect(() => {
    if (!cycles || cycles.length === 0 || !chartTimeRange) {
      setVisibleCycles([])
      return
    }

    // Filter cycles that are visible in the current time range
    const { from, to } = chartTimeRange
    const visible = cycles.filter(cycle => {
      const startTime = new Date(cycle.startTime).getTime() / 1000
      const endTime = cycle.endTime 
        ? new Date(cycle.endTime).getTime() / 1000
        : Date.now() / 1000
      
      // Check if cycle overlaps with visible range
      return (startTime <= to && endTime >= from)
    })

    setVisibleCycles(visible)
  }, [cycles, chartTimeRange])

  const calculatePosition = (cycle) => {
    if (!chartTimeRange) return { left: 0, width: 0 }

    const { from, to } = chartTimeRange
    const totalDuration = to - from
    
    const startTime = new Date(cycle.startTime).getTime() / 1000
    const endTime = cycle.endTime 
      ? new Date(cycle.endTime).getTime() / 1000
      : Date.now() / 1000

    // Calculate position as percentage
    const left = Math.max(0, ((startTime - from) / totalDuration) * 100)
    const right = Math.min(100, ((endTime - from) / totalDuration) * 100)
    const width = right - left

    return { left, width }
  }

  const getColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return '#2e7d32' // Green
      case 'CLOSED_PROFIT':
        return '#1976d2' // Blue
      case 'CLOSED_DURATION':
        return '#f57c00' // Orange
      case 'FAILED':
        return '#c62828' // Red
      default:
        return '#4a90e2' // Light blue
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active'
      case 'CLOSED_PROFIT':
        return 'Profit'
      case 'CLOSED_DURATION':
        return 'Duration'
      case 'FAILED':
        return 'Failed'
      default:
        return status
    }
  }

  if (!cycles || cycles.length === 0) {
    return (
      <div className="cycle-timeline" ref={timelineRef}>
        <div className="timeline-label">Cycles:</div>
        <div className="timeline-track">
          <div className="no-cycles-message">
            Select a strategy to view cycle periods
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cycle-timeline" ref={timelineRef}>
      <div className="timeline-label">Cycles:</div>
      <div className="timeline-track">
        {visibleCycles.length === 0 && cycles.length > 0 && (
          <div className="no-cycles-message">
            Zoom out to see cycle periods
          </div>
        )}
        {visibleCycles.map((cycle) => {
          const { left, width } = calculatePosition(cycle)
          const color = getColor(cycle.status)
          
          if (width <= 0) return null

          return (
            <div
              key={cycle.id}
              className="cycle-bar"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: color,
                borderColor: color,
              }}
              title={`Cycle #${cycle.cycleNumber} - ${getStatusLabel(cycle.status)}\nStart: ${new Date(cycle.startTime).toLocaleString()}\nEnd: ${cycle.endTime ? new Date(cycle.endTime).toLocaleString() : 'Active'}`}
            >
              <span className="cycle-label">{cycle.cycleNumber}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CycleTimeline

