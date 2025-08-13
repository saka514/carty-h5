/**
 * H5 Encrypted Display Page - Main Application Controller
 * This class orchestrates all components and manages the complete application lifecycle
 */

import DecryptionService from './decryption-service.js';
import DisplayController from './display-controller.js';
import ClickHandler from './click-handler.js';
import ErrorHandler from './error-handler.js';
import FirebaseService from './firebase-service.js';
import ParameterParser from './parameter-parser.js';

class App {
  constructor() {
    this.components = {
      firebaseService: null,
      parameterParser: null,
      decryptionService: null,
      displayController: null,
      clickHandler: null,
      errorHandler: null
    };
    
    this.state = {
      initialized: false,
      encryptedPayload: null,
      instructionSet: null,
      currentPhase: 'initializing'
    };
    
    this.config = {
      maxInitializationTime: 30000, // 30 seconds timeout
      enableAutoClick: true,
      enableFirebaseMonitoring: window.ENV_CONFIG && window.ENV_CONFIG.firebase ? window.ENV_CONFIG.firebase.enabled : false
    };
  }

  /**
   * Initialize the complete application
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      ('🚀 H5 Encrypted Display Page - Application Starting');
      this.updatePhase('initializing');

      // Set up initialization timeout
      const initTimeout = setTimeout(() => {
        throw new Error('Application initialization timeout');
      }, this.config.maxInitializationTime);

      // Initialize components in proper order
      await this.initializeErrorHandler();
      await this.initializeFirebaseService();
      await this.initializeParameterParser();
      await this.initializeDecryptionService();
      await this.initializeDisplayController();
      await this.initializeClickHandler();

      // Clear timeout
      clearTimeout(initTimeout);

      // Complete initialization
      this.state.initialized = true;
      this.updatePhase('ready');
      
      // Start the main application flow
      await this.startApplicationFlow();

    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Start the main application flow from URL parameter to final user action
   * @returns {Promise<void>}
   */
  async startApplicationFlow() {
    try {
      // Phase 1: Parse URL parameters
      this.updatePhase('parsing_parameters');
      const parameterResult = await this.parseUrlParameters();
      
      if (!parameterResult.success) {
        this.handleFlowError('parameter_parsing', parameterResult.error);
        return;
      }

      // Phase 2: Decrypt instruction set
      this.updatePhase('decrypting_payload');
      const decryptionResult = await this.decryptInstructionSet(parameterResult.payload);
      
      if (!decryptionResult.success) {
        this.handleFlowError('decryption', decryptionResult.error);
        return;
      }

      // 动态设置页面标题
      if (decryptionResult.instructionSet && decryptionResult.instructionSet.title) {
        document.title = decryptionResult.instructionSet.title;
        var titleTag = document.getElementById('dynamic-title');
        if (titleTag) titleTag.textContent = decryptionResult.instructionSet.title;
      }

      // Phase 3: Load and display image
      this.updatePhase('loading_image');
      const imageResult = await this.loadAndDisplayImage(decryptionResult.instructionSet);
      
      if (!imageResult.success) {
        this.handleFlowError('image_loading', imageResult.error);
        return;
      }

      // Phase 4: Setup click handling
      this.updatePhase('setting_up_interactions');
      const clickResult = await this.setupClickHandling(decryptionResult.instructionSet);
      
      if (!clickResult.success) {
        this.handleFlowError('click_handling', clickResult.error);
        return;
      }

      // Phase 5: Complete - ready for user interaction
      this.updatePhase('ready_for_interaction');

      // Track successful completion
      this.trackApplicationSuccess();

    } catch (error) {
      console.error('❌ Application flow failed:', error);
      this.handleFlowError('application_flow', error.message);
    }
  }

  /**
   * Initialize Error Handler
   * @returns {Promise<void>}
   */
  async initializeErrorHandler() {
    try {
      this.components.errorHandler = new ErrorHandler();
    } catch (error) {
      console.error('❌ Failed to initialize Error Handler:', error);
      // Continue without centralized error handling
    }
  }

