/**
 * ClickHandler - Manages click events and URL routing logic
 * Handles user interactions, deeplink attempts, and URL routing with fallback logic
 */

class ClickHandler {
  constructor() {
    this.instructionSet = null;
    this.clickListenersSetup = false;
    this.autoClickTimer = null;
    this.isProcessingClick = false;
    
    // Configuration
    this.DEFAULT_AUTO_CLICK_DELAY = 3000; // 3 seconds default
    this.DEEPLINK_TIMEOUT = 2000; // 2 seconds timeout for deeplink attempts
  }

  /**
   * Initialize the click handler with instruction set
   * @param {InstructionSet} instructionSet - The decrypted instruction set
   */
  initialize(instructionSet) {
    if (!instructionSet || typeof instructionSet !== 'object') {
      throw new Error('Invalid instruction set provided to ClickHandler');
    }

    this.instructionSet = instructionSet;
    this.setupClickListeners();
    
    // Setup auto-click if enabled
    if (this.instructionSet.auto_click) {
      this.scheduleAutoClick();
    }
  }

  /**
   * Set up click event listeners for the page with enhanced cross-device support
   */
  setupClickListeners() {
    if (this.clickListenersSetup) {
      console.warn('Click listeners already set up');
      return;
    }

    try {
      // Enhanced event listener setup for cross-device compatibility
      const options = { passive: false, capture: false };
      
      // Mouse events for desktop
      document.body.addEventListener('click', this.handleClick.bind(this), options);
      document.body.addEventListener('mousedown', this.handleMouseDown.bind(this), options);
      document.body.addEventListener('mouseup', this.handleMouseUp.bind(this), options);
      
      // Touch events for mobile devices with better handling
      document.body.addEventListener('touchstart', this.handleTouchStart.bind(this), options);
      document.body.addEventListener('touchend', this.handleTouchEnd.bind(this), options);
      document.body.addEventListener('touchcancel', this.handleTouchCancel.bind(this), options);
      
      // Pointer events for modern browsers (unified touch/mouse)
      if (window.PointerEvent) {
        document.body.addEventListener('pointerdown', this.handlePointerDown.bind(this), options);
        document.body.addEventListener('pointerup', this.handlePointerUp.bind(this), options);
        document.body.addEventListener('pointercancel', this.handlePointerCancel.bind(this), options);
      }
      
      // Prevent context menu on long press for mobile
      document.body.addEventListener('contextmenu', this.handleContextMenu.bind(this), options);
      
      // Initialize interaction state tracking
      this.interactionState = {
        isMouseDown: false,
        isTouchActive: false,
        isPointerActive: false,
        lastInteractionType: null,
        touchStartTime: 0,
        touchStartPosition: { x: 0, y: 0 }
      };
      
      this.clickListenersSetup = true;
    } catch (error) {
      console.error('❌ Failed to set up click listeners:', error);
      throw new Error('Failed to initialize click event listeners');
    }
  }

  /**
   * Handle click events
   * @param {MouseEvent} event - The click event
   */
  async handleClick(event) {
    // Prevent default behavior
    event.preventDefault();
    
    // Avoid processing multiple clicks simultaneously
    if (this.isProcessingClick) {
      console.log('Click already being processed, ignoring...');
      return;
    }

    console.log('🖱️ Click event detected');
    await this.processClickAction('manual_click');
  }

  /**
   * Handle mouse down events
   * @param {MouseEvent} event - The mouse down event
   */
  handleMouseDown(event) {
    this.interactionState.isMouseDown = true;
    this.interactionState.lastInteractionType = 'mouse';
    console.log('🖱️ Mouse down detected');
  }

  /**
   * Handle mouse up events
   * @param {MouseEvent} event - The mouse up event
   */
  handleMouseUp(event) {
    this.interactionState.isMouseDown = false;
    console.log('🖱️ Mouse up detected');
  }

