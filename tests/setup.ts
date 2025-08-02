/**
 * Jest test setup file for TON Fusion+ SDK
 */

// Extend Jest matchers if needed
// import { expect } from '@jest/globals';

// Global test configuration
global.console = {
  ...console,
  // Suppress logs during testing unless DEBUG is set
  log: process.env.DEBUG ? console.log : jest.fn(),
  debug: process.env.DEBUG ? console.debug : jest.fn(),
  info: process.env.DEBUG ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Set test timeout
jest.setTimeout(30000);

// Mock crypto.getRandomValues for consistent testing
const mockGetRandomValues = (array: Uint8Array): Uint8Array => {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
};

// Mock global crypto if not available
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: mockGetRandomValues,
  } as Crypto;
}

// Setup TON testnet configuration for tests
process.env.TON_NETWORK = 'testnet';
process.env.TON_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC'; 