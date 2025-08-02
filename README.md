# Orbis - Cross-Chain Bridge

A decentralized cross-chain bridge enabling seamless token swaps between TON and Ethereum networks.

## 🌟 Features

- **Cross-Chain Swaps**: Swap tokens between TON and Ethereum (Sepolia testnet)
- **Secure Escrow**: Smart contracts handle token custody during swaps
- **Modern UI**: Dark-themed, responsive frontend with glassmorphism effects
- **Multi-Wallet Support**: 
  - Ethereum: RainbowKit integration (MetaMask, WalletConnect, etc.)
  - TON: TON Connect SDK integration
- **Testnet Ready**: Configured for Sepolia (ETH) and TON Testnet

## 🏗️ Architecture

```
orbis/
├── orbis-frontend/     # Next.js frontend application
├── tron/              # TON smart contracts (FunC)
└── orbis/             # Additional project files
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd orbis
   ```

2. **Set up the frontend**
   ```bash
   cd orbis-frontend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your values
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

- **`orbis-frontend/`**: Next.js application with T3 stack
  - React 19, TypeScript, Tailwind CSS
  - RainbowKit for Ethereum wallets
  - TON Connect for TON wallets
  
- **`tron/`**: TON blockchain smart contracts
  - FunC contracts for escrow functionality
  - Deployment and interaction scripts
  - Test suites

## 🔧 Environment Variables

### Required
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Get from [WalletConnect Cloud](https://cloud.walletconnect.com/)
- `NEXT_PUBLIC_TON_MANIFEST_URL`: URL to your TON Connect manifest

### Optional
- `NEXT_PUBLIC_ALCHEMY_ID`: Alchemy API key for better Ethereum RPC

## 🌐 Networks

### Ethereum
- **Testnet**: Sepolia
- **RPC**: Alchemy (recommended) or public endpoints

### TON
- **Testnet**: TON Testnet
- **Explorer**: [TON Explorer](https://testnet.tonscan.org/)

## 🛠️ Development

### Frontend Development
```bash
cd orbis-frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
```

### Smart Contract Development
```bash
cd tron
npm run build        # Compile contracts
npm test            # Run tests
npm run deploy      # Deploy contracts
```

## 🎨 Design System

The frontend uses a modern dark theme with:
- **Colors**: Purple, cyan, and pink gradients
- **Effects**: Glassmorphism, glows, and subtle animations
- **Typography**: Geist font family
- **Components**: Fully responsive design

## 🔐 Security

- Smart contracts use escrow patterns for secure token custody
- Frontend validates all user inputs
- Testnet-only configuration prevents mainnet accidents
- No private keys stored in frontend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
---

**⚠️ Testnet Only**: This application is currently configured for testnet use only. No real funds are at risk. 