'use client';

import { useState } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address, toNano, beginCell } from '@ton/core';

// Correct opcodes from your escrow contracts
const SourceOpcodes = {
  CREATE_ESCROW: 0x1,
  WITHDRAW: 0x2,
  REFUND: 0x3,
  LOCK_ESCROW: 0x5,  // ✅ Fixed!
};

const DestOpcodes = {
  CREATE_ESCROW: 0x1,
  WITHDRAW: 0x2,
  REFUND: 0x3,
  LOCK_ESCROW: 0x5,  // ✅ Fixed!
};

export function EscrowInteraction() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [contractAddress, setContractAddress] = useState('');
  const [secret, setSecret] = useState('');
  const [contractType, setContractType] = useState<'source' | 'destination'>('source');
  const [loading, setLoading] = useState(false);

  const sendTransaction = async (body: any, value: string = '0.05') => {
    if (!wallet) {
      alert('Please connect your TON wallet first');
      return;
    }

    if (!contractAddress) {
      alert('Please enter contract address');
      return;
    }

    setLoading(true);
    try {
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60, // 60 seconds from now
        messages: [
          {
            address: contractAddress,
            amount: toNano(value).toString(),
            payload: body.toBoc().toString('base64'),
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);
      console.log('Transaction sent:', result);
      alert('Transaction sent successfully!');
    } catch (error) {
      console.error('Transaction failed:', error);
      alert(`Transaction failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    const opcodes = contractType === 'source' ? SourceOpcodes : DestOpcodes;
    const body = beginCell()
      .storeUint(opcodes.LOCK_ESCROW, 32)
      .storeUint(0, 64) // query_id
      .endCell();
    
    await sendTransaction(body);
  };

  const handleWithdraw = async () => {
    if (!secret) {
      alert('Please enter secret');
      return;
    }

    const opcodes = contractType === 'source' ? SourceOpcodes : DestOpcodes;
    
    // Convert text secret to hex string representing first 4 bytes
    const secretBuffer = Buffer.from(secret);
    const secretHex = secretBuffer.slice(0, 4).toString('hex').padEnd(8, '0');
    const secretInt = parseInt(secretHex, 16);
    
    const secretCell = beginCell()
      .storeUint(secretInt, 32)
      .endCell();
    
    const body = beginCell()
      .storeUint(opcodes.WITHDRAW, 32)
      .storeUint(0, 64) // query_id
      .storeRef(secretCell)
      .endCell();
    
    await sendTransaction(body);
  };

  const handleRefund = async () => {
    const opcodes = contractType === 'source' ? SourceOpcodes : DestOpcodes;
    const body = beginCell()
      .storeUint(opcodes.REFUND, 32)
      .storeUint(0, 64) // query_id
      .endCell();
    
    await sendTransaction(body);
  };

  if (!wallet) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur">
        <h3 className="mb-4 text-xl font-bold text-white">Escrow Contract Interaction</h3>
        <p className="text-gray-400">Please connect your TON wallet to interact with escrow contracts.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur">
      <h3 className="mb-6 text-xl font-bold text-white">Escrow Contract Interaction</h3>
      
      <div className="space-y-4">
        {/* Wallet Info */}
        <div className="rounded-lg bg-gray-800/50 p-4">
          <p className="text-sm text-gray-400">Connected Wallet:</p>
          <p className="font-mono text-sm text-white">{wallet.account.address}</p>
        </div>

        {/* Contract Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Contract Type</label>
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value as 'source' | 'destination')}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="source">Source Escrow</option>
            <option value="destination">Destination Escrow</option>
          </select>
        </div>

        {/* Contract Address */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Contract Address</label>
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="EQC..."
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Secret (for withdraw) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Secret (for withdraw)</label>
          <input
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter secret for withdraw operation"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleLock}
            disabled={loading || !contractAddress}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'Lock'}
          </button>
          
          <button
            onClick={handleWithdraw}
            disabled={loading || !contractAddress || !secret}
            className="rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'Withdraw'}
          </button>
          
          <button
            onClick={handleRefund}
            disabled={loading || !contractAddress}
            className="rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'Refund'}
          </button>
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Lock: Locks the escrow contract</p>
          <p>• Withdraw: Withdraws funds using the secret</p>
          <p>• Refund: Refunds the escrow after timelock</p>
          <p>• Each transaction costs ~0.05 TON in gas fees</p>
        </div>
      </div>
    </div>
  );
} 