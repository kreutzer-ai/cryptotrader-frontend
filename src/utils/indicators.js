/**
 * Calculate Simple Moving Average (SMA)
 * @param {Array<number>} data - Array of price data
 * @param {number} period - MA period (e.g., 7, 25, 99)
 * @returns {Array<number|null>} Array of MA values (null for insufficient data points)
 */
export const calculateMA = (data, period) => {
  const result = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      // Not enough data points yet
      result.push(null)
    } else {
      // Calculate average of last 'period' values
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += data[i - j]
      }
      result.push(sum / period)
    }
  }
  
  return result
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param {Array<number>} data - Array of price data
 * @param {number} period - EMA period
 * @returns {Array<number|null>} Array of EMA values
 */
export const calculateEMA = (data, period) => {
  const result = []
  const multiplier = 2 / (period + 1)
  
  // First EMA value is SMA
  let ema = 0
  for (let i = 0; i < period; i++) {
    if (i >= data.length) {
      result.push(null)
      continue
    }
    ema += data[i]
    if (i < period - 1) {
      result.push(null)
    }
  }
  
  ema = ema / period
  result[period - 1] = ema
  
  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema
    result.push(ema)
  }
  
  return result
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param {Array<number>} data - Array of price data
 * @param {number} period - RSI period (typically 14)
 * @returns {Array<number|null>} Array of RSI values (0-100)
 */
export const calculateRSI = (data, period = 14) => {
  const result = []
  const gains = []
  const losses = []
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? -change : 0)
  }
  
  result.push(null) // First value has no RSI
  
  // Calculate initial average gain and loss
  let avgGain = 0
  let avgLoss = 0
  
  for (let i = 0; i < period; i++) {
    if (i >= gains.length) {
      result.push(null)
      continue
    }
    avgGain += gains[i]
    avgLoss += losses[i]
    if (i < period - 1) {
      result.push(null)
    }
  }
  
  avgGain /= period
  avgLoss /= period
  
  const rs = avgGain / avgLoss
  const rsi = 100 - (100 / (1 + rs))
  result.push(rsi)
  
  // Calculate RSI for remaining values
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    
    const rs = avgGain / avgLoss
    const rsi = 100 - (100 / (1 + rs))
    result.push(rsi)
  }
  
  return result
}

/**
 * Calculate Bollinger Bands
 * @param {Array<number>} data - Array of price data
 * @param {number} period - Period for SMA (typically 20)
 * @param {number} stdDev - Number of standard deviations (typically 2)
 * @returns {Object} Object with upper, middle, and lower band arrays
 */
export const calculateBollingerBands = (data, period = 20, stdDev = 2) => {
  const middle = calculateMA(data, period)
  const upper = []
  const lower = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null)
      lower.push(null)
    } else {
      // Calculate standard deviation
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += Math.pow(data[i - j] - middle[i], 2)
      }
      const sd = Math.sqrt(sum / period)
      
      upper.push(middle[i] + (stdDev * sd))
      lower.push(middle[i] - (stdDev * sd))
    }
  }
  
  return { upper, middle, lower }
}

