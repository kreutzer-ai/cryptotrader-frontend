/**
 * CSV Export Utility
 * Provides functions to download CSV files from API endpoints or generate CSV from local data
 */

/**
 * Download CSV file from API endpoint
 * @param {string} url - API endpoint URL
 * @param {string} filename - Name for the downloaded file
 */
export const downloadCsvFromApi = async (url, filename) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const csvData = await response.text()
    downloadCsvData(csvData, filename)
  } catch (error) {
    console.error('Error downloading CSV:', error)
    throw new Error('Failed to download CSV file')
  }
}

/**
 * Download CSV data as file
 * @param {string} csvData - CSV content as string
 * @param {string} filename - Name for the downloaded file
 */
export const downloadCsvData = (csvData, filename) => {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the URL object
  URL.revokeObjectURL(url)
}

/**
 * Generate CSV from local data array
 * @param {Array} data - Array of objects to convert to CSV
 * @param {Array<string>} headers - Column headers
 * @param {string} filename - Name for the downloaded file
 */
export const generateAndDownloadCsv = (data, headers, filename) => {
  const csvContent = generateCsvContent(data, headers)
  downloadCsvData(csvContent, filename)
}

/**
 * Generate CSV content from data
 * @param {Array} data - Array of objects
 * @param {Array<string>} headers - Column headers
 * @returns {string} CSV content
 */
export const generateCsvContent = (data, headers) => {
  // Escape CSV values
  const escapeValue = (value) => {
    if (value === null || value === undefined) {
      return ''
    }
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  // Build header row
  const headerRow = headers.map(escapeValue).join(',')

  // Build data rows
  const dataRows = data.map(row => {
    return headers.map(header => escapeValue(row[header])).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Format price ticks data for CSV
 * @param {Array} ticks - Array of price tick objects
 * @returns {Object} { data, headers }
 */
export const formatPriceTicksForCsv = (ticks) => {
  const headers = ['Time', 'Mint', 'Price']
  const data = ticks.map(tick => ({
    Time: new Date(tick.tickTime).toISOString(),
    Mint: tick.mint,
    Price: tick.price
  }))
  return { data, headers }
}

/**
 * Format 15-second candles data for CSV
 * @param {Array} candles - Array of 15-second candle objects
 * @returns {Object} { data, headers }
 */
export const format15SecCandlesForCsv = (candles) => {
  const headers = ['Time', 'Mint', 'Open', 'High', 'Low', 'Close', 'Ticks', 'Complete']
  const data = candles.map(candle => ({
    Time: new Date(candle.time).toISOString(),
    Mint: candle.mint,
    Open: candle.open,
    High: candle.high,
    Low: candle.low,
    Close: candle.close,
    Ticks: candle.numberOfTicks,
    Complete: candle.complete
  }))
  return { data, headers }
}

/**
 * Format 1-minute candles data for CSV
 * @param {Array} candles - Array of 1-minute candle objects
 * @returns {Object} { data, headers }
 */
export const formatCandlesForCsv = (candles) => {
  // Build headers: base headers + MA1 to MA50
  const baseHeaders = ['Time', 'Mint', 'Open', 'High', 'Low', 'Close', 'Polls', 'Complete', 'Direction']
  const maHeaders = Array.from({ length: 50 }, (_, i) => `MA${i + 1}`)
  const headers = [...baseHeaders, ...maHeaders]

  const data = candles.map(candle => {
    const row = {
      Time: new Date(candle.time).toISOString(),
      Mint: candle.mint,
      Open: candle.open,
      High: candle.high,
      Low: candle.low,
      Close: candle.close,
      Polls: candle.numberOfPolls,
      Complete: candle.complete,
      Direction: candle.direction || ''
    }

    // Add moving averages
    if (candle.movingAverages) {
      for (let i = 1; i <= 50; i++) {
        row[`MA${i}`] = candle.movingAverages[String(i)] || ''
      }
    } else {
      for (let i = 1; i <= 50; i++) {
        row[`MA${i}`] = ''
      }
    }

    return row
  })

  return { data, headers }
}

/**
 * Generate filename with timestamp
 * @param {string} prefix - Filename prefix
 * @param {string} mint - Token mint address (optional)
 * @returns {string} Filename with timestamp
 */
export const generateFilename = (prefix, mint = null) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const mintPart = mint ? `-${mint.slice(0, 8)}` : ''
  return `${prefix}${mintPart}-${timestamp}.csv`
}