  /**
   * Initialize Firebase Service for analytics and monitoring
   * @returns {Promise<void>}
   */
  async initializeFirebaseService() {
    if (!this.config.enableFirebaseMonitoring) {
      console.log('📊 Firebase monitoring disabled by configuration');
      return;
    }

    try {
      console.log('📊 Initializing Firebase Service...');

      // Wait for Firebase to be initialized in index.html
      await this.waitForFirebaseAppInitialized();

      this.components.firebaseService = new FirebaseService();
      window.firebaseService = this.components.firebaseService;

      await this.components.firebaseService.initialize();

      if (this.components.firebaseService.isInitialized()) {
        this.components.firebaseService.trackPageView();
      } else {
        console.log('⚠️ Firebase Service initialized with limited functionality');
      }

    } catch (error) {
      console.error('❌ Failed to initialize Firebase Service:', error);
      this.handleComponentError('firebase_service', error);
    }
  }

  // Add this helper method
  async waitForFirebaseAppInitialized(maxWaitMs = 5000) {
    const interval = 100;
    let waited = 0;
    while (waited < maxWaitMs) {
      if (typeof firebase !== 'undefined') {
        try {
          firebase.app();
          return;
        } catch (e) {}
      }
      await new Promise(resolve => setTimeout(resolve, interval));
      waited += interval;
    }
    throw new Error('Timed out waiting for Firebase App to be initialized');
  }

  /**
   * Initialize Parameter Parser
   * @returns {Promise<void>}
   */
  async initializeParameterParser() {
    try {
      this.components.parameterParser = new ParameterParser();
    } catch (error) {
      console.error('❌ Failed to initialize Parameter Parser:', error);
      this.handleComponentError('parameter_parser', error);
    }
  }

  /**
   * Initialize Decryption Service
   * @returns {Promise<void>}
   */
  async initializeDecryptionService() {
    try {
      this.components.decryptionService = new DecryptionService();
      window.decryptionService = this.components.decryptionService;
      // Set encryption key from ENV_CONFIG if available
      if (window.ENV_CONFIG && window.ENV_CONFIG.decryption && window.ENV_CONFIG.decryption.encryptionKey) {
        this.components.decryptionService.setEncryptionKey(window.ENV_CONFIG.decryption.encryptionKey);
      }
      // 再次确保全局挂载
      window.decryptionService = this.components.decryptionService;
    } catch (error) {
      console.error('❌ Failed to initialize Decryption Service:', error);
      this.handleComponentError('decryption_service', error);
    }
  }

  /**
   * Initialize Display Controller
   * @returns {Promise<void>}
   */
  async initializeDisplayController() {
    try {
      this.components.displayController = new DisplayController();
      window.displayController = this.components.displayController;
    } catch (error) {
      console.error('❌ Failed to initialize DisplayController:', error);
      this.handleComponentError('display_controller', error);
    }
  }

  /**
   * Initialize Click Handler
   * @returns {Promise<void>}
   */
  async initializeClickHandler() {
    try {
      this.components.clickHandler = new ClickHandler();
      window.clickHandler = this.components.clickHandler;
    } catch (error) {
      console.error('❌ Failed to initialize Click Handler:', error);
      this.handleComponentError('click_handler', error);
    }
  }

