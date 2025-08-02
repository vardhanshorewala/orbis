/**
 * Basic tests for TON Fusion+ Escrow functionality
 */

import { 
  SecretManager, 
  AssetType, 
  EscrowStatus,
  PROTOCOL_CONSTANTS,
  utils 
} from '../src/index';

describe('TON Fusion+ Escrow SDK', () => {
  describe('SecretManager', () => {
    test('should generate a random secret', () => {
      const secret1 = SecretManager.generateSecret();
      const secret2 = SecretManager.generateSecret();
      
      expect(secret1).toBeDefined();
      expect(secret2).toBeDefined();
      expect(secret1).not.toBe(secret2);
      expect(secret1.length).toBe(64); // 32 bytes * 2 hex chars
    });

    test('should hash a secret consistently', () => {
      const secret = 'test_secret_123';
      const hash1 = SecretManager.hashSecret(secret);
      const hash2 = SecretManager.hashSecret(secret);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeDefined();
      expect(typeof hash1).toBe('string');
    });

    test('should generate different hashes for different secrets', () => {
      const secret1 = 'secret1';
      const secret2 = 'secret2';
      
      const hash1 = SecretManager.hashSecret(secret1);
      const hash2 = SecretManager.hashSecret(secret2);
      
      // Note: Current implementation uses crypto-js fallback
      expect(hash1).not.toBe(hash2);
    });

    test('should generate Merkle tree for partial fills', () => {
      const secrets = ['secret1', 'secret2', 'secret3', 'secret4'];
      const merkleTree = SecretManager.generateMerkleTree(secrets);
      
      expect(merkleTree.root).toBeDefined();
      expect(merkleTree.leaves).toHaveLength(4);
      expect(merkleTree.tree).toBeDefined();
      expect(merkleTree.tree.length).toBeGreaterThan(1);
    });

    test('should generate Merkle proof for specific secret', () => {
      const secrets = ['secret1', 'secret2', 'secret3', 'secret4'];
      const merkleTree = SecretManager.generateMerkleTree(secrets);
      const proof = SecretManager.generateMerkleProof(merkleTree, 0);
      
      expect(proof.siblings).toBeDefined();
      expect(proof.directions).toBeDefined();
      expect(proof.siblings.length).toBe(proof.directions.length);
    });
  });

  describe('Utils', () => {
    test('should convert TON to nanotons correctly', () => {
      expect(utils.toNano('1')).toBe(1000000000n);
      expect(utils.toNano('0.1')).toBe(100000000n);
      expect(utils.toNano('10.5')).toBe(10500000000n);
    });

    test('should convert nanotons to TON correctly', () => {
      expect(utils.fromNano(1000000000n)).toBe('1');
      expect(utils.fromNano(100000000n)).toBe('0.1');
      expect(utils.fromNano(10500000000n)).toBe('10.5');
    });

    test('should validate TON addresses', () => {
      const validAddress1 = '0:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const validAddress2 = 'test-domain'; // DNS-style names
      const invalidAddress = 'invalid.address.format';
      
      expect(utils.isValidTONAddress(validAddress1)).toBe(true);
      expect(utils.isValidTONAddress(validAddress2)).toBe(true);
      expect(utils.isValidTONAddress(invalidAddress)).toBe(false);
    });

    test('should format duration correctly', () => {
      expect(utils.formatDuration(3661)).toBe('1h 1m 1s');
      expect(utils.formatDuration(61)).toBe('1m 1s');
      expect(utils.formatDuration(30)).toBe('30s');
    });

    test('should generate random secrets', () => {
      const secret1 = utils.generateSecret();
      const secret2 = utils.generateSecret();
      
      expect(secret1).toBeDefined();
      expect(secret2).toBeDefined();
      expect(secret1).not.toBe(secret2);
      expect(secret1.length).toBe(64);
    });
  });

  describe('Protocol Constants', () => {
    test('should have defined protocol constants', () => {
      expect(PROTOCOL_CONSTANTS.DEFAULT_TIMELOCK_DURATION).toBe(3600);
      expect(PROTOCOL_CONSTANTS.DEFAULT_FINALITY_TIMELOCK).toBe(600);
      expect(PROTOCOL_CONSTANTS.DEFAULT_EXCLUSIVE_PERIOD).toBe(1800);
      expect(PROTOCOL_CONSTANTS.MIN_SAFETY_DEPOSIT).toBe(100000000n);
      expect(PROTOCOL_CONSTANTS.DEFAULT_GAS_AMOUNT).toBe(100000000n);
    });
  });

  describe('Enums', () => {
    test('should have correct asset types', () => {
      expect(AssetType.TON).toBe(0);
      expect(AssetType.JETTON).toBe(1);
    });

    test('should have correct escrow statuses', () => {
      expect(EscrowStatus.CREATED).toBe(1);
      expect(EscrowStatus.LOCKED).toBe(2);
      expect(EscrowStatus.WITHDRAWN).toBe(3);
      expect(EscrowStatus.REFUNDED).toBe(4);
      expect(EscrowStatus.EXPIRED).toBe(5);
    });
  });
}); 