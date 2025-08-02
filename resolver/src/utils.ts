import crypto from 'crypto';
import winston from 'winston';

/**
 * Logger utility
 */
export const Logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ filename: 'resolver.log' })
    ],
});

/**
 * Secret management for atomic swaps
 */
export class SecretManager {
    /**
     * Generate a random secret for HTLC
     */
    generateSecret(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Hash secret using SHA-256
     */
    hashSecret(secret: string): string {
        return crypto.createHash('sha256').update(secret, 'hex').digest('hex');
    }

    /**
     * Verify secret matches hash
     */
    verifySecret(secret: string, hash: string): boolean {
        return this.hashSecret(secret) === hash;
    }
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate timelock expiry
 */
export function calculateTimelock(durationMinutes: number): number {
    return Math.floor(Date.now() / 1000) + (durationMinutes * 60);
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
    if (address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Parse amount string to BigInt
 */
export function parseAmount(amount: string): bigint {
    return BigInt(amount);
}

/**
 * Format amount for display
 */
export function formatAmount(amount: string | bigint, decimals: number = 18): string {
    const value = typeof amount === 'string' ? BigInt(amount) : amount;
    const divisor = BigInt(10 ** decimals);
    const quotient = value / divisor;
    const remainder = value % divisor;

    if (remainder === 0n) {
        return quotient.toString();
    }

    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderStr.replace(/0+$/, '');

    if (trimmedRemainder === '') {
        return quotient.toString();
    }

    return `${quotient}.${trimmedRemainder}`;
}

/**
 * Validate Ethereum address
 */
export function isValidEthAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate TON address
 */
export function isValidTonAddress(address: string): boolean {
    return /^EQ[A-Za-z0-9_-]{46}$/.test(address);
}

/**
 * Retry mechanism for async operations
 */
export async function retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');

            if (i === maxRetries) {
                throw lastError;
            }

            Logger.warn(`Operation failed, retrying in ${delayMs}ms`, {
                attempt: i + 1,
                maxRetries: maxRetries + 1,
                error: lastError.message
            });

            await sleep(delayMs);
        }
    }

    throw lastError!;
}