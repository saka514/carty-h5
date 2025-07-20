/**
 * Firebase Service for analytics tracking and monitoring
 * Handles initialization, event tracking, error reporting, and performance metrics
 */
class FirebaseService {
  constructor() {
    this.initialized = false;
    this.analytics = null;
    this.performance = null;
    this.initializationPromise = null;
  }

  /**
   * Initialize Firebase services
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  /**
   * Internal initialization logic
   * @private
   */
  async _performInitialization() {
    try {
      // Check if Firebase is enabled in configuration
      if (window.ENV_CONFIG && window.ENV_CONFIG.firebase && !window.ENV_CONFIG.firebase.enabled) {
        console.log('Firebase disabled in configuration - skipping initialization');
        this.initialized = false;
        return;
      }

      // Wait for Firebase to be available
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded');
      }

      // Check if Firebase App is initialized
      let app;
      try {
        app = firebase.app(); // Get default app
      } catch (error) {
        // If no default app exists, Firebase hasn't been initialized yet
        console.log('Firebase App not initialized yet - waiting...');
        
        // Wait a bit for Firebase to be initialized by the HTML script
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          app = firebase.app(); // Try again
        } catch (retryError) {
          throw new Error('Firebase App not initialized. Please ensure Firebase.initializeApp() is called first.');
        }
      }

      // Initialize Analytics
      if (firebase.analytics && app) {
        this.analytics = firebase.analytics();
        console.log('Firebase Analytics initialized');
      }

      // Initialize Performance Monitoring
      if (firebase.performance && app) {
        this.performance = firebase.performance();
        console.log('Firebase Performance initialized');
      }

      this.initialized = true;
      console.log('Firebase services initialized successfully');
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      // Continue without Firebase - graceful degradation
      this.initialized = false;
    }
  }

  /**
   * Track page view event
   */
  trackPageView() {
    if (!this.initialized || !this.analytics) {
      return;
    }

    try {
      this.analytics.logEvent('page_view', {
        page_title: document.title,
        page_location: window.location.href,
        timestamp: Date.now(),
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight
      });
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }

  /**
   * Track user interaction events
   * @param {string} action - The action performed
   * @param {Object} details - Additional event details
   */
  trackUserInteraction(action, details = {}) {
    if (!this.initialized || !this.analytics) {
      return;
    }

    try {
      this.analytics.logEvent('user_interaction', {
        action: action,
        timestamp: Date.now(),
        ...details
      });
    } catch (error) {
      console.error('Failed to track user interaction:', error);
    }
  }

  /**
   * Report error events
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   */
  reportError(error, context) {
    if (!this.initialized || !this.analytics) {
      return;
    }

    try {
      this.analytics.logEvent('error_occurred', {
        error_message: error.message,
        error_stack: error.stack,
        error_context: context,
        timestamp: Date.now(),
        page_location: window.location.href
      });
    } catch (analyticsError) {
      console.error('Failed to report error to Firebase:', analyticsError);
    }
  }

  /**
   * Track performance metrics with enhanced monitoring
   * @param {string} metric - The metric name
   * @param {number} value - The metric value
   * @param {Object} attributes - Additional attributes
   */
  trackPerformance(metric, value, attributes = {}) {
    if (!this.initialized || !this.performance) {
      return;
    }

    try {
      // Create custom trace for the metric
      const trace = this.performance.trace(metric);
      trace.start();

      // Enhanced attributes with system information
      const enhancedAttributes = {
        ...attributes,
        timestamp: Date.now().toString(),
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        connection_type: this.getConnectionType(),
        device_memory: this.getDeviceMemory(),
        cpu_cores: (navigator.hardwareConcurrency || 'unknown').toString()
      };

      // Add custom attributes (Firebase limits to 5 custom attributes)
      const attributeKeys = Object.keys(enhancedAttributes).slice(0, 5);
      attributeKeys.forEach(key => {
        trace.putAttribute(key, String(enhancedAttributes[key]));
      });

      // Record the metric value
      trace.putMetric(metric, value);
      trace.stop();

      // Also log to analytics for detailed analysis
      if (this.analytics) {
        this.analytics.logEvent('performance_metric', {
          metric_name: metric,
          metric_value: value,
          ...enhancedAttributes
        });
      }

      console.log(`📊 Performance tracked: ${metric} = ${value}ms`);

    } catch (error) {
      console.error('Failed to track performance metric:', error);
    }
  }

  /**
   * Get connection type for performance analysis
   * @returns {string} Connection type
   */
  getConnectionType() {
    if (navigator.connection) {
      return navigator.connection.effectiveType || navigator.connection.type || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Get device memory for performance analysis
   * @returns {string} Device memory in GB or 'unknown'
   */
  getDeviceMemory() {
    if (navigator.deviceMemory) {
      return navigator.deviceMemory + 'GB';
    }
    return 'unknown';
  }

  /**
   * Track image loading performance
   * @param {string} imageUrl - The image URL
   * @param {number} loadTime - Time taken to load in milliseconds
   * @param {boolean} success - Whether loading was successful
   */
  trackImageLoad(imageUrl, loadTime, success) {
    this.trackPerformance('image_load', loadTime, {
      image_url: imageUrl,
      success: success ? 'true' : 'false'
    });

    this.trackUserInteraction('image_load', {
      image_url: imageUrl,
      load_time: loadTime,
      success: success
    });
  }

  /**
   * Track click events
   * @param {string} clickType - Type of click (manual, auto)
   * @param {string} targetUrl - The target URL
   * @param {boolean} isDeeplink - Whether it's a deeplink attempt
   */
  trackClick(clickType, targetUrl, isDeeplink = false) {
    this.trackUserInteraction('click_event', {
      click_type: clickType,
      target_url: targetUrl,
      is_deeplink: isDeeplink,
      timestamp: Date.now()
    });
  }

  /**
   * Track decryption events
   * @param {boolean} success - Whether decryption was successful
   * @param {number} processingTime - Time taken for decryption
   */
  trackDecryption(success, processingTime) {
    this.trackUserInteraction('decryption_attempt', {
      success: success,
      processing_time: processingTime
    });

    this.trackPerformance('decryption_time', processingTime, {
      success: success ? 'true' : 'false'
    });
  }

  /**
   * Check if Firebase services are initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }
}

// Export for use in other modules
export default FirebaseService;

// Make available globally for browser usage
if (typeof window !== 'undefined') {
  window.FirebaseService = FirebaseService;
}