  /**
   * Handle touch start events for mobile devices
   * @param {TouchEvent} event - The touch start event
   */
  handleTouchStart(event) {
    // Record touch start details
    this.interactionState.isTouchActive = true;
    this.interactionState.lastInteractionType = 'touch';
    this.interactionState.touchStartTime = Date.now();
    
    if (event.touches && event.touches.length > 0) {
      this.interactionState.touchStartPosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
    
  }

  /**
   * Handle touch end events for mobile devices
   * @param {TouchEvent} event - The touch end event
   */
  async handleTouchEnd(event) {
    // Prevent default behavior to avoid duplicate click events
    event.preventDefault();
    
    // Check if this is a valid touch interaction
    if (!this.interactionState.isTouchActive) {
      return;
    }
    
    // Avoid processing multiple touches simultaneously
    if (this.isProcessingClick) {
      console.log('Touch already being processed, ignoring...');
      return;
    }

    // Calculate touch duration and movement
    const touchDuration = Date.now() - this.interactionState.touchStartTime;
    let touchMovement = 0;
    
    if (event.changedTouches && event.changedTouches.length > 0) {
      const endX = event.changedTouches[0].clientX;
      const endY = event.changedTouches[0].clientY;
      touchMovement = Math.sqrt(
        Math.pow(endX - this.interactionState.touchStartPosition.x, 2) +
        Math.pow(endY - this.interactionState.touchStartPosition.y, 2)
      );
    }
    
    // Reset touch state
    this.interactionState.isTouchActive = false;
    
    // Validate touch gesture (not too long, not too much movement)
    const MAX_TOUCH_DURATION = 2000; // 2 seconds
    const MAX_TOUCH_MOVEMENT = 30; // 30 pixels
    
    if (touchDuration > MAX_TOUCH_DURATION) {
      console.log('👆 Touch duration too long, ignoring');
      return;
    }
    
    if (touchMovement > MAX_TOUCH_MOVEMENT) {
      console.log('👆 Touch movement too large, ignoring');
      return;
    }

    console.log('👆 Valid touch end detected');
    await this.processClickAction('manual_touch');
  }

  /**
   * Handle touch cancel events
   * @param {TouchEvent} event - The touch cancel event
   */
  handleTouchCancel(event) {
    this.interactionState.isTouchActive = false;
    console.log('👆 Touch cancelled');
  }

  /**
   * Handle pointer down events (unified touch/mouse for modern browsers)
   * @param {PointerEvent} event - The pointer down event
   */
  handlePointerDown(event) {
    this.interactionState.isPointerActive = true;
    this.interactionState.lastInteractionType = 'pointer';
    console.log('👉 Pointer down detected:', event.pointerType);
  }

  /**
   * Handle pointer up events
   * @param {PointerEvent} event - The pointer up event
   */
  async handlePointerUp(event) {
    if (!this.interactionState.isPointerActive) {
      return;
    }
    
    // Avoid processing if already handling other interaction types
    if (this.isProcessingClick) {
      console.log('Pointer interaction already being processed, ignoring...');
      return;
    }
    
    this.interactionState.isPointerActive = false;
    
    // Only process pointer events if they're not duplicating touch/mouse events
    if (this.interactionState.lastInteractionType === 'pointer') {
      console.log('👉 Pointer up detected:', event.pointerType);
      await this.processClickAction(`manual_${event.pointerType}`);
    }
  }

  /**
   * Handle pointer cancel events
   * @param {PointerEvent} event - The pointer cancel event
   */
  handlePointerCancel(event) {
    this.interactionState.isPointerActive = false;
    console.log('👉 Pointer cancelled:', event.pointerType);
  }

  /**
   * Handle context menu events (prevent on mobile long press)
   * @param {Event} event - The context menu event
   */
  handleContextMenu(event) {
    // Prevent context menu on mobile devices to avoid interfering with touch interactions
    if (this.interactionState.lastInteractionType === 'touch') {
      event.preventDefault();
      console.log('📱 Context menu prevented for touch interaction');
    }
  }

  /**
   * Process the click action based on instruction set configuration
   * @param {string} actionType - Type of action ('manual_click', 'manual_touch', 'auto_click')
   */
  async processClickAction(actionType) {
    if (!this.instructionSet) {
      console.warn('⚠️ No instruction set available for click processing');
      return;
    }

    this.isProcessingClick = true;

    try {
      console.log(`🎯 Processing ${actionType} action...`);

      // Check if we have any URLs to work with
      if (!this.instructionSet.click_url && !this.instructionSet.deeplink_url) {
        console.log('ℹ️ No URLs configured - click action ignored');
        return;
      }

      // Determine routing logic based on deeplink priority
      if (this.instructionSet.deeplink_priority && this.instructionSet.deeplink_url) {
        console.log('🔗 Deeplink priority enabled - attempting deeplink first');
        await this.attemptDeeplinkWithFallback();
      } else if (this.instructionSet.click_url) {
        console.log('🌐 Direct click_url routing');
        this.openClickUrl(this.instructionSet.click_url);
      } else if (this.instructionSet.deeplink_url) {
        console.log('🔗 Only deeplink available - attempting deeplink');
        const success = await this.attemptDeeplinkOpen(this.instructionSet.deeplink_url);
        if (!success) {
          console.log('⚠️ Deeplink failed and no fallback click_url available');
        }
      }

      // Track the action if Firebase is available
      this.trackClickAction(actionType);

    } catch (error) {
      console.error('❌ Error processing click action:', error);
      this.handleClickError(error, actionType);
    } finally {
      this.isProcessingClick = false;
    }
  }

  /**
   * Attempt deeplink opening with fallback to click_url
   */
  async attemptDeeplinkWithFallback() {
    try {
      const deeplinkSuccess = await this.attemptDeeplinkOpen(this.instructionSet.deeplink_url);
      
      if (!deeplinkSuccess) {
        console.log('🔄 Deeplink failed - falling back to click_url');
        if (this.instructionSet.click_url) {
          this.openClickUrl(this.instructionSet.click_url);
        } else {
          console.warn('⚠️ No fallback click_url available');
        }
      }
    } catch (error) {
      console.error('❌ Error in deeplink with fallback:', error);
      // Still try fallback even if deeplink threw an error
      if (this.instructionSet.click_url) {
        console.log('🔄 Attempting fallback after deeplink error');
        this.openClickUrl(this.instructionSet.click_url);
      }
    }
  }

  /**
   * Attempt to open a deeplink URL
   * @param {string} deeplinkUrl - The deeplink URL to attempt
   * @returns {Promise<boolean>} True if deeplink was successfully opened
   */
  async attemptDeeplinkOpen(deeplinkUrl) {
    if (!deeplinkUrl || typeof deeplinkUrl !== 'string') {
      console.warn('⚠️ Invalid deeplink URL provided');
      return false;
    }

    return new Promise((resolve) => {
      console.log('🔗 Attempting to open deeplink:', deeplinkUrl);

      try {
        // Create a hidden iframe to attempt the deeplink
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = deeplinkUrl;
        document.body.appendChild(iframe);

        // Set up timeout to detect if deeplink failed
        const timeout = setTimeout(() => {
          console.log('⏰ Deeplink timeout - assuming failure');
          document.body.removeChild(iframe);
          resolve(false);
        }, this.DEEPLINK_TIMEOUT);

        // Try to detect if the app opened (this is tricky and not always reliable)
        const startTime = Date.now();
        
        // Check if page becomes hidden (app might have opened)
        const visibilityHandler = () => {
          if (document.hidden) {
            clearTimeout(timeout);
            document.removeEventListener('visibilitychange', visibilityHandler);
            document.body.removeChild(iframe);
            resolve(true);
          }
        };

        document.addEventListener('visibilitychange', visibilityHandler);

        // Alternative: check if page loses focus
        const blurHandler = () => {
          const timeDiff = Date.now() - startTime;
          if (timeDiff > 100) { // Small delay to avoid false positives
            clearTimeout(timeout);
            window.removeEventListener('blur', blurHandler);
            document.removeEventListener('visibilitychange', visibilityHandler);
            document.body.removeChild(iframe);
            resolve(true);
          }
        };

        window.addEventListener('blur', blurHandler);

      } catch (error) {
        console.error('❌ Error attempting deeplink:', error);
        resolve(false);
      }
    });
  }

  /**
   * Open click URL in the same window
   * @param {string} clickUrl - The URL to open
   */
  openClickUrl(clickUrl) {
    if (!clickUrl || typeof clickUrl !== 'string') {
      console.warn('⚠️ Invalid click URL provided');
      return;
    }

    try {
      console.log('🌐 Opening click URL in same window:', clickUrl);
      
      // Validate URL before opening
      new URL(clickUrl); // This will throw if URL is invalid
      
      // Open in same window as specified in requirements
      window.location.href = clickUrl;
      
    } catch (error) {
      console.error('❌ Failed to open click URL:', error);
      throw new Error(`Invalid click URL: ${clickUrl}`);
    }
  }

  /**
   * Schedule auto-click execution
   */
  scheduleAutoClick() {
    if (!this.instructionSet.auto_click) {
      return;
    }

    // Clear any existing auto-click timer
    if (this.autoClickTimer) {
      clearTimeout(this.autoClickTimer);
    }

    // Determine delay
    const delay = this.instructionSet.auto_click_delay || this.DEFAULT_AUTO_CLICK_DELAY;
    
    console.log(`⏰ Scheduling auto-click in ${delay}ms`);

    this.autoClickTimer = setTimeout(() => {
      console.log('🤖 Executing auto-click');
      this.processClickAction('auto_click');
    }, delay);
  }

  /**
   * Cancel scheduled auto-click
   */
  cancelAutoClick() {
    if (this.autoClickTimer) {
      clearTimeout(this.autoClickTimer);
      this.autoClickTimer = null;
      console.log('❌ Auto-click cancelled');
    }
  }

  /**
   * Track click action for analytics
   * @param {string} actionType - Type of action performed
   */
  trackClickAction(actionType) {
    try {
      // Track with Firebase if available
      if (typeof window !== 'undefined' && window.firebaseService) {
        const targetUrl = this.instructionSet.deeplink_priority && this.instructionSet.deeplink_url 
          ? this.instructionSet.deeplink_url 
          : this.instructionSet.click_url;
        
        const isDeeplink = this.instructionSet.deeplink_priority && this.instructionSet.deeplink_url;
        
        window.firebaseService.trackClick(actionType, targetUrl, isDeeplink);
      }

      // Log for debugging
      console.log('📊 Click action tracked:', {
        action_type: actionType,
        has_deeplink: !!this.instructionSet.deeplink_url,
        has_click_url: !!this.instructionSet.click_url,
        deeplink_priority: this.instructionSet.deeplink_priority,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Failed to track click action:', error);
    }
  }

  /**
   * Handle click processing errors
   * @param {Error} error - The error that occurred
   * @param {string} actionType - Type of action that failed
   */
  handleClickError(error, actionType) {
    console.error(`❌ Click handler error for ${actionType}:`, error);

    // Report error to Firebase if available
    if (typeof window !== 'undefined' && window.firebaseService) {
      window.firebaseService.reportError(error, `click_handler_${actionType}`);
    }

    // Show user-friendly error message
    this.showErrorMessage('Navigation failed. Please try again.');
  }

  /**
   * Show error message to user
   * @param {string} message - Error message to display
   */
  showErrorMessage(message) {
    try {
      // Try to update existing error display
      const errorElement = document.getElementById('error-message');
      if (errorElement) {
        errorElement.textContent = message;
        const errorState = document.getElementById('error-state');
        if (errorState) {
          errorState.style.display = 'block';
        }
      } else {
        // Create temporary error display
        console.error('Error display element not found, logging error:', message);
      }
    } catch (error) {
      console.error('Failed to show error message:', error);
    }
  }

  /**
   * Clean up resources and event listeners
   */
  destroy() {
    // Cancel auto-click timer
    this.cancelAutoClick();

    // Remove all event listeners
    if (this.clickListenersSetup) {
      const options = { passive: false, capture: false };
      
      // Remove mouse event listeners
      document.body.removeEventListener('click', this.handleClick.bind(this), options);
      document.body.removeEventListener('mousedown', this.handleMouseDown.bind(this), options);
      document.body.removeEventListener('mouseup', this.handleMouseUp.bind(this), options);
      
      // Remove touch event listeners
      document.body.removeEventListener('touchstart', this.handleTouchStart.bind(this), options);
      document.body.removeEventListener('touchend', this.handleTouchEnd.bind(this), options);
      document.body.removeEventListener('touchcancel', this.handleTouchCancel.bind(this), options);
      
      // Remove pointer event listeners if supported
      if (window.PointerEvent) {
        document.body.removeEventListener('pointerdown', this.handlePointerDown.bind(this), options);
        document.body.removeEventListener('pointerup', this.handlePointerUp.bind(this), options);
        document.body.removeEventListener('pointercancel', this.handlePointerCancel.bind(this), options);
      }
      
      // Remove context menu listener
      document.body.removeEventListener('contextmenu', this.handleContextMenu.bind(this), options);
      
      this.clickListenersSetup = false;
    }

    // Clear references and state
    this.instructionSet = null;
    this.isProcessingClick = false;
    this.interactionState = null;

    console.log('🧹 ClickHandler destroyed and cleaned up');
  }
}

// Export for use in other modules and tests
export default ClickHandler;

// Make available globally for browser usage
if (typeof window !== 'undefined') {
  window.ClickHandler = ClickHandler;
}