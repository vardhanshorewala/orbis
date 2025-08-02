'use client';

import { useState } from 'react';
import { useAccount as useEthAccount } from 'wagmi';
import { useTonWallet } from '@tonconnect/ui-react';

type SwapDirection = 'TON_TO_ETH' | 'ETH_TO_TON';

export function SwapWidget() {
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<SwapDirection>('TON_TO_ETH');
  const [isSwapping, setIsSwapping] = useState(false);

  const { address: ethAddress, isConnected: isEthConnected } = useEthAccount();
  const tonWallet = useTonWallet();

  const isTonConnected = !!tonWallet;

  const handleSwitch = () => {
    setDirection(direction === 'TON_TO_ETH' ? 'ETH_TO_TON' : 'TON_TO_ETH');
  };

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (direction === 'TON_TO_ETH' && !isTonConnected) {
      alert('Please connect your TON wallet');
      return;
    }

    if (direction === 'ETH_TO_TON' && !isEthConnected) {
      alert('Please connect your Ethereum wallet');
      return;
    }

    setIsSwapping(true);
    
    try {
      // TODO: Implement actual swap logic here
      // This would involve:
      // 1. For TON_TO_ETH: Send TON to source escrow contract
      // 2. For ETH_TO_TON: Send ETH to destination escrow contract
      // 3. Wait for confirmations
      // 4. Trigger cross-chain message
      
      alert(`Swap functionality coming soon! You would swap ${amount} ${direction === 'TON_TO_ETH' ? 'TON' : 'ETH'}`);
    } catch (error) {
      console.error('Swap error:', error);
      alert('Swap failed. Please try again.');
    } finally {
      setIsSwapping(false);
    }
  };

  const fromToken = direction === 'TON_TO_ETH' ? 'TON' : 'ETH';
  const toToken = direction === 'TON_TO_ETH' ? 'ETH' : 'TON';
  const fromColor = direction === 'TON_TO_ETH' ? 'cyan' : 'purple';
  const toColor = direction === 'TON_TO_ETH' ? 'purple' : 'cyan';

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/50 p-8 shadow-2xl backdrop-blur-xl">
      {/* Background gradient effects */}
      <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
      
      <h2 className="relative mb-8 text-center text-2xl font-bold text-white">
        Cross-Chain Swap
      </h2>
      
      {/* From Section */}
      <div className="relative mb-6">
        <label className={`mb-3 block text-sm font-semibold text-${fromColor}-400`}>
          From ({fromToken})
        </label>
        <div className="group relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-800/50 transition-all hover:border-gray-600">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full bg-transparent px-6 py-4 pr-20 text-2xl font-semibold text-white placeholder-gray-500 focus:outline-none"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className={`gradient-${fromColor === 'cyan' ? 'accent' : 'primary'} text-gradient text-xl font-bold`}>
              {fromToken}
            </span>
          </div>
        </div>
        {direction === 'TON_TO_ETH' && tonWallet && (
          <p className="mt-2 text-xs text-gray-400">
            Connected: {tonWallet.account.address.slice(0, 8)}...{tonWallet.account.address.slice(-6)}
          </p>
        )}
        {direction === 'ETH_TO_TON' && ethAddress && (
          <p className="mt-2 text-xs text-gray-400">
            Connected: {ethAddress.slice(0, 8)}...{ethAddress.slice(-6)}
          </p>
        )}
      </div>

      {/* Switch Button */}
      <div className="relative z-10 mb-6 flex justify-center">
        <button
          onClick={handleSwitch}
          className="gradient-secondary glow-secondary group rounded-2xl p-4 transition-all hover:scale-110"
        >
          <svg
            className="h-6 w-6 text-white transition-transform group-hover:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* To Section */}
      <div className="relative mb-8">
        <label className={`mb-3 block text-sm font-semibold text-${toColor}-400`}>
          To ({toToken})
        </label>
        <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800/30">
          <input
            type="number"
            value={amount ? (parseFloat(amount) * 1).toFixed(4) : ''}
            readOnly
            placeholder="0.0"
            className="w-full bg-transparent px-6 py-4 pr-20 text-2xl font-semibold text-gray-300"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className={`gradient-${toColor === 'cyan' ? 'accent' : 'primary'} text-gradient text-xl font-bold`}>
              {toToken}
            </span>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <span className="inline-block h-2 w-2 rounded-full bg-green-400"></span>
          1 {fromToken} = 1 {toToken} (Demo rate)
        </p>
      </div>

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={
          isSwapping ||
          !amount ||
          parseFloat(amount) <= 0 ||
          (direction === 'TON_TO_ETH' && !isTonConnected) ||
          (direction === 'ETH_TO_TON' && !isEthConnected)
        }
        className={`
          relative w-full overflow-hidden rounded-2xl py-4 text-lg font-bold transition-all
          ${
            isSwapping ||
            !amount ||
            parseFloat(amount) <= 0 ||
            (direction === 'TON_TO_ETH' && !isTonConnected) ||
            (direction === 'ETH_TO_TON' && !isEthConnected)
              ? 'cursor-not-allowed bg-gray-700 text-gray-400'
              : 'gradient-primary glow-primary text-white hover:scale-[1.02] active:scale-[0.98]'
          }
        `}
      >
        <span className="relative z-10">
          {isSwapping
            ? 'Processing...'
            : !amount || parseFloat(amount) <= 0
            ? 'Enter Amount'
            : direction === 'TON_TO_ETH' && !isTonConnected
            ? 'Connect TON Wallet'
            : direction === 'ETH_TO_TON' && !isEthConnected
            ? 'Connect Ethereum Wallet'
            : `Swap ${fromToken} to ${toToken}`}
        </span>
      </button>

      {/* Info Section */}
      <div className="mt-6 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 backdrop-blur">
        <p className="flex items-center gap-2 text-sm text-purple-300">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong>Testnet Only:</strong> Using Sepolia ETH & TON Testnet
          </span>
        </p>
      </div>
    </div>
  );
} 