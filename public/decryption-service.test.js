/**
 * Unit tests for DecryptionService
 * Tests encryption/decryption functionality, validation, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock crypto.subtle for testing environment
const mockCrypto = {
  subtle: {
    importKey: vi.fn(),
    decrypt: vi.fn()
  }
};

// Setup global mocks
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Import the DecryptionService
const DecryptionService = await import('./decryption-service.js').then(m => m.default || m.DecryptionService);

describe('DecryptionService', () => {
  let decryptionService;

  beforeEach(() => {
    decryptionService = new DecryptionService();
    vi.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default encryption key', () => {
      expect(decryptionService.encryptionKey).toBe('default-encryption-key-32-chars!!');
      expect(decryptionService.ALGORITHM).toBe('AES-GCM');
      expect(decryptionService.KEY_LENGTH).toBe(256);
    });

    it('should allow setting custom encryption key', () => {
      const customKey = 'my-custom-key-for-testing-123456';
      decryptionService.setEncryptionKey(customKey);
      expect(decryptionService.encryptionKey).toBe(customKey);
    });

    it('should throw error for invalid encryption key', () => {
      expect(() => decryptionService.setEncryptionKey(null)).toThrow('Invalid encryption key provided');
      expect(() => decryptionService.setEncryptionKey('')).toThrow('Invalid encryption key provided');
      expect(() => decryptionService.setEncryptionKey(123)).toThrow('Invalid encryption key provided');
    });
  });

  describe('validateDecryptionKey', () => {
    it('should validate default key as valid', () => {
      expect(decryptionService.validateDecryptionKey()).toBe(true);
    });

    it('should validate custom valid key', () => {
      decryptionService.setEncryptionKey('valid-key-with-sufficient-length');
      expect(decryptionService.validateDecryptionKey()).toBe(true);
    });

    it('should reject short keys', () => {
      decryptionService.setEncryptionKey('short');
      expect(decryptionService.validateDecryptionKey()).toBe(false);
    });

    it('should reject null or undefined keys', () => {
      decryptionService.encryptionKey = null;
      expect(decryptionService.validateDecryptionKey()).toBe(false);
      
      decryptionService.encryptionKey = undefined;
      expect(decryptionService.validateDecryptionKey()).toBe(false);
    });
  });

  describe('importKey', () => {
    it('should import key successfully', async () => {
      const mockCryptoKey = { type: 'secret' };
      mockCrypto.subtle.importKey.mockResolvedValue(mockCryptoKey);

      const result = await decryptionService.importKey('test-key-string');
      
      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      expect(result).toBe(mockCryptoKey);
    });

    it('should handle key import errors', async () => {
      mockCrypto.subtle.importKey.mockRejectedValue(new Error('Import failed'));

      await expect(decryptionService.importKey('test-key'))
        .rejects.toThrow('Failed to import encryption key: Import failed');
    });
  });

  describe('base64ToArrayBuffer', () => {
    it('should convert base64 to ArrayBuffer', () => {
      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
      const result = decryptionService.base64ToArrayBuffer(base64);
      
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(11); // "Hello World" is 11 bytes
    });

    it('should handle URL-safe base64', () => {
      const urlSafeBase64 = 'SGVsbG8gV29ybGQ_'; // URL-safe variant
      const result = decryptionService.base64ToArrayBuffer(urlSafeBase64);
      
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should throw error for invalid base64', () => {
      // Mock atob to throw an error for testing
      const originalAtob = global.atob;
      global.atob = vi.fn(() => {
        throw new Error('Invalid character');
      });

      expect(() => decryptionService.base64ToArrayBuffer('invalid-base64'))
        .toThrow('Failed to decode base64 payload');

      // Restore original atob
      global.atob = originalAtob;
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(decryptionService.isValidUrl('https://example.com')).toBe(true);
      expect(decryptionService.isValidUrl('http://localhost:3000')).toBe(true);
      expect(decryptionService.isValidUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(decryptionService.isValidUrl('not-a-url')).toBe(false);
      expect(decryptionService.isValidUrl('')).toBe(false);
      expect(decryptionService.isValidUrl('ftp://invalid')).toBe(true); // FTP is valid URL
      expect(decryptionService.isValidUrl('javascript:alert(1)')).toBe(true); // Valid URL but dangerous
    });
  });

  describe('validateInstructionSet', () => {
    it('should validate complete valid instruction set', () => {
      const validData = {
        image_url: 'https://example.com/image.jpg',
        click_url: 'https://example.com/click',
        deeplink_url: 'myapp://open',
        auto_click: true,
        deeplink_priority: false,
        auto_click_delay: 1000
      };

      const result = decryptionService.validateInstructionSet(validData);
      
      expect(result).toEqual({
        image_url: 'https://example.com/image.jpg',
        click_url: 'https://example.com/click',
        deeplink_url: 'myapp://open',
        auto_click: true,
        deeplink_priority: false,
        auto_click_delay: 1000
      });
    });

    it('should validate minimal valid instruction set', () => {
      const minimalData = {
        image_url: 'https://example.com/image.jpg'
      };

      const result = decryptionService.validateInstructionSet(minimalData);
      
      expect(result).toEqual({
        image_url: 'https://example.com/image.jpg',
        click_url: null,
        deeplink_url: null,
        auto_click: false,
        deeplink_priority: false,
        auto_click_delay: null
      });
    });

    it('should throw error for missing image_url', () => {
      const invalidData = {
        click_url: 'https://example.com/click'
      };

      expect(() => decryptionService.validateInstructionSet(invalidData))
        .toThrow('Invalid instruction set - image_url is required and must be a string');
    });

    it('should throw error for invalid image_url', () => {
      const invalidData = {
        image_url: 'not-a-valid-url'
      };

      expect(() => decryptionService.validateInstructionSet(invalidData))
        .toThrow('Invalid instruction set - image_url must be a valid URL');
    });

    it('should throw error for invalid click_url', () => {
      const invalidData = {
        image_url: 'https://example.com/image.jpg',
        click_url: 'invalid-url'
      };

      expect(() => decryptionService.validateInstructionSet(invalidData))
        .toThrow('Invalid instruction set - click_url must be a valid URL');
    });

    it('should throw error for invalid auto_click_delay', () => {
      const invalidData = {
        image_url: 'https://example.com/image.jpg',
        auto_click_delay: -100
      };

      expect(() => decryptionService.validateInstructionSet(invalidData))
        .toThrow('Invalid instruction set - auto_click_delay must be a non-negative number');
    });

    it('should handle boolean conversion for flags', () => {
      const data = {
        image_url: 'https://example.com/image.jpg',
        auto_click: 'true', // String that should be converted
        deeplink_priority: 1 // Number that should be converted
      };

      const result = decryptionService.validateInstructionSet(data);
      
      expect(result.auto_click).toBe(true);
      expect(result.deeplink_priority).toBe(true);
    });
  });

  describe('parseInstructionSet', () => {
    it('should parse valid JSON instruction set', () => {
      const jsonString = JSON.stringify({
        image_url: 'https://example.com/image.jpg',
        auto_click: true
      });

      const result = decryptionService.parseInstructionSet(jsonString);
      
      expect(result.image_url).toBe('https://example.com/image.jpg');
      expect(result.auto_click).toBe(true);
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = '{ invalid json }';

      expect(() => decryptionService.parseInstructionSet(invalidJson))
        .toThrow('Invalid JSON format in decrypted payload');
    });
  });

  describe('decrypt', () => {
    it('should throw error for invalid payload', async () => {
      await expect(decryptionService.decrypt(null))
        .rejects.toThrow('Invalid encrypted payload provided');
      
      await expect(decryptionService.decrypt(''))
        .rejects.toThrow('Invalid encrypted payload provided');
    });

    it('should throw error for invalid decryption key', async () => {
      decryptionService.encryptionKey = 'short';
      
      await expect(decryptionService.decrypt('valid-base64-payload'))
        .rejects.toThrow('Failed to process encrypted payload');
    });

    it('should throw error for payload too short', async () => {
      const shortPayload = 'dGVzdA=='; // "test" in base64 - too short
      
      await expect(decryptionService.decrypt(shortPayload))
        .rejects.toThrow('Encrypted payload too short - possibly corrupted');
    });

    it('should handle successful decryption', async () => {
      // Mock successful decryption
      const mockCryptoKey = { type: 'secret' };
      const mockDecryptedData = JSON.stringify({
        image_url: 'https://example.com/image.jpg',
        auto_click: false
      });
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockCryptoKey);
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(mockDecryptedData)
      );

      // Create a payload that's long enough (mock encrypted data)
      const longPayload = 'SGVsbG8gV29ybGQgdGhpcyBpcyBhIGxvbmcgZW5vdWdoIHBheWxvYWQgZm9yIHRlc3Rpbmc=';
      
      const result = await decryptionService.decrypt(longPayload);
      
      expect(result.image_url).toBe('https://example.com/image.jpg');
      expect(result.auto_click).toBe(false);
    });
  });

  describe('handleDecryptionError', () => {
    it('should log error details', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('Test normal error');

      try {
        decryptionService.handleDecryptionError(testError);
      } catch (e) {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Decryption error occurred:',
        expect.objectContaining({
          message: 'Test normal error',
          type: 'Error',
          timestamp: expect.any(String)
        })
      );

      consoleSpy.mockRestore();
    });

    it('should throw secure error for sensitive errors', () => {
      const sensitiveError = new Error('Failed to decrypt with key');

      expect(() => decryptionService.handleDecryptionError(sensitiveError))
        .toThrow('Failed to process encrypted payload');
    });

    it('should re-throw non-sensitive errors', () => {
      const normalError = new Error('Invalid JSON format');

      expect(() => decryptionService.handleDecryptionError(normalError))
        .toThrow('Invalid JSON format');
    });
  });
});