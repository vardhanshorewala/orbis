# Orbis Frontend

Modern Next.js frontend for the Orbis cross-chain bridge, enabling seamless token swaps between TON and Ethereum networks.

## 🚀 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components with glassmorphism effects
- **State Management**: React hooks + TanStack Query
- **Wallet Integration**:
  - **Ethereum**: RainbowKit + Wagmi
  - **TON**: TON Connect SDK
- **Environment**: T3 Stack with type-safe environment variables

## ✨ Features

### 🎨 Modern Dark UI
- Glassmorphism design with blur effects
- Vibrant gradient colors (purple, cyan, pink)
- Smooth animations and hover effects
- Fully responsive design

### 🔗 Multi-Chain Wallet Support
- **Ethereum Wallets**: MetaMask, WalletConnect, Coinbase Wallet, etc.
- **TON Wallets**: TON Wallet, OpenMask, MyTonWallet, etc.
- Automatic network detection and switching

### 🔄 Swap Interface
- Intuitive token swap UI
- Real-time exchange rate display
- Transaction status tracking
- Error handling and validation

## 🛠️ Setup & Development

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.local.example .env.local
   ```

3. **Configure environment variables** (see [Environment Variables](#environment-variables))

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**: Navigate to `http://localhost:3000`

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

### Required Variables

```bash
# WalletConnect Project ID (Required)
# Get yours at: https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# TON Connect Manifest URL (Required)
# For local development:
NEXT_PUBLIC_TON_MANIFEST_URL=http://localhost:3000/tonconnect-manifest.json
# For production, host the manifest file and use your domain
```

### Optional Variables

```bash
# Alchemy API Key (Optional but recommended)
# Provides better RPC reliability for Ethereum
# Get yours at: https://www.alchemy.com/
NEXT_PUBLIC_ALCHEMY_ID=your_alchemy_key_here
```

## 📜 Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbo
npm run build        # Build for production
npm run start        # Start production server
npm run preview      # Build and start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run typecheck    # TypeScript type checking
npm run check        # Run lint + typecheck

# Formatting
npm run format:check # Check Prettier formatting
npm run format:write # Apply Prettier formatting
```

## 🏗️ Project Structure

```
orbis-frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout with providers
│   │   └── page.tsx         # Home page with swap interface
│   ├── components/          # React components
│   │   ├── header.tsx       # Header with wallet connections
│   │   ├── providers.tsx    # Wallet and query providers
│   │   └── swap-widget.tsx  # Main swap interface
│   ├── lib/                 # Utilities and configurations
│   │   └── wagmi.ts         # Wagmi configuration
│   ├── styles/              # Global styles
│   │   └── globals.css      # Tailwind + custom CSS
│   └── env.js               # Environment variable validation
├── public/
│   └── tonconnect-manifest.json  # TON Connect app manifest
├── .env.local               # Environment variables (create this)
└── package.json
```

## 🎨 Styling & Theming

### Color Palette
- **Primary**: Purple gradients (`#667eea` → `#764ba2`)
- **Secondary**: Pink gradients (`#f093fb` → `#f5576c`)
- **Accent**: Cyan gradients (`#4facfe` → `#00f2fe`)
- **Success**: Green gradients (`#43e97b` → `#38f9d7`)

### Custom CSS Classes
```css
.gradient-primary    /* Purple gradient background */
.gradient-secondary  /* Pink gradient background */
.gradient-accent     /* Cyan gradient background */
.gradient-success    /* Green gradient background */
.text-gradient       /* Gradient text effect */
.glow-primary        /* Purple glow effect */
.glow-secondary      /* Pink glow effect */
```

## 🔗 Wallet Integration

### Ethereum (RainbowKit + Wagmi)
- **Networks**: Sepolia Testnet
- **Wallets**: MetaMask, WalletConnect, Coinbase Wallet, Rainbow, etc.
- **Features**: Auto-connect, network switching, transaction signing

### TON (TON Connect SDK)
- **Networks**: TON Testnet
- **Wallets**: TON Wallet, OpenMask, MyTonWallet, etc.
- **Features**: QR code connection, deep linking, transaction signing

## 🧪 Testing Networks

### Ethereum Sepolia
- **Chain ID**: 11155111
- **RPC**: Alchemy or public endpoints
- **Faucet**: [Sepolia Faucet](https://sepoliafaucet.com/)
- **Explorer**: [Sepolia Etherscan](https://sepolia.etherscan.io/)

### TON Testnet
- **Explorer**: [TON Testnet Explorer](https://testnet.tonscan.org/)
- **Faucet**: Available in TON Wallet apps

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
npm run build
npm run start
```

## 🔧 Configuration Files

- **`next.config.js`**: Next.js configuration
- **`tailwind.config.js`**: Tailwind CSS configuration (v4)
- **`tsconfig.json`**: TypeScript configuration
- **`eslint.config.js`**: ESLint configuration
- **`prettier.config.js`**: Prettier configuration

## 🐛 Troubleshooting

### Common Issues

1. **Wallet Connection Issues**
   - Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set
   - Check if TON Connect manifest is accessible
   - Try clearing browser cache

2. **Build Errors**
   - Run `npm run typecheck` to identify TypeScript issues
   - Ensure all environment variables are properly set
   - Check for missing dependencies

3. **Styling Issues**
   - Tailwind CSS v4 syntax may differ from v3
   - Custom gradients are defined in `globals.css`
   - Check browser developer tools for CSS conflicts

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [RainbowKit Documentation](https://rainbowkit.com/)
- [TON Connect Documentation](https://docs.ton.org/develop/dapps/ton-connect/overview)
- [Wagmi Documentation](https://wagmi.sh/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**⚠️ Development Mode**: This frontend is configured for testnet development. Always verify network settings before mainnet deployment.
