/**
 * Unit tests for ParameterParser class
 * Tests URL parameter parsing, payload extraction, and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock window.location for testing
const mockLocation = {
  search: ''
};

// Mock window object
global.window = {
  location: mockLocation
};

// Import the ParameterParser class
const ParameterParser = (await import('./parameter-parser.js')).default || 
  (await import('./parameter-parser.js')).ParameterParser ||
  require('./parameter-parser.js');

describe('ParameterParser', () => {
  let parser;

  beforeEach(() => {
    parser = new ParameterParser();
    // Reset mock location
    mockLocation.search = '';
  });

  describe('parseUrlParams', () => {
    it('should parse empty URL parameters', () => {
      mockLocation.search = '';
      const params = parser.parseUrlParams();
      expect(params).toBeInstanceOf(URLSearchParams);
      expect(params.toString()).toBe('');
    });

    it('should parse single URL parameter', () => {
      mockLocation.search = '?payload=test123';
      const params = parser.parseUrlParams();
      expect(params.get('payload')).toBe('test123');
    });

    it('should parse multiple URL parameters', () => {
      mockLocation.search = '?payload=test123&other=value&third=param';
      const params = parser.parseUrlParams();
      expect(params.get('payload')).toBe('test123');
      expect(params.get('other')).toBe('value');
      expect(params.get('third')).toBe('param');
    });

    it('should handle URL encoded parameters', () => {
      mockLocation.search = '?payload=test%20with%20spaces&special=%21%40%23';
      const params = parser.parseUrlParams();
      expect(params.get('payload')).toBe('test with spaces');
      expect(params.get('special')).toBe('!@#');
    });
  });

  describe('extractEncryptedPayload', () => {
    it('should extract payload when present', () => {
      const params = new URLSearchParams('?payload=encryptedData123');
      const payload = parser.extractEncryptedPayload(params);
      expect(payload).toBe('encryptedData123');
    });

    it('should return null when payload parameter is missing', () => {
      const params = new URLSearchParams('?other=value');
      const payload = parser.extractEncryptedPayload(params);
      expect(payload).toBeNull();
    });

    it('should return null when payload parameter is empty', () => {
      const params = new URLSearchParams('?payload=');
      const payload = parser.extractEncryptedPayload(params);
      expect(payload).toBeNull();
    });

    it('should decode URI components in payload', () => {
      const params = new URLSearchParams();
      params.set('payload', 'test%2Bwith%2Fspecial%3Dchars');
      const payload = parser.extractEncryptedPayload(params);
      expect(payload).toBe('test+with/special=chars');
    });

    it('should throw error for invalid parameters object', () => {
      expect(() => {
        parser.extractEncryptedPayload(null);
      }).toThrow('Failed to extract encrypted payload from URL parameters');

      expect(() => {
        parser.extractEncryptedPayload('not-urlsearchparams');
      }).toThrow('Failed to extract encrypted payload from URL parameters');
    });
  });

  describe('validatePayloadFormat', () => {
    it('should validate correct base64-like payload', () => {
      const validPayloads = [
        'dGVzdERhdGExMjM0NTY3ODkwYWJjZGVm', // Valid base64
        'testData1234567890abcdef', // Valid alphanumeric
        'test+data/with=padding', // Valid with base64 chars
        'test-data_with-url-safe-chars', // Valid with URL-safe chars
      ];

      validPayloads.forEach(payload => {
        expect(parser.validatePayloadFormat(payload)).toBe(true);
      });
    });

    it('should reject payload that is too short', () => {
      const shortPayloads = [
        'short',
        'a',
        '123456789012345', // 15 chars, below minimum of 16
      ];

      shortPayloads.forEach(payload => {
        expect(parser.validatePayloadFormat(payload)).toBe(false);
      });
    });

    it('should reject payload with invalid characters', () => {
      const invalidPayloads = [
        'payload with spaces',
        'payload@with#special$chars',
        'payload\nwith\nnewlines',
        'payload\twith\ttabs',
        'payload<with>html<tags>',
      ];

      invalidPayloads.forEach(payload => {
        expect(parser.validatePayloadFormat(payload)).toBe(false);
      });
    });

    it('should reject null, undefined, or non-string payloads', () => {
      const invalidInputs = [
        null,
        undefined,
        123,
        {},
        [],
        true,
        false,
      ];

      invalidInputs.forEach(input => {
        expect(parser.validatePayloadFormat(input)).toBe(false);
      });
    });

    it('should reject empty or whitespace-only payloads', () => {
      const emptyPayloads = [
        '',
        '   ',
        '\t\n',
        '====', // Only padding chars
        '----', // Only URL-safe chars
        '____', // Only URL-safe chars
      ];

      emptyPayloads.forEach(payload => {
        expect(parser.validatePayloadFormat(payload)).toBe(false);
      });
    });
  });

  describe('parseAndValidatePayload', () => {
    it('should return success with valid payload', () => {
      mockLocation.search = '?payload=dGVzdERhdGExMjM0NTY3ODkwYWJjZGVm';
      const result = parser.parseAndValidatePayload();
      
      expect(result.success).toBe(true);
      expect(result.payload).toBe('dGVzdERhdGExMjM0NTY3ODkwYWJjZGVm');
      expect(result.error).toBeNull();
    });

    it('should return failure when no payload parameter exists', () => {
      mockLocation.search = '?other=value';
      const result = parser.parseAndValidatePayload();
      
      expect(result.success).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe('No encrypted payload found in URL parameters');
    });

    it('should return failure when payload format is invalid', () => {
      mockLocation.search = '?payload=invalid payload with spaces';
      const result = parser.parseAndValidatePayload();
      
      expect(result.success).toBe(false);
      expect(result.payload).toBe('invalid payload with spaces');
      expect(result.error).toBe('Invalid payload format detected');
    });

    it('should return failure when payload is too short', () => {
      mockLocation.search = '?payload=short';
      const result = parser.parseAndValidatePayload();
      
      expect(result.success).toBe(false);
      expect(result.payload).toBe('short');
      expect(result.error).toBe('Invalid payload format detected');
    });

    it('should handle URL encoded payloads correctly', () => {
      mockLocation.search = '?payload=dGVzdERhdGExMjM0NTY3ODkwYWJjZGVm%2B%2F%3D';
      const result = parser.parseAndValidatePayload();
      
      expect(result.success).toBe(true);
      expect(result.payload).toBe('dGVzdERhdGExMjM0NTY3ODkwYWJjZGVm+/=');
      expect(result.error).toBeNull();
    });
  });

  describe('getAllParams', () => {
    it('should return empty object for no parameters', () => {
      mockLocation.search = '';
      const params = parser.getAllParams();
      expect(params).toEqual({});
    });

    it('should return all parameters as object', () => {
      mockLocation.search = '?payload=test123&other=value&third=param';
      const params = parser.getAllParams();
      
      expect(params).toEqual({
        payload: 'test123',
        other: 'value',
        third: 'param'
      });
    });

    it('should handle duplicate parameter names', () => {
      mockLocation.search = '?param=first&param=second';
      const params = parser.getAllParams();
      
      // When converting to object, the last value overwrites previous ones
      expect(params.param).toBe('second');
    });

    it('should decode URL encoded parameter values', () => {
      mockLocation.search = '?encoded=hello%20world&special=%21%40%23';
      const params = parser.getAllParams();
      
      expect(params).toEqual({
        encoded: 'hello world',
        special: '!@#'
      });
    });
  });

  describe('Error handling', () => {
    it('should handle malformed URL gracefully', () => {
      // Mock a scenario where URLSearchParams might throw
      const originalURLSearchParams = global.URLSearchParams;
      global.URLSearchParams = vi.fn(() => {
        throw new Error('Malformed URL');
      });

      expect(() => {
        parser.parseUrlParams();
      }).toThrow('Failed to parse URL parameters');

      // Restore original
      global.URLSearchParams = originalURLSearchParams;
    });

    it('should handle validation errors gracefully', () => {
      // Test with a payload that might cause validation to throw
      const result = parser.validatePayloadFormat(null);
      expect(result).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle real-world base64 encoded payload', () => {
      // Simulate a real encrypted payload scenario
      const realPayload = 'eyJpbWFnZV91cmwiOiJodHRwczovL2V4YW1wbGUuY29tL2ltYWdlLmpwZyIsImNsaWNrX3VybCI6Imh0dHBzOi8vZXhhbXBsZS5jb20ifQ==';
      mockLocation.search = `?payload=${encodeURIComponent(realPayload)}`;
      
      const result = parser.parseAndValidatePayload();
      
      expect(result.success).toBe(true);
      expect(result.payload).toBe(realPayload);
      expect(result.error).toBeNull();
    });

    it('should handle multiple parameters with payload', () => {
      mockLocation.search = '?utm_source=test&payload=dGVzdERhdGExMjM0NTY3ODkwYWJjZGVm&utm_campaign=demo';
      
      const result = parser.parseAndValidatePayload();
      const allParams = parser.getAllParams();
      
      expect(result.success).toBe(true);
      expect(allParams.utm_source).toBe('test');
      expect(allParams.utm_campaign).toBe('demo');
      expect(allParams.payload).toBe('dGVzdERhdGExMjM0NTY3ODkwYWJjZGVm');
    });
  });
});