# Multi-Resolution Chart Feature

## Overview

The frontend now supports **three different chart resolutions** for viewing SOL/USD price data:

1. **1-Minute Candles** - Standard OHLC candles with moving averages
2. **15-Second Candles** - Higher resolution OHLC candles for detailed analysis
3. **Price Ticks** - Raw price updates every 3 seconds (line chart)

## Features

### Resolution Selector

Three buttons at the top of the chart allow you to switch between resolutions:
- **1-Minute Candles** - Traditional candlestick chart with MA indicators
- **15-Second Candles** - 4x higher resolution for intraday analysis
- **Price Ticks (3s)** - Real-time price line chart showing every update

### Dynamic Time Presets

Each resolution has appropriate time range presets:

**Price Ticks (3-second intervals):**
- 1min (20 ticks)
- 5min (100 ticks)
- 15min (300 ticks)
- 30min (600 ticks)
- 1h (1200 ticks)
- 2h (2400 ticks)

**15-Second Candles:**
- 15min (60 candles)
- 30min (120 candles)
- 1h (240 candles)
- 2h (480 candles)
- 4h (960 candles)
- 8h (1920 candles)

**1-Minute Candles:**
- 1h (60 candles)
- 2h (120 candles)
- 4h (240 candles)
- 8h (480 candles)
- 12h (720 candles)
- 1d (1440 candles)
- 2d (2880 candles)
- 3d (4320 candles)
- 1w (10080 candles)

### Auto-Refresh

Charts automatically refresh based on resolution:
- **Price Ticks**: Every 5 seconds
- **15-Second Candles**: Every 15 seconds
- **1-Minute Candles**: Every 60 seconds

### Statistics Display

Real-time stats shown above the chart:
- **Current Price**: Latest price value
- **Change**: Price change and percentage from previous data point
- **Data Points**: Number of data points displayed
- **Avg Ticks/Candle**: (15-sec candles only) Average number of ticks per candle
- **Last Update**: Timestamp of last data refresh

### Interactive Features

- **Zoom**: Mouse wheel or pinch to zoom in/out
- **Pan**: Click and drag to pan across time
- **Data Zoom Slider**: Bottom slider for quick navigation
- **Tooltips**: Hover over data points for detailed information

## Use Cases

### 1. Price Ticks - Ultra-Short-Term Analysis
**Best for:**
- Monitoring rapid price movements
- Detecting micro-trends
- Analyzing order flow impact
- High-frequency trading analysis

**Example:** View last 5 minutes of ticks to see exact price movements during a volatile period.

### 2. 15-Second Candles - Intraday Trading
**Best for:**
- Scalping strategies
- Entry/exit timing optimization
- Volatility analysis
- Pattern recognition at sub-minute level

**Example:** View last hour of 15-sec candles to identify precise entry points for a trade.

### 3. 1-Minute Candles - Standard Trading
**Best for:**
- Day trading
- Moving average crossover strategies
- Trend analysis
- Position monitoring

**Example:** View last 4 hours with MA5 and MA25 to identify trend changes.

## Technical Details

### Data Sources

All data comes from the CryptoTrader backend API:

**Price Ticks:**
```
GET /api/cryptotrader/v1/price/ticks/{mint}?limit=100
```

**15-Second Candles:**
```
GET /api/cryptotrader/v1/price/candles-15sec/{mint}?limit=240
```

**1-Minute Candles:**
```
GET /api/cryptotrader/v1/price/candles/{mint}?limit=300
```

### Chart Library

Uses **Apache ECharts** for rendering:
- High performance with large datasets
- Smooth animations and interactions
- Professional dark theme
- Mobile-responsive

### Data Flow

```
Backend (TimescaleDB)
    ↓
REST API
    ↓
Frontend API Service (cryptotraderApi.js)
    ↓
MultiResolutionChart Component
    ↓
ECharts Rendering
```

## Deployment

### Build Frontend

```bash
cd ../solana-chart-frontend
npm install
npm run build
```

### Deploy to VM

```bash
# Copy dist folder to VM
scp -r dist/* user@vm:/var/www/cryptotrader-frontend/

# Or use the deployment script
./deploy.sh
```

### Verify

1. Open browser: `http://your-vm-ip`
2. Click resolution buttons to switch between views
3. Check that data loads for all three resolutions
4. Verify auto-refresh is working

## Troubleshooting

### No Data for Price Ticks

**Symptom**: "No data" or empty chart when selecting Price Ticks

**Solution**:
1. Check backend is running and collecting ticks
2. Verify database has tick data: `SELECT COUNT(*) FROM price_ticks;`
3. Check API endpoint: `curl http://localhost:8080/api/cryptotrader/v1/price/ticks/So11111111111111111111111111111111111111112?limit=10`
4. Wait 1-2 minutes for data to accumulate

### No Data for 15-Second Candles

**Symptom**: "No data" or empty chart when selecting 15-Second Candles

**Solution**:
1. Check backend is aggregating candles
2. Verify database: `SELECT COUNT(*) FROM candles_15sec;`
3. Check API endpoint: `curl http://localhost:8080/api/cryptotrader/v1/price/candles-15sec/So11111111111111111111111111111111111111112?limit=10`
4. Check logs for Candle15SecAggregator errors

### Chart Not Updating

**Symptom**: Chart loads but doesn't auto-refresh

**Solution**:
1. Check browser console for errors
2. Verify API is accessible
3. Check network tab for failed requests
4. Refresh page manually

### Performance Issues

**Symptom**: Chart is slow or laggy

**Solution**:
1. Reduce data points (lower limit value)
2. Use appropriate resolution for time range
3. Close other browser tabs
4. Check backend performance

## Best Practices

### 1. Choose Appropriate Resolution

- **Short-term (< 1 hour)**: Use Price Ticks or 15-sec candles
- **Medium-term (1-8 hours)**: Use 15-sec or 1-min candles
- **Long-term (> 8 hours)**: Use 1-min candles

### 2. Optimize Data Points

- Don't load more data than needed
- Use presets for common time ranges
- Consider backend load when setting limits

### 3. Monitor Performance

- Watch for slow API responses
- Check database query times
- Monitor browser memory usage

## Future Enhancements

Potential improvements:
1. **Custom Time Ranges**: Date picker for specific time periods
2. **Multiple Tokens**: Compare different tokens side-by-side
3. **Technical Indicators**: Add RSI, MACD, Bollinger Bands to tick/15-sec charts
4. **Export Data**: Download tick/candle data as CSV
5. **Alerts**: Set price alerts on tick-level data
6. **Volume Data**: Add volume bars if available
7. **WebSocket Support**: Real-time streaming instead of polling

## Summary

The Multi-Resolution Chart provides:
- ✅ Three chart resolutions (ticks, 15-sec, 1-min)
- ✅ Dynamic time range presets
- ✅ Auto-refresh based on resolution
- ✅ Real-time statistics
- ✅ Interactive zoom and pan
- ✅ Professional dark theme
- ✅ Mobile-responsive design

Perfect for traders who need different levels of detail for different trading strategies!

