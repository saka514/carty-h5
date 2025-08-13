/**
 * Analytics Service - Unified Google Analytics initialization and UTM parameter handling
 * Provides centralized analytics functionality for all pages
 */
class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.trackingId = null;
    this.utmParams = {};
  }

  /**
   * Initialize Google Analytics with UTM parameter support
   * @param {string} trackingId - Google Analytics tracking ID
   * @returns {Promise<void>}
   */
  async initialize(trackingId) {
    if (this.initialized) {
      console.log('Analytics already initialized');
      return;
    }

    if (!trackingId) {
      console.warn('No tracking ID provided for Analytics');
      return;
    }

    this.trackingId = trackingId;

    try {
      // Load Google Analytics script
      await this.loadGoogleAnalyticsScript(trackingId);
      
      // Extract UTM parameters
      this.extractUtmParameters();
      
      // Initialize gtag
      this.initializeGtag();
      
      // Configure Google Analytics
      this.configureAnalytics();
      
      // Send initial page view
      this.sendPageView();
      
      this.initialized = true;
      console.log('Google Analytics initialized with tracking ID:', trackingId);
      
      if (Object.keys(this.utmParams).length > 0) {
        console.log('UTM parameters detected:', this.utmParams);
      }
    } catch (error) {
      console.error('Failed to initialize Google Analytics:', error);
    }
  }

  /**
   * Load Google Analytics script dynamically
   * @param {string} trackingId - Google Analytics tracking ID
   * @returns {Promise<void>}
   */
  loadGoogleAnalyticsScript(trackingId) {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector(`script[src*="gtag/js?id=${trackingId}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Analytics script'));
      
      document.head.appendChild(script);
    });
  }

  /**
   * Extract UTM and campaign parameters from URL
   */
  extractUtmParameters() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const campaignParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_clickid', 'utm_term', 'utm_content',
        'utm_id', 'gclid', 'fbclid', 'msclkid', 'ttclid'
      ];
      
      this.utmParams = {};
      campaignParams.forEach(param => {
        const value = urlParams.get(param);
        if (value) {
          this.utmParams[param] = value;
        }
      });
    } catch (error) {
      console.error('Error extracting UTM parameters:', error);
      this.utmParams = {};
    }
  }

  /**
   * Initialize gtag function
   */
  initializeGtag() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function() {
      dataLayer.push(arguments);
    };
    gtag('js', new Date());
  }

  /**
redacted   * Get clean URL without UTM parameters for page_location
   * @returns {string} Clean URL without UTM parameters
   */
  getCleanUrl() {
    const url = new URL(window.location.href);
    const utmParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_clickid', 'utm_term', 'utm_content',
      'utm_id', 'gclid', 'fbclid', 'msclkid', 'ttclid'
    ];
    
    // Remove UTM parameters from URL
    utmParams.forEach(param => {
      url.searchParams.delete(param);
    });
    
    return url.toString();
  }

  /**
   * Configure Google Analytics with custom parameters
   */
  configureAnalytics() {
    const config = {
      page_title: document.title,
      page_location: window.location.href,
      send_page_view: false // We'll send it manually with UTM params
    };

    // Add UTM parameters directly to config for GA4
    if (Object.keys(this.utmParams).length > 0) {
      // Map UTM parameters to GA4 campaign parameters
      if (this.utmParams.utm_source) config.campaign_source = this.utmParams.utm_source;
      if (this.utmParams.utm_medium) config.campaign_medium = this.utmParams.utm_medium;
      if (this.utmParams.utm_campaign) config.campaign_name = this.utmParams.utm_campaign;
      if (this.utmParams.utm_term) config.campaign_term = this.utmParams.utm_term;
      if (this.utmParams.utm_content) config.campaign_content = this.utmParams.utm_content;
      if (this.utmParams.utm_id) config.campaign_id = this.utmParams.utm_id;
      if (this.utmParams.utm_clickid) config.campaign_clickid = this.utmParams.utm_clickid;
    }

    gtag('config', this.trackingId, config);
  }

  /**
   * Send page view event with UTM parameters
   */
  sendPageView() {
    const eventData = {
      page_title: document.title,
      page_location: window.location.href 
    };

    // Add campaign parameters in GA4 format
    if (Object.keys(this.utmParams).length > 0) {
      if (this.utmParams.utm_source) eventData.campaign_source = this.utmParams.utm_source;
      if (this.utmParams.utm_medium) eventData.campaign_medium = this.utmParams.utm_medium;
      if (this.utmParams.utm_campaign) eventData.campaign_name = this.utmParams.utm_campaign;
      if (this.utmParams.utm_term) eventData.campaign_term = this.utmParams.utm_term;
      if (this.utmParams.utm_content) eventData.campaign_content = this.utmParams.utm_content;
      if (this.utmParams.utm_id) eventData.campaign_id = this.utmParams.utm_id;
      if (this.utmParams.utm_clickid) eventData.campaign_clickid = this.utmParams.utm_clickid;
    }

    gtag('event', 'page_view', eventData);
  }

  /**
   * Track custom events
   * @param {string} eventName - Event name
   * @param {Object} eventData - Event data
   */
  trackEvent(eventName, eventData = {}) {
    if (!this.initialized) {
      console.warn('Analytics not initialized, cannot track event:', eventName);
      return;
    }

    const enhancedEventData = {
      ...eventData
    };

    // Add campaign parameters in GA4 format
    if (Object.keys(this.utmParams).length > 0) {
      if (this.utmParams.utm_source) enhancedEventData.campaign_source = this.utmParams.utm_source;
      if (this.utmParams.utm_medium) enhancedEventData.campaign_medium = this.utmParams.utm_medium;
      if (this.utmParams.utm_campaign) enhancedEventData.campaign_name = this.utmParams.utm_campaign;
      if (this.utmParams.utm_term) enhancedEventData.campaign_term = this.utmParams.utm_term;
      if (this.utmParams.utm_content) enhancedEventData.campaign_content = this.utmParams.utm_content;
      if (this.utmParams.utm_id) enhancedEventData.campaign_id = this.utmParams.utm_id;
      if (this.utmParams.utm_clickid) enhancedEventData.campaign_clickid = this.utmParams.utm_clickid;
    }

    gtag('event', eventName, enhancedEventData);
  }

  /**
   * Track button clicks
   * @param {string} buttonName - Button identifier
   * @param {string} targetUrl - Target URL if applicable
   */
  trackButtonClick(buttonName, targetUrl = null) {
    const eventData = {
      event_category: 'engagement',
      event_label: buttonName
    };

    if (targetUrl) {
      eventData.target_url = targetUrl;
    }

    this.trackEvent('click', eventData);
  }

  /**
   * Get current UTM parameters
   * @returns {Object} UTM parameters object
   */
  getUtmParameters() {
    return { ...this.utmParams };
  }
}

/**
 * Auto-initialize analytics if configuration is available
 */
function initializeAnalyticsFromConfig() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnalyticsFromConfig);
    return;
  }

  // Check if ENV_CONFIG is available
  if (!window.ENV_CONFIG) {
    // ENV_CONFIG not loaded yet, wait a bit and retry
    setTimeout(initializeAnalyticsFromConfig, 100);
    return;
  }

  // Check if analytics should be initialized
  if (window.ENV_CONFIG.analytics && 
      window.ENV_CONFIG.analytics.enabled && 
      window.ENV_CONFIG.analytics.googleAnalytics && 
      window.ENV_CONFIG.analytics.googleAnalytics.trackingId) {
    
    const trackingId = window.ENV_CONFIG.analytics.googleAnalytics.trackingId;
    
    // Create global analytics instance
    window.analyticsService = new AnalyticsService();
    window.analyticsService.initialize(trackingId);
    console.log('Google Analytics auto-initialized successfully');
  } else {
    console.log('Google Analytics disabled in configuration');
  }
}

// Auto-initialize when script loads
initializeAnalyticsFromConfig();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsService;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.AnalyticsService = AnalyticsService;
}