/**
 * Enhanced error handling for decryption service
 * This script adds improved error handling and recovery for encrypted payloads
 */

// Wait for document to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if DecryptionService exists
  if (typeof window.DecryptionService !== 'undefined') {
    enhanceDecryptionService();
  } else {
    // Wait for DecryptionService to be loaded
    const checkInterval = setInterval(() => {
      if (typeof window.DecryptionService !== 'undefined') {
        clearInterval(checkInterval);
        enhanceDecryptionService();
      }
    }, 100);
  }
});

/**
 * Enhance the DecryptionService with improved error handling
 */
function enhanceDecryptionService() {
  const originalDecrypt = window.DecryptionService.prototype.decrypt;
  
  // Override the decrypt method with enhanced error handling
  window.DecryptionService.prototype.decrypt = async function(encryptedPayload) {
    try {
      // Call the original decrypt method
      return await originalDecrypt.call(this, encryptedPayload);
    } catch (error) {
      // Enhanced error handling
      console.error('Enhanced error handling for decryption:', error);
      
      // Try to recover from common issues
      if (error.message.includes('Failed to process encrypted payload')) {
        // Check for common payload format issues
        if (encryptedPayload) {
          // Try to fix common base64 issues
          const fixedPayload = fixBase64Format(encryptedPayload);
          if (fixedPayload !== encryptedPayload) {
            console.log('Attempting recovery with fixed payload format');
            try {
              return await originalDecrypt.call(this, fixedPayload);
            } catch (recoveryError) {
              console.error('Recovery attempt failed:', recoveryError);
            }
          }
        }
      }
      
      // Show user-friendly error message
      showDecryptionErrorMessage();
      
      // Re-throw the error for other handlers
      throw error;
    }
  };
  
  console.log('DecryptionService enhanced with improved error handling');
}

/**
 * Fix common base64 format issues
 * @param {string} payload - The encrypted payload
 * @returns {string} Fixed payload
 */
function fixBase64Format(payload) {
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
 * Show a user-friendly error message
 */
function showDecryptionErrorMessage() {
  // Check if error message element exists
  let errorElement = document.getElementById('decryption-error');
  
  if (!errorElement) {
    // Create error message element
    errorElement = document.createElement('div');
    errorElement.id = 'decryption-error';
    errorElement.style.position = 'fixed';
    errorElement.style.top = '20px';
    errorElement.style.left = '50%';
    errorElement.style.transform = 'translateX(-50%)';
    errorElement.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    errorElement.style.color = 'white';
    errorElement.style.padding = '10px 20px';
    errorElement.style.borderRadius = '5px';
    errorElement.style.zIndex = '9999';
    errorElement.style.textAlign = 'center';
    errorElement.style.maxWidth = '80%';
    
    document.body.appendChild(errorElement);
  }
  
  // Set error message
  errorElement.textContent = 'Unable to process the encrypted instructions. Please check the payload format.';
  
  // Hide after 5 seconds
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, 5000);
}