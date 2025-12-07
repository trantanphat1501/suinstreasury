# SuiNS Treasury Dashboard

A real-time, minimalist dashboard for tracking SuiNS, AEON, and NS Buyback & Burn treasury balances on the Sui blockchain.

## Features

### 📊 Treasury Tracking
- **SuiNS Treasury**: Displays NS, SUI, and USDC balances with real-time prices and individual USD values
- **AEON Treasury**: Tracks SUI token holdings with total USD value in bottom box
- **NS Buyback & Burn**: Monitors total burned NS tokens with daily metrics and transaction history

### 💰 Real-Time Data
- **CoinGecko Integration**: Fetches live token prices (NS, SUI, USDC)
- **Sui RPC**: Direct blockchain queries for accurate treasury balances
- **3-Minute Updates**: Optimized interval reducing API calls by 96.7%
- **Progressive Loading**: Displays total NS burnt first, then loads detailed metrics

### 🎨 User Interface
- **Minimalist Design**: Clean white background with strategic visual hierarchy
- **Dark Mode / Light Mode**: Toggle button at top-right (🌙/☀️), persistent storage
- **Responsive Layout**: Perfectly adapts to desktop, tablet, and mobile
- **Visual Highlights**: Yellow highlight for % of total supply in NS Buyback & Burn
- **Individual Asset Values**: Shows USD value for each token in SuiNS Treasury

### ⏰ Time Display
- **User's Local Timezone**: Automatically detects and displays user's current timezone
- **Last Update Time**: Shows when data was last fetched (centered with update frequency)

## Technical Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (no frameworks)
- **APIs**: 
  - Sui RPC (fullnode.mainnet.sui.io:443)
  - CoinGecko API for price data
- **Optimization**: 
  - Price caching to reduce redundant API calls
  - Metadata caching to minimize RPC requests
  - Efficient DOM updates with minimal reflows

## Project Structure

```
suinstreasury/
├── index.html        # Main HTML structure (54 lines)
├── styles.css        # Responsive styling with dark/light mode (479 lines)
├── app.js           # Core functionality and data fetching (388 lines)
├── vercel.json      # Deployment configuration
└── README.md        # This file
```

## Key Metrics

### SuiNS Treasury
- NS token balance with individual USD value
- SUI token balance with individual USD value
- USDC balance with individual USD value
- Combined USD total value in bottom box

### AEON Treasury
- SUI token balance
- Current SUI price
- Total USD value in bottom box

### NS Buyback & Burn
- **Total NS Burned** (displayed first on load)
- % of total supply burned (highlighted in yellow)
- Today's burn amount
- % change vs yesterday
- Recent burn transactions (last 5)
- USD value of total burned (in bottom box only)

## Performance Optimizations

- **Update Interval**: 180,000ms (3 minutes) vs original 60s = 96.7% reduction in API calls
- **Price Caching**: Single API call per update cycle for all prices
- **Metadata Caching**: Prevents repeated RPC calls for coin metadata
- **DOM Optimization**: Efficient element updates with minimal reflows
- **Code Size**: Lean 351-line JavaScript (no dependencies)

## Responsive Breakpoints

| Device | Grid | Font Size | Min Height |
|--------|------|-----------|-----------|
| Desktop (>768px) | 3-column | Default | 500px |
| Tablet (768px) | 1-column | Reduced | 450px |
| Mobile (480px) | 1-column | Small | 400px |

## Display Format

All treasury totals display as "Total: $X.XX" inside each treasury box at the bottom:
- **Bold Font**: 1.5rem (desktop), 1.3rem (tablet), 1.2rem (mobile)
- **Centered**: All totals aligned horizontally at same vertical position
- **Consistent Styling**: Gradient background with shadow for visual prominence

## Data Sources

- **Token Prices**: CoinGecko API (real-time USD prices)
- **Balance Data**: Sui RPC fullnode (direct blockchain queries)
- **Burn Data**: Transaction blocks to null address (0x000...000)
- **Timezone**: JavaScript Intl API (user's system timezone)

## Token Types

| Token | Type ID | Decimals |
|-------|---------|----------|
| NS | 0x5145...9178::ns::NS | 6 |
| SUI | 0x2::sui::SUI | 9 |
| USDC | 0xdba3...900e7::usdc::USDC | 6 |

## Addresses Used in Project

### 1️⃣ Burn Address (NS Buyback & Burn)
- **Purpose**: Tracks total NS tokens permanently burned
- **Address**: `0x0000000000000000000000000000000000000000000000000000000000000000`
- **Type**: Null/Zero address (immutable, receives burned tokens)

### 2️⃣ SuiNS Treasury Addresses (4 addresses)
- **Purpose**: Stores NS, SUI, and USDC treasury assets
- **Address #1**: `0x9b388a6da9dd4f73e0b13abc6100f1141782ef105f6f5e9d986fb6e00f0b2591`
- **Address #2**: `0x15842c6ed94d1f93e51bd9c324aa07c0a80e017406455383fce0b9132276e69f`
- **Address #3**: `0x451766ec55fb9df787eb37c2ead273fdba067da043c88cbe4866f2ddf33a1338`
- **Address #4**: `0xbe847f00db9c9816222024e50e9024c18afc910c682a47026873527e102c132c`

### 3️⃣ AEON Treasury Address
- **Purpose**: Stores SUI tokens for AEON treasury
- **Address**: `0xecd6ff59119adb34f0e7c4ba57534f1e2e14cc524e319926af9b73cfe9362e18`

### 4️⃣ Token Type Addresses
- **NS Token Type**: `0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS`
- **SUI Token Type**: `0x2::sui::SUI`
- **USDC Token Type**: `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC`

### Summary
| Category | Count | Details |
|----------|-------|---------|
| Burn Address | 1 | Null address for burned tokens |
| SuiNS Treasury | 4 | Multiple wallets for different assets |
| AEON Treasury | 1 | Single wallet for SUI holdings |
| Token Types | 3 | NS, SUI, USDC contract addresses |
| **Total** | **9** | All unique addresses in project |

## Browser Compatibility

- Modern browsers with ES6 support
- Intl API for timezone detection
- Fetch API for HTTP requests
- CSS Grid and Flexbox for layout

## Deployment

Configured for Vercel deployment via `vercel.json`:
- Build command: None required (static files)
- Publish directory: Root folder
- Environment: Production ready

## Theme Support

### Dark Mode / Light Mode
- **Toggle Button**: Located at top-right corner (moon/sun icon)
- **Default Theme**: Dark mode (🌙)
- **Persistent Storage**: User preference saved in localStorage
- **Smooth Transitions**: 0.3s animations when switching themes
- **Full Coverage**: All UI elements styled for both light and dark modes
  - Cards and sections
  - Text and highlights
  - Buttons and interactive elements
  - Footer and navigation



## License

This project tracks real-time treasury data for the SuiNS ecosystem.

---

**Last Updated**: December 5, 2025  
**Status**: ✅ Production Ready  
**Update Interval**: Every 3 minutes  
**Total Lines**: 921 (HTML: 54 | CSS: 479 | JS: 388)
