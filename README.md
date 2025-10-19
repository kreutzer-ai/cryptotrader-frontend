# 📊 Solana Price Chart

A beautiful, real-time candlestick chart for Solana (SOL/USD) with moving averages and trend indicators, built with React and TradingView's Lightweight Charts library.

## ✨ Features

- 📈 **Real-time Candlestick Chart** - Live Solana price data from CryptoTrader API
- 📊 **1-Minute Candles** - High-frequency price updates
- 📉 **Moving Averages** - Short MA and Long MA from your backend (toggleable)
- 🎯 **Trend Direction** - LONG/SHORT/NEUTRAL indicators
- 📊 **Live Statistics** - Current price, change %, and MA values
- 🎨 **Beautiful Dark Theme** - Professional trading interface
- 🔄 **Auto-refresh** - Updates every 5 seconds
- 📱 **Responsive Design** - Works on desktop and mobile
- ⚡ **Fast & Lightweight** - Built with Vite and Lightweight Charts

## 🚀 Quick Start

### Prerequisites

**IMPORTANT**: Make sure your CryptoTrader API is running on `http://localhost:8080`

### Installation

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## 🎯 Usage

- **Moving Averages**: Toggle checkboxes to show/hide Short MA and Long MA lines
- **Chart**: Scroll to zoom, drag to pan, hover for crosshair
- **Statistics**: View current price, change %, trend direction, and MA values at the top

## 🛠️ Technology Stack

- React 19
- Vite 7
- Lightweight Charts 5
- Axios
- CryptoTrader API (your backend)

## 📁 Project Structure

```
src/
├── components/
│   ├── CandlestickChart.jsx    # Main chart with stats
│   └── Controls.jsx             # MA toggle controls
├── services/
│   └── cryptotraderApi.js       # CryptoTrader API integration
├── utils/
│   └── indicators.js            # Technical indicators (for reference)
└── App.jsx
```

## 🔌 API Integration

The app connects to your CryptoTrader API endpoint:

```
GET http://localhost:8080/api/cryptotrader/v1/price/candles/So11111111111111111111111111111111111111112
```

**Expected Response Format:**
```json
[
  {
    "mint": "So11111111111111111111111111111111111111112",
    "timestamp": 1760561280,
    "open": 194.66,
    "high": 195.10,
    "low": 194.66,
    "close": 194.96,
    "shortMa": 194.81,
    "longMa": 194.48,
    "direction": "LONG",
    "complete": true,
    "numberOfPolls": 11
  }
]
```

## 📝 License

ISC
