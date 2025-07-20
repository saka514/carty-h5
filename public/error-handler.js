/**
 * ErrorHandler - Centralized error management and recovery system
 * 
 * This class provides centralized error handling, user-friendly error display,
 * graceful degradation, and retry mechanisms for recoverable errors.
 */

class ErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.retryAttempts = new Map(); // Track retry attempts per operation
    this.maxRetryAttempts = 3;
    this.retryDelays = [1000, 2000, 4000]; // Progressive delays in ms
    this.isErrorStateVisible = false;
    
    // Error type classifications
    this.ERROR_TYPES = {
      PARAMETER_PARSING: 'parameter_parsing',
      DECRYPTION: 'decryption',
      IMAGE_LOADING: 'image_loading', // Now refers to background image loading
      BACKGROUND_IMAGE_LOADING: 'background_image_loading', // Alias for IMAGE_LOADING for backward compatibility
      CLICK_HANDLING: 'click_handling',
      FIREBASE: 'firebase',
      NETWORK: 'network',
      VALIDATION: 'validation',
      SECURITY: 'security'
    };

    // Recoverable error types that support retry
    this.RECOVERABLE_ERRORS = [
      this.ERROR_TYPES.IMAGE_LOADING, // Now refers to background image loading
      this.ERROR_TYPES.BACKGROUND_IMAGE_LOADING, // Alias for backward compatibility
      this.ERROR_TYPES.FIREBASE,
      this.ERROR_TYPES.NETWORK
    ];

    this.initialize();
  }

  /**
   * Initialize the error handler
   */
  initialize() {
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Store reference globally for use by other components
    if (typeof window !== 'undefined') {
      window.errorHandler = this;
    }
  }

  /**
   * Set up global error handlers for unhandled errors
   */
  setupGlobalErrorHandlers() {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(
        new Error(event.message || 'Unhandled JavaScript error'),
        'global_error',
        { 
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno 
        }
      );
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        'unhandled_promise_rejection'
      );
    });
  }

  /**
   * Main error handling method
   * @param {Error} error - The error that occurred
   * @param {string} context - Context where the error occurred
   * @param {Object} metadata - Additional error metadata
   * @param {Object} options - Error handling options
   */
  handleError(error, context, metadata = {}, options = {}) {
    try {
      // Create standardized error object
      const errorInfo = this.createErrorInfo(error, context, metadata);
      
      // Add to error history
      this.addToErrorHistory(errorInfo);
      
      // Log error details
      this.logError(errorInfo);
      
      // Report to Firebase if available and not a Firebase error
      if (context !== this.ERROR_TYPES.FIREBASE) {
        this.reportToFirebase(errorInfo);
      }
      
      // Determine error type and handle accordingly
      const errorType = this.classifyError(error, context);
      
      // Check if error is recoverable and should be retried
      if (this.shouldRetry(errorType, context, options)) {
        return this.attemptRetry(error, context, metadata, options);
      }
      
      // Handle non-recoverable errors or exhausted retries
      this.handleNonRecoverableError(errorInfo, options);
      
    } catch (handlingError) {
      // Fallback error handling if error handler itself fails
      console.error('ErrorHandler: Failed to handle error:', handlingError);
      this.displayFallbackError();
    }
  }

  /**
   * Create standardized error information object
   * @param {Error} error - The original error
   * @param {string} context - Error context
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Standardized error info
   */
  createErrorInfo(error, context, metadata = {}) {
    return {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: context,
      type: this.classifyError(error, context),
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        ...metadata
      },
      severity: this.determineSeverity(error, context)
    };
  }

  /**
   * Classify error type based on error and context
   * @param {Error} error - The error object
   * @param {string} context - Error context
   * @returns {string} Error type classification
   */
  classifyError(error, context) {
    // Check context first
    if (Object.values(this.ERROR_TYPES).includes(context)) {
      return context;
    }

    // Check for image specific errors
    if (error && error.type) {
      if (error.type === 'cors' || error.type === 'format' || error.type === 'timeout') {
        return this.ERROR_TYPES.IMAGE_LOADING;
      }
      if (error.type === 'network') {
        return this.ERROR_TYPES.NETWORK;
      }
    }
    
    // Check for metadata indicating background image (for backward compatibility)
    if (error && error.metadata && error.metadata.isBackgroundImage) {
      return this.ERROR_TYPES.IMAGE_LOADING;
    }

    // Classify based on error message patterns
    const message = error.message ? error.message.toLowerCase() : '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return this.ERROR_TYPES.NETWORK;
    }
    
    if (message.includes('decrypt') || message.includes('key') || message.includes('cipher')) {
      return this.ERROR_TYPES.DECRYPTION;
    }
    
    if (message.includes('background-image') || message.includes('background image')) {
      return this.ERROR_TYPES.IMAGE_LOADING;
    }
    
    if (message.includes('image') || message.includes('load')) {
      return this.ERROR_TYPES.IMAGE_LOADING;
    }
    
    if (message.includes('parameter') || message.includes('url')) {
      return this.ERROR_TYPES.PARAMETER_PARSING;
    }
    
    if (message.includes('firebase')) {
      return this.ERROR_TYPES.FIREBASE;
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return this.ERROR_TYPES.VALIDATION;
    }
    
    return 'unknown';
  }

  /**
   * Determine error severity level
   * @param {Error} error - The error object
   * @param {string} context - Error context
   * @returns {string} Severity level
   */
  determineSeverity(error, context) {
    // Critical errors that break core functionality
    const criticalContexts = [
      this.ERROR_TYPES.DECRYPTION,
      this.ERROR_TYPES.PARAMETER_PARSING,
      this.ERROR_TYPES.SECURITY
    ];
    
    if (criticalContexts.includes(context)) {
      return 'critical';
    }
    
    // High severity errors that significantly impact user experience
    const highSeverityContexts = [
      this.ERROR_TYPES.IMAGE_LOADING,
      this.ERROR_TYPES.CLICK_HANDLING
    ];
    
    if (highSeverityContexts.includes(context)) {
      return 'high';
    }
    
    // Medium severity for monitoring and analytics
    if (context === this.ERROR_TYPES.FIREBASE) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Check if an error should be retried
   * @param {string} errorType - Type of error
   * @param {string} context - Error context
   * @param {Object} options - Error handling options
   * @returns {boolean} Whether to attempt retry
   */
  shouldRetry(errorType, context, options = {}) {
    // Don't retry if explicitly disabled
    if (options.noRetry === true) {
      return false;
    }
    
    // Don't retry non-recoverable error types
    if (!this.RECOVERABLE_ERRORS.includes(errorType)) {
      return false;
    }
    
    // Check retry attempts
    const retryKey = `${context}_${errorType}`;
    const attempts = this.retryAttempts.get(retryKey) || 0;
    
    return attempts < this.maxRetryAttempts;
  }

  /**
   * Attempt to retry a failed operation
   * @param {Error} originalError - The original error
   * @param {string} context - Error context
   * @param {Object} metadata - Error metadata
   * @param {Object} options - Retry options
   * @returns {Promise} Retry promise
   */
  async attemptRetry(originalError, context, metadata = {}, options = {}) {
    const retryKey = `${context}_${this.classifyError(originalError, context)}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    const nextAttempt = currentAttempts + 1;
    
    // Update retry count
    this.retryAttempts.set(retryKey, nextAttempt);
    
    // Calculate delay (progressive backoff)
    const delay = this.retryDelays[Math.min(currentAttempts, this.retryDelays.length - 1)];
    
    console.log(`ErrorHandler: Retrying operation (attempt ${nextAttempt}/${this.maxRetryAttempts}) after ${delay}ms delay`);
    
    // Show retry message to user
    this.displayRetryMessage(nextAttempt, this.maxRetryAttempts);
    
    // Wait for delay
    await this.delay(delay);
    
    try {
      // Attempt to retry based on context
      const success = await this.executeRetry(context, metadata, options);
      
      if (success) {
        // Reset retry count on success
        this.retryAttempts.delete(retryKey);
        this.hideErrorState();
        console.log(`ErrorHandler: Retry successful for ${context}`);
        return true;
      } else {
        throw new Error('Retry operation failed');
      }
      
    } catch (retryError) {
      console.error(`ErrorHandler: Retry attempt ${nextAttempt} failed:`, retryError);
      
      // If this was the last attempt, handle as non-recoverable
      if (nextAttempt >= this.maxRetryAttempts) {
        this.retryAttempts.delete(retryKey);
        this.handleNonRecoverableError(
          this.createErrorInfo(originalError, context, { 
            ...metadata, 
            retryAttempts: nextAttempt 
          })
        );
      }
      
      return false;
    }
  }

  /**
   * Execute retry logic based on context
   * @param {string} context - Error context
   * @param {Object} metadata - Error metadata
   * @param {Object} options - Retry options
   * @returns {Promise<boolean>} Success status
   */
  async executeRetry(context, metadata = {}, options = {}) {
    switch (context) {
      case this.ERROR_TYPES.IMAGE_LOADING:
      case this.ERROR_TYPES.BACKGROUND_IMAGE_LOADING:
        return this.retryBackgroundImageLoading(metadata, options);
        
      case this.ERROR_TYPES.FIREBASE:
        return this.retryFirebaseOperation(metadata, options);
        
      case this.ERROR_TYPES.NETWORK:
        return this.retryNetworkOperation(metadata, options);
        
      default:
        console.warn(`ErrorHandler: No retry logic defined for context: ${context}`);
        return false;
    }
  }

  /**
   * Retry image loading operation (legacy method kept for compatibility)
   * @param {Object} metadata - Error metadata
   * @param {Object} options - Retry options
   * @returns {Promise<boolean>} Success status
   */
  async retryImageLoading(metadata = {}, options = {}) {
    // Redirect to background image loading retry for consistency
    return this.retryBackgroundImageLoading(metadata, options);
  }
  
  /**
   * Retry background image loading operation with enhanced error handling
   * @param {Object} metadata - Error metadata
   * @param {Object} options - Retry options
   * @returns {Promise<boolean>} Success status
   */
  async retryBackgroundImageLoading(metadata = {}, options = {}) {
    try {
      console.log('ErrorHandler: Retrying background image loading with enhanced handling');
      
      // Get the image URL from metadata or instruction set
      const imageUrl = metadata.url || 
                      (window.instructionSet && window.instructionSet.image_url) || 
                      null;
      
      if (!imageUrl) {
        console.error('ErrorHandler: No image URL available for retry');
        return false;
      }
      
      if (!window.displayController) {
        console.error('ErrorHandler: No display controller available');
        return false;
      }
      
      // For CORS errors, try with specific approach
      if (metadata.errorType === 'cors') {
        console.log('ErrorHandler: Using background-image approach for CORS error');
        // The background-image approach is already being used, but we can add
        // additional handling here if needed in the future
      }
      
      // For timeout errors, try with a longer timeout
      if (metadata.errorType === 'timeout') {
        console.log('ErrorHandler: Retrying with longer timeout');
        // The retry itself provides a longer effective timeout
      }
      
      // Attempt to load the image again
      await window.displayController.loadImage(imageUrl);
      return true;
      
    } catch (error) {
      console.error('ErrorHandler: Background image loading retry failed:', error);
      return false;
    }
  }

  /**
   * Retry Firebase operation
   * @param {Object} metadata - Error metadata
   * @param {Object} options - Retry options
   * @returns {Promise<boolean>} Success status
   */
  async retryFirebaseOperation(metadata = {}, options = {}) {
    try {
      if (window.firebaseService) {
        // Try to reinitialize Firebase
        await window.firebaseService.initialize();
        return window.firebaseService.isInitialized();
      }
      return false;
    } catch (error) {
      console.error('ErrorHandler: Firebase retry failed:', error);
      return false;
    }
  }

  /**
   * Retry network operation
   * @param {Object} metadata - Error metadata
   * @param {Object} options - Retry options
   * @returns {Promise<boolean>} Success status
   */
  async retryNetworkOperation(metadata = {}, options = {}) {
    try {
      // Generic network connectivity check
      const response = await fetch(window.location.origin, { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      console.error('ErrorHandler: Network retry failed:', error);
      return false;
    }
  }

  /**
   * Handle non-recoverable errors
   * @param {Object} errorInfo - Standardized error information
   * @param {Object} options - Error handling options
   */
  handleNonRecoverableError(errorInfo, options = {}) {
    // Implement graceful degradation based on error type
    this.implementGracefulDegradation(errorInfo);
    
    // Display user-friendly error message
    this.displayErrorState(errorInfo, options);
  }

  /**
   * Implement graceful degradation strategies
   * @param {Object} errorInfo - Error information
   */
  implementGracefulDegradation(errorInfo) {
    switch (errorInfo.type) {
      case this.ERROR_TYPES.DECRYPTION:
        this.degradeDecryptionFailure();
        break;
        
      case this.ERROR_TYPES.IMAGE_LOADING:
      case this.ERROR_TYPES.BACKGROUND_IMAGE_LOADING:
        this.degradeBackgroundImageLoadingFailure(errorInfo);
        break;
        
      case this.ERROR_TYPES.FIREBASE:
        this.degradeFirebaseFailure();
        break;
        
      case this.ERROR_TYPES.CLICK_HANDLING:
        this.degradeClickHandlingFailure();
        break;
        
      default:
        console.log('ErrorHandler: No specific degradation strategy for error type:', errorInfo.type);
    }
  }

  /**
   * Graceful degradation for decryption failures
   */
  degradeDecryptionFailure() {
    console.log('ErrorHandler: Implementing graceful degradation for decryption failure');
    // Try to extract payload from URL
    const urlParams = new URLSearchParams(window.location.search);
    const payload = urlParams.get('payload');
    if (payload) {
      // Check for common payload format issues
      const fixedPayload = this.fixPayloadFormat(payload);
      if (fixedPayload !== payload) {
        console.log('ErrorHandler: Attempting recovery with fixed payload format');
        // Create a new URL with the fixed payload
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('payload', fixedPayload);
        // Reload with the fixed payload
        console.log('ErrorHandler: Reloading with fixed payload');
        window.location.href = newUrl.toString();
        return;
      }
    }
    // 主动通知 service worker 清理缓存
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_UPDATE' });
      // reload 页面，确保资源为最新
      setTimeout(() => {
        window.location.reload();
      }, 300);
      return;
    }
    // If we can't fix the payload, disable functionality that depends on decrypted instructions
    console.log('ErrorHandler: Unable to fix payload, disabling dependent functionality');
    // Show informational message about requiring valid encrypted payload
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = 'Unable to process the encrypted instructions. Please check the payload format.';
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
   * Graceful degradation for image loading failures (legacy method kept for compatibility)
   */
  degradeImageLoadingFailure() {
    console.log('ErrorHandler: Redirecting to background image degradation strategy');
    // Redirect to background image degradation for consistency
    this.degradeBackgroundImageLoadingFailure({ type: this.ERROR_TYPES.IMAGE_LOADING });
  }
  
  /**
   * Graceful degradation for background image loading failures
   * @param {Object} errorInfo - Error information
   */
  degradeBackgroundImageLoadingFailure(errorInfo) {
    console.log('ErrorHandler: Implementing graceful degradation for background image loading failure');
    
    // Get error type from metadata if available
    const errorType = errorInfo.metadata && errorInfo.metadata.errorType ? 
                      errorInfo.metadata.errorType : 'unknown';
    
    // Apply specific degradation strategies based on error type
    switch (errorType) {
      case 'cors':
        // For CORS errors, we're already using background-image which should work
        // But we can add a fallback placeholder if needed
        this.showPlaceholderImage();
        break;
        
      case 'network':
        // For network errors, ensure click functionality still works if possible
        this.ensureClickFunctionality();
        break;
        
      case 'timeout':
        // For timeout errors, show a low-resolution placeholder if available
        this.showPlaceholderImage();
        break;
        
      case 'format':
        // For format errors, show a generic placeholder
        this.showPlaceholderImage();
        break;
        
      default:
        // Generic fallback
        this.showPlaceholderImage();
    }
    
    // Always ensure click functionality works if possible
    this.ensureClickFunctionality();
  }

  /**
   * Graceful degradation for Firebase failures
   */
  degradeFirebaseFailure() {
    console.log('ErrorHandler: Implementing graceful degradation for Firebase failure');
    // Continue operation without analytics
    // Store events locally if needed
  }

  /**
   * Graceful degradation for click handling failures
   */
  degradeClickHandlingFailure() {
    console.log('ErrorHandler: Implementing graceful degradation for click handling failure');
    // Provide alternative interaction methods
    // Show manual URL options if available
  }

  /**
   * Display user-friendly error state
   * @param {Object} errorInfo - Error information
   * @param {Object} options - Display options
   */
  displayErrorState(errorInfo, options = {}) {
    const userMessage = this.generateUserFriendlyMessage(errorInfo);
    
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    
    if (errorMessage) {
      errorMessage.textContent = userMessage;
    }
    
    if (errorState) {
      errorState.style.display = 'block';
      this.isErrorStateVisible = true;
    }
    
    // Hide loading state
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
      loadingState.style.display = 'none';
    }
    
    console.log('ErrorHandler: Displayed error state:', userMessage);
  }

  /**
   * Generate user-friendly error message
   * @param {Object} errorInfo - Error information
   * @returns {string} User-friendly message
   */
  generateUserFriendlyMessage(errorInfo) {
    switch (errorInfo.type) {
      case this.ERROR_TYPES.PARAMETER_PARSING:
        return 'Please access this page with a valid encrypted payload parameter.';
        
      case this.ERROR_TYPES.DECRYPTION:
        return 'Unable to process the encrypted instructions. Please check the payload format.';
        
      case this.ERROR_TYPES.IMAGE_LOADING:
      case this.ERROR_TYPES.BACKGROUND_IMAGE_LOADING:
        // Specific messages for image loading errors
        if (errorInfo.metadata && errorInfo.metadata.errorType) {
          switch (errorInfo.metadata.errorType) {
            case 'cors':
              return 'Unable to load image from external domain. This may be due to cross-origin restrictions.';
            case 'timeout':
              return 'Image loading timed out. The server might be slow or unresponsive.';
            case 'format':
              return 'Invalid image format or corrupted image file.';
            case 'network':
              return 'Network error while loading image. Please check your internet connection.';
            default:
              return 'Failed to load the image. Please try again later.';
          }
        }
        return 'Failed to load the image. Please try again later.';
        
      case this.ERROR_TYPES.NETWORK:
        return 'Network connection error. Please check your internet connection and try again.';
        
      case this.ERROR_TYPES.FIREBASE:
        return 'Monitoring services are temporarily unavailable, but the page will continue to function.';
        
      case this.ERROR_TYPES.CLICK_HANDLING:
        return 'Click functionality is temporarily unavailable. Please try refreshing the page.';
        
      case this.ERROR_TYPES.VALIDATION:
        return 'Invalid data format detected. Please verify the input parameters.';
        
      case this.ERROR_TYPES.SECURITY:
        return 'Security validation failed. Please ensure you are using a valid encrypted payload.';
        
      default:
        return 'An unexpected error occurred. Please try refreshing the page.';
    }
  }

  /**
   * Display retry message to user
   * @param {number} attempt - Current attempt number
   * @param {number} maxAttempts - Maximum attempts
   */
  displayRetryMessage(attempt, maxAttempts) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = `Retrying... (${attempt}/${maxAttempts})`;
    }
  }

  /**
   * Hide error state
   */
  hideErrorState() {
    const errorState = document.getElementById('error-state');
    if (errorState) {
      errorState.style.display = 'none';
      this.isErrorStateVisible = false;
    }
  }

  /**
   * Add error to history
   * @param {Object} errorInfo - Error information
   */
  addToErrorHistory(errorInfo) {
    this.errorHistory.push(errorInfo);
    
    // Keep only last 50 errors to prevent memory issues
    if (this.errorHistory.length > 50) {
      this.errorHistory = this.errorHistory.slice(-50);
    }
  }

  /**
   * Log error details
   * @param {Object} errorInfo - Error information
   */
  logError(errorInfo) {
    const logLevel = errorInfo.severity === 'critical' ? 'error' : 
                    errorInfo.severity === 'high' ? 'warn' : 'log';
    
    console[logLevel]('ErrorHandler:', {
      id: errorInfo.id,
      type: errorInfo.type,
      context: errorInfo.context,
      message: errorInfo.message,
      severity: errorInfo.severity,
      timestamp: errorInfo.timestamp
    });
  }

  /**
   * Report error to Firebase if available
   * @param {Object} errorInfo - Error information
   */
  reportToFirebase(errorInfo) {
    try {
      if (window.firebaseService && typeof window.firebaseService.reportError === 'function') {
        const error = new Error(errorInfo.message);
        error.stack = errorInfo.stack;
        window.firebaseService.reportError(error, errorInfo.context, errorInfo.metadata);
      }
    } catch (reportingError) {
      console.error('ErrorHandler: Failed to report error to Firebase:', reportingError);
    }
  }

  /**
   * Display fallback error when error handler itself fails
   */
  displayFallbackError() {
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    
    if (errorMessage) {
      errorMessage.textContent = 'A critical error occurred. Please refresh the page.';
    }
    
    if (errorState) {
      errorState.style.display = 'block';
    }
  }

  /**
   * Generate unique error ID
   * @returns {string} Unique error identifier
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create delay promise
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error history
   * @returns {Array} Array of error information objects
   */
  getErrorHistory() {
    return [...this.errorHistory];
  }

  /**
   * Show a placeholder image when the actual image fails to load
   */
  showPlaceholderImage() {
    try {
      const displayImage = document.getElementById('display-image');
      if (!displayImage) return;
      
      // Remove any existing background image
      displayImage.style.backgroundImage = 'none';
      
      // Add a CSS class for placeholder styling
      displayImage.classList.add('image-placeholder');
      
      // Show the display element
      displayImage.style.display = 'block';
      
      console.log('ErrorHandler: Showing placeholder image');
    } catch (error) {
      console.error('ErrorHandler: Failed to show placeholder image:', error);
    }
  }
  
  /**
   * Ensure click functionality works even when image loading fails
   */
  ensureClickFunctionality() {
    try {
      // Check if we have click handler and instruction set
      if (!window.clickHandler || !window.instructionSet) return;
      
      // Make sure the click container is visible and clickable
      const imageContainer = document.getElementById('image-container');
      if (imageContainer) {
        imageContainer.style.display = 'block';
        imageContainer.style.cursor = 'pointer';
        
        // Add a visual indicator that clicking is possible
        imageContainer.classList.add('clickable-error-state');
        
        console.log('ErrorHandler: Ensuring click functionality remains available');
      }
    } catch (error) {
      console.error('ErrorHandler: Failed to ensure click functionality:', error);
    }
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.retryAttempts.clear();
  }

  /**
   * Get current error state
   * @returns {Object} Current error state information
   */
  getCurrentErrorState() {
    return {
      isVisible: this.isErrorStateVisible,
      errorCount: this.errorHistory.length,
      retryOperations: Array.from(this.retryAttempts.entries())
    };
  }
}

// Export for use in other modules and tests
export default ErrorHandler;

// Make available globally for browser usage
if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
}