  /**
   * Parse URL parameters and extract encrypted payload
   * @returns {Promise<Object>} Result object with success status and payload/error
   */
  async parseUrlParameters() {
    try {
      if (!this.components.parameterParser) {
        throw new Error('Parameter Parser not initialized');
      }

      const result = this.components.parameterParser.parseAndValidatePayload();

      if (result.success) {
        this.state.encryptedPayload = result.payload;

        // Track successful parameter parsing
        if (this.components.firebaseService) {
          this.components.firebaseService.trackUserInteraction('parameter_parsing', {
            success: true,
            payload_length: result.payload.length
          });
        }

        return { success: true, payload: result.payload };

      } else if (result.error === 'No encrypted payload found in URL parameters') {
        console.log('ℹ️ No encrypted payload in URL parameters');
        
        // Track no payload scenario
        if (this.components.firebaseService) {
          this.components.firebaseService.trackUserInteraction('parameter_parsing', {
            success: false,
            reason: 'no_payload'
          });
        }

        return { success: false, error: 'No encrypted payload provided. Please access this page with a valid encrypted payload parameter.' };

      } else {
        console.error('❌ Parameter parsing error:', result.error);
        
        // Track parameter parsing error
        if (this.components.firebaseService) {
          this.components.firebaseService.reportError(new Error(result.error), 'parameter_parsing');
        }

        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('❌ Failed to parse URL parameters:', error);
      return { success: false, error: 'Failed to parse URL parameters: ' + error.message };
    }
  }

  /**
   * Decrypt instruction set from encrypted payload
   * @param {string} encryptedPayload - The encrypted payload to decrypt
   * @returns {Promise<Object>} Result object with success status and instructionSet/error
   */
  async decryptInstructionSet(encryptedPayload) {
    try {
      if (!this.components.decryptionService) {
        console.error('Decryption Service is missing at decryptInstructionSet time. Current components:', this.components);
        throw new Error('Decryption Service not initialized');
      }

      const startTime = performance.now();
      
      const instructionSet = await this.components.decryptionService.decrypt(encryptedPayload);
      const processingTime = performance.now() - startTime;


      this.state.instructionSet = instructionSet;

      // Track successful decryption
      if (this.components.firebaseService) {
        this.components.firebaseService.trackDecryption(true, processingTime);
      }
      return { success: true, instructionSet: instructionSet };
    } catch (error) {
      console.error('❌ Failed to decrypt instruction set:', error.message);
      
      // Track decryption failure
      if (this.components.firebaseService) {
        this.components.firebaseService.trackDecryption(false, 0);
        this.components.firebaseService.reportError(error, 'decryption_service');
      }

      return { success: false, error: 'Failed to decrypt instruction payload: ' + error.message };
    }
  }

  /**
   * Load and display image from instruction set
   * @param {Object} instructionSet - The decrypted instruction set
   * @returns {Promise<Object>} Result object with success status and error if applicable
   */
  async loadAndDisplayImage(instructionSet) {
    try {
      if (!this.components.displayController) {
        throw new Error('Display Controller not initialized');
      }

      const imageUrl = instructionSet.image_url;
      const startTime = performance.now();
      
      await this.components.displayController.loadImage(imageUrl);
      const loadTime = performance.now() - startTime;
      
      // Track successful image load
      if (this.components.firebaseService) {
        this.components.firebaseService.trackImageLoad(imageUrl, loadTime, true);
      }

      // Update UI state
      this.updateUIState('image-ready');

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to load and display image:', error);
      
      // Track image load failure
      if (this.components.firebaseService) {
        this.components.firebaseService.trackImageLoad(instructionSet.image_url, 0, false);
        this.components.firebaseService.reportError(error, 'image_loading');
      }

      return { success: false, error: 'Failed to load image: ' + error.message };
    }
  }

  /**
   * Setup click handling with instruction set
   * @param {Object} instructionSet - The decrypted instruction set
   * @returns {Promise<Object>} Result object with success status and error if applicable
   */
  async setupClickHandling(instructionSet) {
    try {
      if (!this.components.clickHandler) {
        throw new Error('Click Handler not initialized');
      }

      // Initialize click handler with the decrypted instruction set
      this.components.clickHandler.initialize(instructionSet);
      
      // Log auto-click status for debugging
      if (instructionSet.auto_click) {
        const delay = instructionSet.auto_click_delay || 3000;
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to setup click handling:', error);
      return { success: false, error: 'Failed to initialize click functionality: ' + error.message };
    }
  }

  /**
   * Update UI state based on application phase
   * @param {string} state - The state to display
   * @param {string} message - Optional message for error state
   */
  updateUIState(state, message = '') {
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');

    switch (state) {
      case 'initializing':
        if (loadingState) {
          loadingState.style.display = 'block';
        }
        if (errorState) {
          errorState.style.display = 'none';
        }
        break;

      case 'image-ready':
        console.log('🖼️ Image loaded and displayed successfully');
        if (loadingState) {
          loadingState.style.display = 'none';
        }
        if (errorState) {
          errorState.style.display = 'none';
        }
        break;

      case 'ready_for_interaction':
        console.log('🎉 Application ready for user interaction');
        if (loadingState) {
          loadingState.style.display = 'none';
        }
        if (errorState) {
          errorState.style.display = 'none';
        }
        break;

      case 'error':
        console.error('💥 Error state:', message);
        if (loadingState) {
          loadingState.style.display = 'none';
        }
        if (errorMessage) {
          errorMessage.textContent = message || 'An error occurred during application initialization.';
        }
        if (errorState) {
          errorState.style.display = 'block';
        }
        break;

      case 'no-payload':
        console.log('📝 No encrypted payload provided');
        if (loadingState) {
          loadingState.style.display = 'none';
        }
        if (errorMessage) {
          errorMessage.textContent = 'Please access this page with an encrypted payload parameter.';
        }
        if (errorState) {
          errorState.style.display = 'block';
          // Change error icon to info icon
          const errorIcon = errorState.querySelector('.error-icon');
          if (errorIcon) {
            errorIcon.textContent = 'ℹ️';
          }
        }
        break;
    }
  }

  /**
   * Update current application phase
   * @param {string} phase - The current phase
   */
  updatePhase(phase) {
    this.state.currentPhase = phase;
  }

  /**
   * Handle initialization errors
   * @param {Error} error - The initialization error
   */
  handleInitializationError(error) {
    console.error('💥 Application initialization failed:', error);
    
    if (this.components.errorHandler) {
      this.components.errorHandler.handleError(error, 'application_initialization');
    } else {
      this.updateUIState('error', 'Application failed to initialize: ' + error.message);
    }

    // Report to Firebase if available
    if (this.components.firebaseService) {
      this.components.firebaseService.reportError(error, 'application_initialization');
    }
  }

  /**
   * Handle component initialization errors
   * @param {string} componentName - Name of the component that failed
   * @param {Error} error - The error that occurred
   */
  handleComponentError(componentName, error) {
    console.error(`💥 Component initialization failed: ${componentName}`, error);
    
    if (this.components.errorHandler) {
      this.components.errorHandler.handleError(error, `component_${componentName}`);
    }

    // Report to Firebase if available and not a Firebase error
    if (this.components.firebaseService && componentName !== 'firebase_service') {
      this.components.firebaseService.reportError(error, `component_${componentName}`);
    }
  }

  /**
   * Handle application flow errors
   * @param {string} phase - The phase where the error occurred
   * @param {string} errorMessage - The error message
   */
  handleFlowError(phase, errorMessage) {
    console.error(`💥 Application flow error in ${phase}:`, errorMessage);
    
    const error = new Error(errorMessage);
    
    if (this.components.errorHandler) {
      this.components.errorHandler.handleError(error, `flow_${phase}`);
    } else {
      this.updateUIState('error', errorMessage);
    }

    // Report to Firebase if available
    if (this.components.firebaseService) {
      this.components.firebaseService.reportError(error, `flow_${phase}`);
    }
  }

  /**
   * Track successful application completion
   */
  trackApplicationSuccess() {
    if (this.components.firebaseService) {
      this.components.firebaseService.trackUserInteraction('application_flow_complete', {
        success: true,
        has_auto_click: this.state.instructionSet?.auto_click || false,
        has_deeplink: !!this.state.instructionSet?.deeplink_url,
        has_click_url: !!this.state.instructionSet?.click_url,
        deeplink_priority: this.state.instructionSet?.deeplink_priority || false
      });
    }
  }

  /**
   * Get current application state
   * @returns {Object} Current application state
   */
  getState() {
    return {
      ...this.state,
      components: Object.keys(this.components).reduce((acc, key) => {
        acc[key] = !!this.components[key];
        return acc;
      }, {})
    };
  }

  /**
   * Clean up application resources
   */
  destroy() {
    // Clean up components
    if (this.components.clickHandler && typeof this.components.clickHandler.destroy === 'function') {
      this.components.clickHandler.destroy();
    }
    
    if (this.components.displayController && typeof this.components.displayController.destroy === 'function') {
      this.components.displayController.destroy();
    }

    // Clear references
    Object.keys(this.components).forEach(key => {
      this.components[key] = null;
    });

    // Clear global references
    if (typeof window !== 'undefined') {
      window.firebaseService = null;
      window.decryptionService = null;
      window.displayController = null;
      window.clickHandler = null;
      window.errorHandler = null;
      window.app = null;
    }
  }
}

// Application initialization
// 移除全局的 DOMContentLoaded 监听，统一在下方分支注册

// Detect if running in test-app.html and handle test payload generation (手动生成模式)
if (window.location.pathname.endsWith('test-app.html')) {
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has('payload')) {
    // 仅渲染表单，不执行主流程
    (async function setupTestPayloadUI() {
      // 动态加载 env-config.js（兜底）
      if (!window.ENV_CONFIG) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'env-config.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const testResults = document.getElementById('test-results');
      if (!testResults) return;
      testResults.innerHTML = `
        <h2>生成测试 payload</h2>
        <form id="payload-form">
          <label>标题: <input type="text" id="title" value="测试标题" style="width:80%"></label><br>
          <label>图片地址: <input type="text" id="image-url" value="https://dsp-material.advlove.io/upload/20230414/b906239c100cd2b8ababe97611381204.gif" style="width:80%"></label><br>
          <label>点击地址: <input type="text" id="click-url" value="https://play.google.com/store/apps/details?id=com.alibaba.aliexpresshd&gl=it" style="width:80%"></label><br>
          <label>deeplink_url: <input type="text" id="deeplink-url" value="" style="width:80%"></label><br>
          <label>auto_click: <input type="checkbox" id="auto-click"></label><br>
          <label>deeplink_priority: <input type="checkbox" id="deeplink-priority"></label><br>
          <label>auto_click_delay: <input type="number" id="auto-click-delay" min="0" step="1"></label><br>
          <button type="submit">生成测试 URL</button>
        </form>
        <div id="generated-url"></div>
      `;
      document.getElementById('payload-form').onsubmit = async function(e) {
        e.preventDefault();
        const instructionSet = {
          title: document.getElementById('title').value,
          image_url: document.getElementById('image-url').value,
          click_url: document.getElementById('click-url').value,
          deeplink_url: document.getElementById('deeplink-url').value || null,
          auto_click: document.getElementById('auto-click').checked,
          deeplink_priority: document.getElementById('deeplink-priority').checked,
          auto_click_delay: document.getElementById('auto-click-delay').value ? Number(document.getElementById('auto-click-delay').value) : null
        };
        try {
          const service = new DecryptionService();
          const encryptedPayload = await service.encrypt(instructionSet);
          const testUrl = `./index.html?payload=${encodeURIComponent(encryptedPayload)}`;
          document.getElementById('generated-url').innerHTML = `
            <p><strong>Instruction Set:</strong></p>
            <pre>${JSON.stringify(instructionSet, null, 2)}</pre>
            <p><strong>Encrypted Payload:</strong></p>
            <pre>${encryptedPayload}</pre>
            <p><strong>测试页面 URL:</strong></p>
            <a href="${testUrl}" target="_blank">${testUrl}</a>
            <br><br>
            <button onclick="window.open('${testUrl}', '_blank')">打开测试页面</button>
          `;
        } catch (error) {
          document.getElementById('generated-url').innerHTML = `<p style='color:red;'>加密失败: ${error.message}</p>`;
        }
      };
    })();
  } else {
    // 有 payload，注册主流程初始化监听
    document.addEventListener('DOMContentLoaded', async function () {
      try {
        const app = new App();
        window.app = app;
        await app.initialize();
      } catch (error) {
        console.error('❌ Failed to start application:', error);
        const errorState = document.getElementById('error-state');
        const errorMessage = document.getElementById('error-message');
        const loadingState = document.getElementById('loading-state');
        if (loadingState) loadingState.style.display = 'none';
        if (errorMessage) errorMessage.textContent = 'Critical application error. Please refresh the page.';
        if (errorState) errorState.style.display = 'block';
      }
    });
  }
} else {
  // 非 test-app.html，注册主流程初始化监听
  document.addEventListener('DOMContentLoaded', async function () {
    try {
      const app = new App();
      window.app = app;
      await app.initialize();
    } catch (error) {
      console.error('❌ Failed to start application:', error);
      const errorState = document.getElementById('error-state');
      const errorMessage = document.getElementById('error-message');
      const loadingState = document.getElementById('loading-state');
      if (loadingState) loadingState.style.display = 'none';
      if (errorMessage) errorMessage.textContent = 'Critical application error. Please refresh the page.';
      if (errorState) errorState.style.display = 'block';
    }
  });
}