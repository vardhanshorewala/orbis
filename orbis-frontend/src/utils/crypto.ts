import { beginCell } from '@ton/core';
import type { SecretData } from '../types/relayer';

/**
 * Generate a random secret and its hash (similar to TonAdapter.generateSecret)
 * This matches the logic used in the relayer's TonAdapter
 */
export function generateSecret(): SecretData {
    // Generate random 32-bit number for secret
    const secretNumber = Math.floor(Math.random() * 0xFFFFFFFF);
    const secret = '0x' + secretNumber.toString(16).padStart(8, '0');
    
    try {
        // Create cell with the secret (same as relayer logic)
        const secretCell = beginCell()
            .storeUint(secretNumber, 32)
            .endCell();
        
        // Get cell hash and take first 32 bits (like contract does)
        const cellHashBuffer = secretCell.hash();
        const cellHashBigInt = BigInt('0x' + cellHashBuffer.toString('hex'));
        const hash32bit = Number(cellHashBigInt >> 224n); // Take first 32 bits
        const hash = hash32bit.toString(16).padStart(8, '0');
        
        return {
            secret,
            hash,
            generatedAt: Date.now()
        };
    } catch (error) {
        console.error('Error generating secret:', error);
        throw new Error('Failed to generate secret');
    }
}

/**
 * Verify that a secret matches a given hash
 */
export function verifySecret(secret: string, expectedHash: string): boolean {
    try {
        const secretNumber = parseInt(secret.replace('0x', ''), 16);
        
        const secretCell = beginCell()
            .storeUint(secretNumber, 32)
            .endCell();
        
        const cellHashBuffer = secretCell.hash();
        const cellHashBigInt = BigInt('0x' + cellHashBuffer.toString('hex'));
        const hash32bit = Number(cellHashBigInt >> 224n);
        const computedHash = hash32bit.toString(16).padStart(8, '0');
        
        return computedHash === expectedHash;
    } catch (error) {
        console.error('Error verifying secret:', error);
        return false;
    }
}

/**
 * Convert amount from user input to smallest units
 */
export function toSmallestUnits(amount: string, decimals: number = 9): string {
    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error('Invalid amount');
    }
    
    // Convert to smallest units (e.g., nanotons for TON)
    const smallestUnits = Math.floor(amountFloat * Math.pow(10, decimals));
    return smallestUnits.toString();
}

/**
 * Convert amount from smallest units to user-friendly display
 */
export function fromSmallestUnits(amount: string, decimals: number = 9): string {
    const amountBigInt = BigInt(amount);
    const divisor = BigInt(Math.pow(10, decimals));
    
    const wholePart = amountBigInt / divisor;
    const fractionalPart = amountBigInt % divisor;
    
    if (fractionalPart === 0n) {
        return wholePart.toString();
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    return `${wholePart}.${trimmedFractional}`;
} 