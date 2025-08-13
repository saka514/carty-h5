/**
 * DecryptionService - Handles secure decryption of instruction payloads
 * Responsible for decrypting encrypted instruction sets and validating the resulting data
 */

class DecryptionService {
  constructor() {
    // Use environment configuration from window.ENV_CONFIG if available
    const envConfig = window.ENV_CONFIG || {};
    const decryptionConfig = envConfig.decryption || {};
    
    this.encryptionKey = decryptionConfig.encryptionKey || 'default-encryption-key-32-chars!!';
    this.ALGORITHM = decryptionConfig.ALGORITHM || 'AES-GCM';
    this.KEY_LENGTH = decryptionConfig.KEY_LENGTH || 256;
    this.IV_LENGTH = decryptionConfig.IV_LENGTH || 12;
    this.TAG_LENGTH = decryptionConfig.TAG_LENGTH || 16;
  }

  /**
   * Set the encryption key for decryption operations
   * @param {string} key - The encryption key to use
   */
  setEncryptionKey(key) {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid encryption key provided');
    }
    this.encryptionKey = key;
  }

  /**
   * Validate that the decryption key is properly configured
   * @returns {boolean} True if key is valid
   */
  validateDecryptionKey() {
    try {
      return !!(this.encryptionKey && 
               typeof this.encryptionKey === 'string' && 
               this.encryptionKey.length >= 16);
    } catch (error) {
      console.error('Error validating decryption key:', error);
      return false;
    }
  }

  /**
   * Convert a string key to a CryptoKey for Web Crypto API
   * @param {string} keyString - The key string to convert
   * @returns {Promise<CryptoKey>} The imported crypto key
   */
  async importKey(keyString) {
    try {
      // Pad or truncate key to 32 bytes for AES-256
      const keyBytes = new TextEncoder().encode(keyString.padEnd(32, '0').substring(0, 32));
      
      return await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: this.ALGORITHM },
        false,
        ['decrypt']
      );
    } catch (error) {
      throw new Error(`Failed to import encryption key: ${error.message}`);
    }
  }

  /**
   * Decrypt an encrypted payload using AES-GCM with enhanced error handling
   * @param {string} encryptedPayload - Base64 encoded encrypted data
   * @returns {Promise<InstructionSet>} Decrypted and validated instruction set
   */
  async decrypt(encryptedPayload) {
    try {
      if (!encryptedPayload || typeof encryptedPayload !== 'string') {
        throw new Error('Invalid encrypted payload provided');
      }

      // Validate decryption key
      if (!this.validateDecryptionKey()) {
        throw new Error('Invalid or missing decryption key');
      }

      // Log payload length for debugging
      console.log(`DecryptionService: Processing payload of length ${encryptedPayload.length}`);
      
      try {
        // Decode base64 payload
        const encryptedData = this.base64ToArrayBuffer(encryptedPayload);
        
        if (encryptedData.byteLength < this.IV_LENGTH + this.TAG_LENGTH + 1) {
          throw new Error('Encrypted payload too short - possibly corrupted');
        }

        // Extract IV, encrypted data, and auth tag
        const iv = encryptedData.slice(0, this.IV_LENGTH);
        const ciphertext = encryptedData.slice(this.IV_LENGTH);

        // Import the key
        const cryptoKey = await this.importKey(this.encryptionKey);

        // Decrypt the data
        const decryptedBuffer = await crypto.subtle.decrypt(
          {
            name: this.ALGORITHM,
            iv: iv
          },
          cryptoKey,
          ciphertext
        );

        // Convert decrypted buffer to string
        const decryptedText = new TextDecoder().decode(decryptedBuffer);

        // Parse and validate the instruction set
        const instructionSet = this.parseInstructionSet(decryptedText);
        
        return instructionSet;
      } catch (decryptionError) {
        // Try with fixed payload format if initial attempt fails
        console.warn('DecryptionService: Initial decryption failed, attempting with fixed format');
        
        // Fix common payload format issues
        const fixedPayload = this.fixPayloadFormat(encryptedPayload);
        
        if (fixedPayload !== encryptedPayload) {
          console.log('DecryptionService: Attempting with fixed payload format');
          
          // Decode fixed base64 payload
          const encryptedData = this.base64ToArrayBuffer(fixedPayload);
          
          if (encryptedData.byteLength < this.IV_LENGTH + this.TAG_LENGTH + 1) {
            throw new Error('Encrypted payload too short - possibly corrupted');
          }

          // Extract IV, encrypted data, and auth tag
          const iv = encryptedData.slice(0, this.IV_LENGTH);
          const ciphertext = encryptedData.slice(this.IV_LENGTH);

          // Import the key
          const cryptoKey = await this.importKey(this.encryptionKey);

          // Decrypt the data
          const decryptedBuffer = await crypto.subtle.decrypt(
            {
              name: this.ALGORITHM,
              iv: iv
            },
            cryptoKey,
            ciphertext
          );

          // Convert decrypted buffer to string
          const decryptedText = new TextDecoder().decode(decryptedBuffer);

          // Parse and validate the instruction set
          const instructionSet = this.parseInstructionSet(decryptedText);
          return instructionSet;
        } else {
          // If we couldn't fix the payload, throw the original error
          throw decryptionError;
        }
      }
    } catch (error) {
      this.handleDecryptionError(error);
      throw error;
    }
  }
  
  /**
   * Fix common payload format issues
   * @param {string} payload - The encrypted payload
   * @returns {string} Fixed payload
   */
  fixPayloadFormat(payload) {
    if (!payload) return payload;
    
    // Fix common base64 issues
    let fixed = payload;
    
    // Replace spaces with plus signs (common URL encoding issue)
    fixed = fixed.replace(/ /g, '+');
    
    // Fix padding if needed
    const paddingNeeded = fixed.length % 4;
    if (paddingNeeded > 0) {
      fixed += '='.repeat(4 - paddingNeeded);
    }
    
    // Fix URL-safe base64 characters
    fixed = fixed.replace(/-/g, '+').replace(/_/g, '/');
    
    return fixed;
  }

  /**
   * Parse and validate decrypted instruction set JSON
   * @param {string} decryptedText - The decrypted JSON string
   * @returns {InstructionSet} Validated instruction set object
   */
  parseInstructionSet(decryptedText) {
    try {
      // Parse JSON
      const rawData = JSON.parse(decryptedText);

      // Validate and create instruction set
      const instructionSet = this.validateInstructionSet(rawData);
      
      return instructionSet;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in decrypted payload');
      }
      throw error;
    }
  }

  /**
   * Validate instruction set data structure and types
   * @param {Object} data - Raw instruction data to validate
   * @returns {InstructionSet} Validated instruction set
   */
  validateInstructionSet(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid instruction set - must be an object');
    }

    // Required field: click_url
    if (!data.click_url || typeof data.click_url !== 'string') {
      throw new Error('Invalid instruction set - click_url is required and must be a string');
    }

    // Validate image_url format
    if (data.image_url && (!this.isValidUrl(data.image_url))) {
      throw new Error('Invalid instruction set - image_url must be a valid URL');
    }

    // Create validated instruction set with defaults
    const instructionSet = {
      image_url: data.image_url,
      click_url: data.click_url || null,
      deeplink_url: data.deeplink_url || null,
      auto_click: Boolean(data.auto_click),
      deeplink_priority: Boolean(data.deeplink_priority),
      auto_click_delay: null,
      title: data.title,
      description: data.description
    };

    // Validate optional URLs
    if (instructionSet.click_url && !this.isValidUrl(instructionSet.click_url)) {
      throw new Error('Invalid instruction set - click_url must be a valid URL');
    }

    if (instructionSet.deeplink_url && typeof instructionSet.deeplink_url !== 'string') {
      throw new Error('Invalid instruction set - deeplink_url must be a string');
    }

    // Validate auto_click_delay
    if (data.auto_click_delay !== undefined) {
      const delay = Number(data.auto_click_delay);
      if (isNaN(delay) || delay < 0) {
        throw new Error('Invalid instruction set - auto_click_delay must be a non-negative number');
      }
      instructionSet.auto_click_delay = delay;
    }

    return instructionSet;
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if URL is valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert base64 string to ArrayBuffer with enhanced error handling
   * @param {string} base64 - Base64 encoded string
   * @returns {ArrayBuffer} Decoded array buffer
   */
  base64ToArrayBuffer(base64) {
    try {
      if (!base64) {
        throw new Error('Empty payload provided');
      }
      
      // Fix common base64 issues
      let normalizedBase64 = base64;
      
      // Replace spaces with plus signs (common URL encoding issue)
      normalizedBase64 = normalizedBase64.replace(/ /g, '+');
      
      // Handle URL-safe base64
      normalizedBase64 = normalizedBase64.replace(/-/g, '+').replace(/_/g, '/');
      
      // Fix padding if needed
      const paddingNeeded = normalizedBase64.length % 4;
      if (paddingNeeded > 0) {
        normalizedBase64 += '='.repeat(4 - paddingNeeded);
      }
      
      // Decode base64
      const binaryString = atob(normalizedBase64);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes.buffer;
    } catch (error) {
      console.error('Base64 decoding error:', error);
      throw new Error(`Failed to decode base64 payload: ${error.message}`);
    }
  }

  /**
   * Handle decryption errors with appropriate logging and security measures
   * @param {Error} error - The error that occurred during decryption
   */
  handleDecryptionError(error) {
    // Log error details for debugging (but not sensitive information)
    console.error('Decryption error occurred:', {
      message: error.message,
      type: error.constructor.name,
      timestamp: new Date().toISOString()
    });

    // Report to Firebase if available
    if (typeof window !== 'undefined' && window.firebase) {
      try {
        // This would integrate with Firebase error reporting
        console.log('Would report error to Firebase:', error.message);
      } catch (reportingError) {
        console.error('Failed to report error to Firebase:', reportingError);
      }
    }

    // Security measure: Don't expose detailed decryption errors to prevent attacks
    if (error.message.includes('decrypt') || error.message.includes('key')) {
      // Generic error message for security
      const secureError = new Error('Failed to process encrypted payload');
      secureError.originalError = error.message;
      throw secureError;
    }
    
    // Re-throw non-sensitive errors as-is
    throw error;
  }

  /**
   * Encrypt an instruction set using AES-GCM
   * @param {Object} instructionSet - The instruction set to encrypt
   * @returns {Promise<string>} Base64 encoded encrypted data
   */
  async encrypt(instructionSet) {
    try {
      // Validate instruction set
      this.validateInstructionSet(instructionSet);
      const jsonData = JSON.stringify(instructionSet);
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      // Import key
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(this.encryptionKey.padEnd(32, '0').substring(0, 32)),
        { name: this.ALGORITHM },
        false,
        ['encrypt']
      );
      // Encrypt
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        cryptoKey,
        new TextEncoder().encode(jsonData)
      );
      // Combine IV + encrypted data + tag (tag is appended automatically in AES-GCM)
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);
      // Base64 encode
      let base64 = btoa(String.fromCharCode.apply(null, combined));
      // URL-safe
      base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return base64;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }
}

/**
 * InstructionSet interface definition (for documentation)
 * @typedef {Object} InstructionSet
 * @property {string} image_url - Required URL of image to display
 * @property {string|null} click_url - Optional fallback URL for clicks
 * @property {string|null} deeplink_url - Optional primary deeplink URL
 * @property {boolean} auto_click - Whether to enable auto-click (default: false)
 * @property {boolean} deeplink_priority - Whether deeplink has priority (default: false)
 * @property {number|null} auto_click_delay - Optional delay in milliseconds for auto-click
 */

// Export for use in other modules and tests
export default DecryptionService;

// Make available globally for browser usage
if (typeof window !== 'undefined') {
  window.DecryptionService = DecryptionService;
}