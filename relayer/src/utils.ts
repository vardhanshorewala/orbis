import { createHash, randomBytes } from 'crypto';
import { SecretData } from './types';

/**
 * Simple utilities for TON Fusion+ relayer
 */

export class SecretManager {
    /**
     * Generate a new secret and its hash
     */
    static generateSecret(): SecretData {
        const secret = randomBytes(32).toString('hex');
        const hash = this.hashSecret(secret);

        return {
            secret,
            hash
        };
    }

    /**
     * Hash a secret using SHA-256 (compatible with TON contracts)
     */
    static hashSecret(secret: string): string {
        return createHash('sha256')
            .update(Buffer.from(secret, 'hex'))
            .digest('hex');
    }

    /**
     * Verify secret against hash
     */
    static verifySecret(secret: string, expectedHash: string): boolean {
        const computedHash = this.hashSecret(secret);
        return computedHash === expectedHash;
    }
}

export class TimelockManager {
    /**
     * Calculate timelock for source chain (longer timeout)
     */
    static getSourceTimelock(baseTimeout: number = 3600): number {
        return Math.floor(Date.now() / 1000) + baseTimeout; // 1 hour
    }

    /**
     * Calculate timelock for destination chain (shorter timeout)
     */
    static getDestinationTimelock(baseTimeout: number = 1800): number {
        return Math.floor(Date.now() / 1000) + baseTimeout; // 30 minutes
    }

    /**
     * Check if timelock has expired
     */
    static isExpired(timelock: number): boolean {
        return Math.floor(Date.now() / 1000) >= timelock;
    }

    /**
     * Get remaining time until timelock expires
     */
    static getTimeRemaining(timelock: number): number {
        const now = Math.floor(Date.now() / 1000);
        return Math.max(0, timelock - now);
    }
}

export class Logger {
    private static levels = ['error', 'warn', 'info', 'debug'];
    private static currentLevel = process.env.LOG_LEVEL || 'info';

    static shouldLog(level: string): boolean {
        const currentIndex = this.levels.indexOf(this.currentLevel);
        const messageIndex = this.levels.indexOf(level);
        return messageIndex <= currentIndex;
    }

    static log(level: string, message: string, meta?: any): void {
        if (!this.shouldLog(level)) return;

        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

        console.log(logLine);
        if (meta) {
            console.log('  Meta:', JSON.stringify(meta, null, 2));
        }
    }

    static error(message: string, meta?: any): void {
        this.log('error', message, meta);
    }

    static warn(message: string, meta?: any): void {
        this.log('warn', message, meta);
    }

    static info(message: string, meta?: any): void {
        this.log('info', message, meta);
    }

    static debug(message: string, meta?: any): void {
        this.log('debug', message, meta);
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateOrderId(): string {
    return `order_${Date.now()}_${randomBytes(4).toString('hex')}`;
}