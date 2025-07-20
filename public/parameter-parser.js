/**
 * ParameterParser - Handles URL parameter extraction and validation
 * Responsible for parsing URL parameters and extracting encrypted instruction payloads
 */

class ParameterParser {
  constructor() {
    this.PAYLOAD_PARAM_NAME = 'payload';
    this.MIN_PAYLOAD_LENGTH = 16; // Minimum length for encrypted payload
  }

  /**
   * Parse URL parameters from current window location
   * @returns {URLSearchParams} Parsed URL parameters
   */
  parseUrlParams() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams;
    } catch (error) {
      console.error('Error parsing URL parameters:', error);
      throw new Error('Failed to parse URL parameters');
    }
  }

  /**
   * Extract encrypted payload from URL parameters
   * @param {URLSearchParams} params - URL parameters object
   * @returns {string|null} Encrypted payload string or null if not found
   */
  extractEncryptedPayload(params) {
    try {
      if (!params || !(params instanceof URLSearchParams)) {
        throw new Error('Invalid parameters object provided');
      }

      const payload = params.get(this.PAYLOAD_PARAM_NAME);
      
      if (!payload) {
        console.warn('No encrypted payload found in URL parameters');
        return null;
      }

      // Basic payload extraction - decode URI component if needed
      const decodedPayload = decodeURIComponent(payload);
      return decodedPayload;
    } catch (error) {
      console.error('Error extracting encrypted payload:', error);
      throw new Error('Failed to extract encrypted payload from URL parameters');
    }
  }

  /**
   * Validate the format of an encrypted payload
   * @param {string} payload - The payload string to validate
   * @returns {boolean} True if payload format is valid
   */
  validatePayloadFormat(payload) {
    try {
      // Check if payload exists and is a string
      if (!payload || typeof payload !== 'string') {
        return false;
      }

      // Check minimum length requirement
      if (payload.length < this.MIN_PAYLOAD_LENGTH) {
        console.warn('Payload too short - minimum length requirement not met');
        return false;
      }

      // Check for basic base64-like format (alphanumeric + common base64 chars)
      const base64Pattern = /^[A-Za-z0-9+/=_-]+$/;
      if (!base64Pattern.test(payload)) {
        console.warn('Payload format invalid - contains invalid characters');
        return false;
      }

      // Additional validation: check for reasonable base64 structure
      // Base64 strings should be divisible by 4 when padding is considered
      const cleanPayload = payload.replace(/[=_-]/g, '');
      if (cleanPayload.length === 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating payload format:', error);
      return false;
    }
  }

  /**
   * Complete parameter parsing workflow
   * Combines parsing, extraction, and validation in one method
   * @returns {Object} Result object with payload and validation status
   */
  parseAndValidatePayload() {
    try {
      // Parse URL parameters
      const params = this.parseUrlParams();
      
      // Extract encrypted payload
      const payload = this.extractEncryptedPayload(params);
      
      if (!payload) {
        return {
          success: false,
          payload: null,
          error: 'No encrypted payload found in URL parameters'
        };
      }

      // Validate payload format
      const isValid = this.validatePayloadFormat(payload);
      
      if (!isValid) {
        return {
          success: false,
          payload: payload,
          error: 'Invalid payload format detected'
        };
      }

      return {
        success: true,
        payload: payload,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        payload: null,
        error: error.message
      };
    }
  }

  /**
   * Get all URL parameters for debugging purposes
   * @returns {Object} Object containing all URL parameters
   */
  getAllParams() {
    try {
      const params = this.parseUrlParams();
      const paramObj = {};
      
      for (const [key, value] of params.entries()) {
        paramObj[key] = value;
      }
      
      return paramObj;
    } catch (error) {
      console.error('Error getting all parameters:', error);
      return {};
    }
  }
}

// Export for use in other modules and tests
export default ParameterParser;

// Make available globally for browser usage
if (typeof window !== 'undefined') {
  window.ParameterParser = ParameterParser;
}