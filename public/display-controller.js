/**
 * DisplayController - Handles image loading, scaling, and responsive display
 * 
 * This class manages the display of images using CSS background-image with automatic scaling 
 * to fill the viewport, handles orientation changes, and provides error handling for image 
 * loading failures. The background-image approach provides better cross-origin compatibility.
 */

class DisplayController {
  constructor() {
    this.currentImage = null;
    this.imageContainer = null;
    this.displayImage = null;
    this.isImageLoaded = false;
    this.orientationChangeHandler = null;
    this.resizeHandler = null;

    this.initialize();
  }

  /**
   * Initialize the display controller
   */
  initialize() {
    // Get DOM elements
    this.imageContainer = document.getElementById('image-container');
    this.displayImage = document.getElementById('display-image');

    if (!this.imageContainer || !this.displayImage) {
      throw new Error('Required DOM elements not found: image-container or display-image');
    }

    // Detect browser capabilities and apply specific fixes
    this.detectBrowserCapabilities();

    // Set up event listeners for orientation and resize changes
    this.setupEventListeners();
  }

  /**
   * Detect browser capabilities and apply specific fixes
   */
  detectBrowserCapabilities() {
    // Create browser detection object
    this.browser = {
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
      isAndroid: /Android/.test(navigator.userAgent),
      isFirefox: /Firefox/.test(navigator.userAgent),
      isEdge: /Edge\/|Edg\//.test(navigator.userAgent),
      isIE: /Trident\/|MSIE/.test(navigator.userAgent),
      isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      isChrome: /Chrome/.test(navigator.userAgent) && !/Edge\/|Edg\//.test(navigator.userAgent),
      isHighDPI: window.devicePixelRatio > 1.5,
      supportsBackgroundSize: typeof document.documentElement.style.backgroundSize !== 'undefined',
      supportsFlex: typeof document.documentElement.style.flexGrow !== 'undefined' ||
        typeof document.documentElement.style.webkitFlexGrow !== 'undefined',
      supportsTransform: typeof document.documentElement.style.transform !== 'undefined' ||
        typeof document.documentElement.style.webkitTransform !== 'undefined' ||
        typeof document.documentElement.style.mozTransform !== 'undefined' ||
        typeof document.documentElement.style.msTransform !== 'undefined',
      prefersReducedMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };

    // Log browser capabilities for debugging
    console.log('🌐 Browser capabilities detected:', this.browser);

    // Apply specific fixes based on browser detection
    this.applyBrowserSpecificFixes();
  }

  /**
   * Apply browser-specific fixes based on detected capabilities
   */
  applyBrowserSpecificFixes() {
    // Apply fixes to the display element with background image
    if (this.displayImage) {
      // Apply hardware acceleration for all browsers
      this.displayImage.style.transform = 'translateZ(0)';

      // Apply vendor prefixes for hardware acceleration
      if (typeof this.displayImage.style.webkitTransform !== 'undefined') {
        this.displayImage.style.webkitTransform = 'translateZ(0)';
      }
      if (typeof this.displayImage.style.mozTransform !== 'undefined') {
        this.displayImage.style.mozTransform = 'translateZ(0)';
      }
      if (typeof this.displayImage.style.msTransform !== 'undefined') {
        this.displayImage.style.msTransform = 'translateZ(0)';
      }

      // Apply fallbacks for browsers that don't support background-size
      if (!this.browser.supportsBackgroundSize) {
        console.log('⚠️ Browser does not support background-size, applying fallbacks');
        this.displayImage.style.maxWidth = '100%';
        this.displayImage.style.maxHeight = '100%';
        this.displayImage.style.backgroundPosition = 'center center';
      }

      // Apply fallbacks for browsers that don't support flexbox
      if (!this.browser.supportsFlex && this.imageContainer) {
        console.log('⚠️ Browser does not support flexbox, applying fallbacks');
        this.imageContainer.style.position = 'absolute';
        this.imageContainer.style.top = '0';
        this.imageContainer.style.left = '0';
        this.imageContainer.style.width = '100%';
        this.imageContainer.style.height = '100%';
        this.imageContainer.style.textAlign = 'center';

        this.displayImage.style.position = 'absolute';
        this.displayImage.style.top = '50%';
        this.displayImage.style.left = '50%';

        if (this.browser.supportsTransform) {
          this.displayImage.style.transform = 'translate(-50%, -50%)';

          // Apply vendor prefixes for transform
          if (typeof this.displayImage.style.webkitTransform !== 'undefined') {
            this.displayImage.style.webkitTransform = 'translate(-50%, -50%)';
          }
          if (typeof this.displayImage.style.mozTransform !== 'undefined') {
            this.displayImage.style.mozTransform = 'translate(-50%, -50%)';
          }
          if (typeof this.displayImage.style.msTransform !== 'undefined') {
            this.displayImage.style.msTransform = 'translate(-50%, -50%)';
          }
        } else {
          // Extreme fallback for very old browsers
          this.displayImage.style.top = '0';
          this.displayImage.style.left = '0';
          this.displayImage.style.right = '0';
          this.displayImage.style.bottom = '0';
          this.displayImage.style.margin = 'auto';
        }
      }

      // Disable transitions for users who prefer reduced motion
      if (this.browser.prefersReducedMotion) {
        this.displayImage.style.transition = 'none';
        if (typeof this.displayImage.style.webkitTransition !== 'undefined') {
          this.displayImage.style.webkitTransition = 'none';
        }
        if (typeof this.displayImage.style.mozTransition !== 'undefined') {
          this.displayImage.style.mozTransition = 'none';
        }
      }
    }
  }

  /**
   * Set up event listeners for responsive behavior with enhanced cross-device support
   * and optimized performance
   */
  setupEventListeners() {
    // Use a single optimized resize handler for all resize-related events
    // This reduces duplicate work and improves performance
    this.universalResizeHandler = this.optimizedResizeHandler(() => {
      if (this.isImageLoaded && this.currentImage) {
        this.handleResponsiveResize();
      }
    });

    // Add event listeners with enhanced browser support
    // Use passive listeners for better scroll performance
    window.addEventListener('resize', this.universalResizeHandler, { passive: true });

    // Use a more efficient approach for orientation changes
    if (window.matchMedia) {
      // Use matchMedia for orientation detection instead of multiple event listeners
      const orientationMediaQuery = window.matchMedia("(orientation: portrait)");

      // Check if the newer addEventListener API is available
      if (orientationMediaQuery.addEventListener) {
        orientationMediaQuery.addEventListener('change', this.universalResizeHandler);
      } else if (orientationMediaQuery.addListener) {
        // Fallback for older browsers
        orientationMediaQuery.addListener(this.universalResizeHandler);
      }
    } else {
      // Fallback to orientationchange event
      window.addEventListener('orientationchange', this.universalResizeHandler, { passive: true });
    }

    // Visual viewport API support (modern mobile browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.universalResizeHandler, { passive: true });
    }

    // Screen orientation API (modern browsers)
    if (screen.orientation) {
      screen.orientation.addEventListener('change', this.universalResizeHandler, { passive: true });
    }

    // Simplified fullscreen change handling
    this.fullscreenChangeHandler = this.universalResizeHandler;

    // Add fullscreen event listeners with vendor prefixes
    const fullscreenEvents = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ];

    fullscreenEvents.forEach(event => {
      document.addEventListener(event, this.fullscreenChangeHandler, { passive: true });
    });

    // Add visibility change listener to handle tab switching
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isImageLoaded && this.currentImage) {
        // When tab becomes visible again, check if resize is needed
        // Use requestAnimationFrame to ensure it happens on next paint
        requestAnimationFrame(() => this.handleResponsiveResize());
      }
    }, { passive: true });
  }

  /**
   * Create an optimized resize handler with debouncing and throttling
   * @param {Function} callback - Function to call on resize
   * @returns {Function} Optimized resize handler
   */
  optimizedResizeHandler(callback) {
    let timeout;
    let lastExecuted = 0;
    const throttleDelay = 100; // Only execute at most once per 100ms during rapid events

    return function () {
      const now = Date.now();

      // Clear any existing timeout
      clearTimeout(timeout);

      // If we're within the throttle window, set a timeout
      if (now - lastExecuted < throttleDelay) {
        timeout = setTimeout(() => {
          lastExecuted = Date.now();
          callback();
        }, throttleDelay);
      } else {
        // Otherwise execute immediately
        lastExecuted = now;
        callback();
      }
    };
  }

  /**
   * Debounce function to limit rapid successive calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Handle responsive resize with enhanced viewport detection and performance optimizations
   */
  handleResponsiveResize() {
    // Skip if no image is loaded
    if (!this.isImageLoaded || !this.currentImage) {
      return;
    }

    // Use requestAnimationFrame for smoother rendering
    if (!this._resizeAnimationFrame) {
      this._resizeAnimationFrame = requestAnimationFrame(() => {
        this._performResponsiveResize();
        this._resizeAnimationFrame = null;
      });
    }
  }

  /**
   * Perform the actual resize calculations and updates
   * Separated to improve performance and readability
   */
  _performResponsiveResize() {
    try {
      const startTime = performance.now();

      // Get current viewport dimensions with fallbacks
      const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

      // Skip if dimensions haven't changed significantly (within 5px)
      if (this._lastViewportWidth && this._lastViewportHeight &&
        Math.abs(this._lastViewportWidth - viewportWidth) < 5 &&
        Math.abs(this._lastViewportHeight - viewportHeight) < 5) {
        return;
      }

      // Store current dimensions for future comparison
      this._lastViewportWidth = viewportWidth;
      this._lastViewportHeight = viewportHeight;

      // Update window dimensions for calculation
      const originalInnerWidth = window.innerWidth;
      const originalInnerHeight = window.innerHeight;

      // Temporarily update for calculation if using visual viewport
      if (window.visualViewport) {
        window.innerWidth = viewportWidth;
        window.innerHeight = viewportHeight;
      }

      // Recalculate and apply scaling
      const scaling = this.calculateScaling(this.currentImage);
      this.applyImageScaling(this.currentImage, scaling);

      // Restore original dimensions
      if (window.visualViewport) {
        window.innerWidth = originalInnerWidth;
        window.innerHeight = originalInnerHeight;
      }

      // Track performance in a non-blocking way
      const resizeTime = performance.now() - startTime;
      if (window.imagePerformanceMonitor) {
        window.imagePerformanceMonitor.recordRenderTime(resizeTime);
      }

      // Log only in debug mode to reduce console noise
      if (this.isDebugMode()) {
        console.log('📱 Responsive resize handled:', {
          viewport: `${viewportWidth}x${viewportHeight}`,
          scale: scaling.scale,
          time: `${resizeTime.toFixed(2)}ms`
        });
      }

    } catch (error) {
      console.error('❌ Error handling responsive resize:', error);
    }
  }

  /**
   * Preload an image for faster display with background-image approach
   * @param {string} imageUrl - URL of the image to preload
   * @returns {Promise<Object>} Promise that resolves with the preloaded image info
   */
  async preloadImage(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid image URL provided');
    }

    // Check if image is already in cache
    if (this.imageCache && this.imageCache.has(imageUrl)) {
      console.log('🚀 Using cached image:', imageUrl.substring(0, 50) + '...');
      const cachedImage = this.imageCache.get(imageUrl);
      return Promise.resolve({
        url: imageUrl,
        element: cachedImage,
        naturalWidth: cachedImage.width,
        naturalHeight: cachedImage.height,
        aspectRatio: cachedImage.width / cachedImage.height,
        loadTime: 0,
        fromCache: true
      });
    }

    return new Promise((resolve, reject) => {
      const image = new Image();

      // Set up performance monitoring
      const startTime = performance.now();

      // Use requestIdleCallback for non-critical operations if available
      const scheduleNonCriticalTask = (callback) => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(callback, { timeout: 1000 });
        } else {
          setTimeout(callback, 1);
        }
      };

      image.onload = () => {
        const loadTime = performance.now() - startTime;

        // Validate image dimensions
        if (image.naturalWidth === 0 || image.naturalHeight === 0) {
          reject(new Error('Invalid image: zero dimensions'));
          return;
        }

        // Log performance metrics in non-blocking way
        scheduleNonCriticalTask(() => {
          console.log(`📊 Image preloaded in ${loadTime.toFixed(2)}ms:`, {
            url: imageUrl.substring(0, 50) + '...',
            dimensions: `${image.naturalWidth}x${image.naturalHeight}`,
            size: this.estimateImageSize(image),
            backgroundImage: true // Flag that this is for background-image usage
          });

          // Track performance metrics if available
          if (window.firebaseService && typeof window.firebaseService.trackPerformance === 'function') {
            window.firebaseService.trackPerformance('image_preload_time', loadTime);
          }
        });

        // Create image info object with optimized properties
        const imageInfo = {
          url: imageUrl,
          element: image,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          aspectRatio: image.naturalWidth / image.naturalHeight,
          loadTime: loadTime
        };

        // Cache the image in a non-blocking way
        scheduleNonCriticalTask(() => {
          this.cacheImage(imageInfo);
        });

        resolve(imageInfo);
      };

      image.onerror = (event) => {
        const loadTime = performance.now() - startTime;

        // Enhanced error detection for background images
        let errorMessage = `Failed to preload image from URL: ${imageUrl}`;
        let errorType = 'unknown';

        // Detect specific error types for better error handling
        if (event && event.type === 'error') {
          // Check if the error is likely due to CORS issues
          if (this.isCrossOriginUrl(imageUrl)) {
            errorType = 'cors';
            errorMessage = `Cross-origin image load failed: ${imageUrl}`;
          }

          // Check if the error is likely due to network issues
          if (navigator.onLine === false) {
            errorType = 'network';
            errorMessage = `Network error loading image: ${imageUrl}`;
          }

          // Check for invalid image format
          if (image.naturalWidth === 0 || image.naturalHeight === 0) {
            errorType = 'format';
            errorMessage = `Invalid image format: ${imageUrl}`;
          }
        }

        console.error(`❌ Image preload failed after ${loadTime.toFixed(2)}ms:`, {
          url: imageUrl,
          errorType: errorType,
          message: errorMessage
        });

        const error = new Error(errorMessage);
        error.type = errorType;
        error.url = imageUrl;
        error.loadTime = loadTime;

        reject(error);
      };

      // Set timeout for loading with progressive retry
      const timeout = setTimeout(() => {
        if (!image.complete) {
          const error = new Error(`Image preload timeout: ${imageUrl}`);
          error.type = 'timeout';
          error.url = imageUrl;
          reject(error);
        }
      }, 10000); // Reduced timeout from 15s to 10s for better user experience

      // Clear timeout on completion
      image.addEventListener('load', () => clearTimeout(timeout), { once: true });
      image.addEventListener('error', () => clearTimeout(timeout), { once: true });

      // Apply optimized loading attributes
      image.decoding = 'async'; // Use async decoding for better performance
      image.loading = 'eager'; // Prioritize loading
      image.fetchPriority = 'high'; // Use high fetch priority for critical images

      // Add importance hint for resource prioritization if supported
      if ('importance' in image) {
        image.importance = 'high';
      }

      // Start preloading
      image.src = imageUrl;
    });
  }

  /**
   * Check if a URL is from a different origin than the current page
   * @param {string} url - URL to check
   * @returns {boolean} True if the URL is from a different origin
   */
  isCrossOriginUrl(url) {
    try {
      // Parse the URL
      const parsedUrl = new URL(url);

      // Compare with current origin
      return parsedUrl.origin !== window.location.origin;
    } catch (error) {
      // If URL parsing fails, assume it's not cross-origin
      return false;
    }
  }

  /**
   * Load and display an image with performance optimizations using background-image approach
   * @param {string} imageUrl - URL of the image to load
   * @returns {Promise<Object>} Promise that resolves with the loaded image info
   */
  async loadImage(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid image URL provided');
    }

    try {
      // Mark the start of image loading for performance tracking
      if (window.performance && window.performance.mark) {
        window.performance.mark('image-load-start');
      }

      const startTime = performance.now();

      // Show loading state immediately for better perceived performance
      this.showLoadingState();

      // Use preload for better performance
      const imageInfo = await this.preloadImage(imageUrl);

      // Store reference and update state
      this.currentImage = imageInfo;
      this.isImageLoaded = true;

      // Calculate scaling
      const scaling = this.calculateScaling(imageInfo);

      // Apply optimized rendering approach
      if (imageInfo.fromCache) {
        // For cached images, apply immediately for instant display
        this.applyImageScaling(imageInfo, scaling);
        this.setBackgroundImageWithFallbacks(imageUrl);
        this.displayImage.style.display = 'block';
      } else {
        // For new images, use requestAnimationFrame for smoother rendering
        window.requestAnimationFrame(() => {
          this.applyImageScaling(imageInfo, scaling);
          this.setBackgroundImageWithFallbacks(imageUrl);
          this.displayImage.style.display = 'block';
        });
      }

      // Hide loading state
      this.hideLoadingState();

      // Calculate total time
      const totalTime = performance.now() - startTime;

      // Mark the end of image loading for performance tracking
      if (window.performance && window.performance.mark) {
        window.performance.mark('image-load-end');
        window.performance.measure('image-load-time', 'image-load-start', 'image-load-end');
      }

      // Log performance in a non-blocking way
      setTimeout(() => {
        // Track with performance monitor
        if (window.imagePerformanceMonitor) {
          window.imagePerformanceMonitor.recordLoadTime(totalTime, !!imageInfo.fromCache);
        }

        // Log only in debug mode or for slow loads
        if (this.isDebugMode() || totalTime > 1000) {
          console.log(`✅ Image loaded and displayed in ${totalTime.toFixed(2)}ms using background-image`);
        }

        // Track performance metrics
        if (window.firebaseService) {
          window.firebaseService.trackPerformance('image_load_time', totalTime);

          // Track additional metrics
          window.firebaseService.trackPerformance('image_display_time', totalTime);
          if (imageInfo.fromCache) {
            window.firebaseService.trackPerformance('image_cache_hit', 1);
          }
        }

        // Report to performance API if available
        if (window.performance && window.performance.getEntriesByName) {
          const measures = window.performance.getEntriesByName('image-load-time');
          if (measures.length > 0) {
            const apiMeasurement = measures[0].duration;

            // Track with performance monitor
            if (window.imagePerformanceMonitor) {
              window.imagePerformanceMonitor.recordRenderTime(apiMeasurement);
            }

            if (this.isDebugMode()) {
              console.log(`📊 Performance API measurement: ${apiMeasurement.toFixed(2)}ms`);
            }
          }
        }

        // Generate performance report periodically
        if (window.imagePerformanceMonitor && Math.random() < 0.1) { // 10% chance to log report
          const report = window.imagePerformanceMonitor.getReport();

          // Send report to Firebase if available
          if (window.firebaseService && typeof window.firebaseService.logEvent === 'function') {
            window.firebaseService.logEvent('background_image_performance', report);
          }
        }
      }, 0);

      return imageInfo;

    } catch (error) {
      this.handleImageLoadError(error);
      throw error;
    }
  }

  /**
   * Show loading state in the UI
   */
  showLoadingState() {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
      loadingState.style.display = 'block';
    }

    // Hide any previous error state
    this.hideErrorState();
  }

  /**
   * Hide loading state in the UI
   */
  hideLoadingState() {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
      loadingState.style.display = 'none';
    }
  }

  /**
   * Estimate image file size for performance monitoring
   * @param {HTMLImageElement} image - The image to estimate size for
   * @returns {string} Estimated size description
   */
  estimateImageSize(image) {
    const pixels = image.naturalWidth * image.naturalHeight;
    if (pixels > 2000000) return 'Large (>2MP)';
    if (pixels > 500000) return 'Medium (0.5-2MP)';
    return 'Small (<0.5MP)';
  }

  /**
   * Cache image for better performance
   * @param {Object} imageInfo - The image info object to cache
   */
  cacheImage(imageInfo) {
    try {
      // Skip caching if already cached
      if (this.imageCache && this.imageCache.has(imageInfo.url)) {
        return;
      }

      // Get the preloaded image from imageInfo
      const image = imageInfo.element;

      if (!image || !image.complete) {
        console.warn('⚠️ Cannot cache incomplete image');
        return;
      }

      // Initialize cache if needed
      if (!this.imageCache) {
        this.imageCache = new Map();
      }

      // Implement LRU (Least Recently Used) cache strategy
      // Limit cache size based on device memory if available
      const maxCacheSize = this.getOptimalCacheSize();

      // If cache is full, remove least recently used items
      if (this.imageCache.size >= maxCacheSize) {
        const oldestKey = this.imageCache.keys().next().value;
        this.imageCache.delete(oldestKey);
      }

      // For smaller images, store the image directly
      if (imageInfo.naturalWidth * imageInfo.naturalHeight < 500000) { // Less than 0.5MP
        this.imageCache.set(imageInfo.url, image);
        return;
      }

      // For larger images, use canvas to potentially reduce memory usage
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: !this.isOpaqueImage(image) });

      // Calculate optimal dimensions for caching
      const maxDimension = this.getOptimalCacheDimension();
      const scale = Math.min(1, maxDimension / Math.max(imageInfo.naturalWidth, imageInfo.naturalHeight));

      canvas.width = Math.round(imageInfo.naturalWidth * scale);
      canvas.height = Math.round(imageInfo.naturalHeight * scale);

      // Use image smoothing for downscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw image to canvas for caching
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      // Store in memory cache
      this.imageCache.set(imageInfo.url, canvas);

    } catch (error) {
      console.warn('⚠️ Image caching failed:', error);
    }
  }

  /**
   * Determine if an image is likely opaque (no transparency)
   * @param {HTMLImageElement} image - The image to check
   * @returns {boolean} True if the image is likely opaque
   */
  isOpaqueImage(image) {
    // Check image URL for formats that typically don't support transparency
    const url = image.src.toLowerCase();
    return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.bmp');
  }

  /**
   * Get optimal cache size based on device memory
   * @returns {number} Maximum number of images to cache
   */
  getOptimalCacheSize() {
    // Use navigator.deviceMemory if available (Chrome)
    if (navigator.deviceMemory) {
      // Scale cache size based on available memory
      // deviceMemory is in GB, ranges from 0.25 to 8
      return Math.max(2, Math.min(10, Math.floor(navigator.deviceMemory * 2)));
    }

    // Default cache size if deviceMemory is not available
    return 5;
  }

  /**
   * Get optimal dimension for cached images based on device
   * @returns {number} Maximum dimension in pixels
   */
  getOptimalCacheDimension() {
    // Use smaller dimensions for mobile devices
    if (this.browser && (this.browser.isIOS || this.browser.isAndroid)) {
      return 1280; // 720p equivalent for mobile
    }

    // Use smaller dimensions for low memory devices
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      return 1280;
    }

    // Default for desktop/high-memory devices
    return 1920; // 1080p equivalent
  }

  /**
   * Calculate scaling parameters for an image to fit the viewport
   * @param {Object} imageInfo - The image info object to calculate scaling for
   * @returns {Object} Scaling parameters object
   */
  calculateScaling(imageInfo) {
    // Check if we have a valid imageInfo object
    if (!imageInfo || !imageInfo.naturalWidth || !imageInfo.naturalHeight) {
      throw new Error('Invalid image info provided for scaling calculation');
    }

    // Use cached scaling if viewport hasn't changed
    if (this._lastScalingInfo &&
      this._lastScalingInfo.imageUrl === imageInfo.url &&
      this._lastScalingInfo.viewportWidth === window.innerWidth &&
      this._lastScalingInfo.viewportHeight === window.innerHeight) {
      return this._lastScalingInfo.scaling;
    }

    // Get current viewport dimensions using visual viewport API if available
    const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    // Get image natural dimensions
    const imageWidth = imageInfo.naturalWidth;
    const imageHeight = imageInfo.naturalHeight;

    // Calculate aspect ratios
    const imageAspectRatio = imageWidth / imageHeight;
    const viewportAspectRatio = viewportWidth / viewportHeight;

    // Optimize calculation by using integer math where possible
    let scaledWidth, scaledHeight;
    let backgroundSize = 'contain'; // Default to contain

    // Determine scaling to fit viewport while maintaining aspect ratio
    if (Math.abs(imageAspectRatio - viewportAspectRatio) < 0.01) {
      // If aspect ratios are very close, use 'cover' for better visual appearance
      backgroundSize = 'cover';
      scaledWidth = viewportWidth;
      scaledHeight = viewportHeight;
    } else if (imageAspectRatio > viewportAspectRatio) {
      // Image is wider than viewport ratio - fit to width
      scaledWidth = viewportWidth;
      scaledHeight = Math.round(viewportWidth / imageAspectRatio);
    } else {
      // Image is taller than viewport ratio - fit to height
      scaledHeight = viewportHeight;
      scaledWidth = Math.round(viewportHeight * imageAspectRatio);
    }

    // Calculate scale factor
    const scaleX = scaledWidth / imageWidth;
    const scaleY = scaledHeight / imageHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calculate final dimensions (round to avoid subpixel rendering issues)
    const finalWidth = Math.round(imageWidth * scale);
    const finalHeight = Math.round(imageHeight * scale);

    // Calculate centering offsets
    const offsetX = Math.round((viewportWidth - finalWidth) / 2);
    const offsetY = Math.round((viewportHeight - finalHeight) / 2);

    // Create scaling object with optimized properties
    const scaling = {
      width: finalWidth,
      height: finalHeight,
      scale: scale,
      offsetX: offsetX,
      offsetY: offsetY,
      transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
      originalWidth: imageWidth,
      originalHeight: imageHeight,
      viewportWidth: viewportWidth,
      viewportHeight: viewportHeight,
      // Background image specific properties
      backgroundSize: backgroundSize,
      backgroundPosition: 'center',
      isBackgroundImage: true
    };

    // Cache the scaling result for potential reuse
    this._lastScalingInfo = {
      imageUrl: imageInfo.url,
      viewportWidth: viewportWidth,
      viewportHeight: viewportHeight,
      scaling: scaling
    };

    return scaling;
  }

  /**
   * Apply scaling parameters to the display element using background-image approach
   * @param {Object} imageInfo - The image info object
   * @param {Object} scaling - Scaling parameters from calculateScaling
   */
  applyImageScaling(imageInfo, scaling) {
    if (!imageInfo || !scaling) {
      throw new Error('Invalid image info or scaling parameters provided');
    }

    // Apply scaling to the display element with background image
    const displayElement = this.displayImage;

    // Skip unnecessary style updates if nothing has changed
    // This prevents layout thrashing and improves performance
    if (this._lastAppliedScaling &&
      this._lastAppliedScaling.backgroundSize === scaling.backgroundSize &&
      this._lastAppliedScaling.backgroundPosition === scaling.backgroundPosition) {
      // Only update if needed
      return;
    }

    // Use batch style updates to minimize reflows
    // Create a style object first, then apply all at once
    const styles = {
      backgroundSize: scaling.backgroundSize || 'contain',
      backgroundPosition: scaling.backgroundPosition || 'center',
      backgroundRepeat: 'no-repeat',
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: '0',
      left: '0',
      display: 'block',
      opacity: '1'
    };

    // Apply all styles at once to minimize reflows
    Object.assign(displayElement.style, styles);

    // Apply device-specific optimizations only if needed
    if (!this._deviceOptimizationsApplied) {
      this.applyDeviceSpecificOptimizations(displayElement);
      this._deviceOptimizationsApplied = true;
    }

    // Store last applied scaling for future comparison
    this._lastAppliedScaling = {
      backgroundSize: scaling.backgroundSize,
      backgroundPosition: scaling.backgroundPosition
    };

    // Log scaling information in a non-blocking way
    if (this.isDebugMode()) {
      setTimeout(() => {
        console.log('🖼️ Applied background-image scaling:', {
          viewport: `${scaling.viewportWidth}x${scaling.viewportHeight}`,
          image: `${scaling.originalWidth}x${scaling.originalHeight}`,
          backgroundSize: scaling.backgroundSize
        });
      }, 0);
    }
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} True if debug mode is enabled
   */
  isDebugMode() {
    // Check for debug mode in URL parameters or localStorage
    return window.location.search.includes('debug=true') ||
      localStorage.getItem('debug') === 'true';
  }

  /**
   * Apply device-specific optimizations for background images
   * @param {HTMLElement} element - The display element
   */
  applyDeviceSpecificOptimizations(element) {
    // iOS Safari specific optimizations
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      // Fix for iOS Safari rendering issues
      element.style.webkitBackfaceVisibility = 'hidden';
      element.style.webkitPerspective = '1000';
      element.style.webkitTransform = 'translate3d(0, 0, 0)';
      element.style.webkitOverflowScrolling = 'touch';

      // Fix for iOS full height issues
      if (document.documentElement) {
        document.documentElement.style.height = '-webkit-fill-available';
      }
    }

    // High DPI screen optimizations
    if (window.devicePixelRatio > 1.5) {
      // Improve rendering on high DPI screens
      element.style.imageRendering = '-webkit-optimize-contrast';

      // Add vendor prefixes for high DPI screens
      element.style.webkitFontSmoothing = 'antialiased';
      element.style.mozOsxFontSmoothing = 'grayscale';
    }

    // Android Chrome specific optimizations
    const isAndroid = /Android/.test(navigator.userAgent);
    if (isAndroid) {
      // Fix for some Android rendering issues
      element.style.backgroundAttachment = 'scroll';
      element.style.willChange = 'transform';
      element.style.webkitTransform = 'translate3d(0, 0, 0)';
    }

    // Microsoft Edge specific optimizations
    const isEdge = /Edge\/|Edg\//.test(navigator.userAgent);
    if (isEdge) {
      element.style.msHighContrastAdjust = 'none';
      element.style.willChange = 'transform';
    }

    // Firefox specific optimizations
    const isFirefox = /Firefox/.test(navigator.userAgent);
    if (isFirefox) {
      element.style.imageRendering = '-moz-crisp-edges';
      element.style.willChange = 'transform';
    }

    // Safari specific optimizations
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      element.style.webkitFontSmoothing = 'subpixel-antialiased';
      element.style.willChange = 'transform';
    }

    // Internet Explorer specific optimizations
    const isIE = /Trident\/|MSIE/.test(navigator.userAgent);
    if (isIE) {
      element.style.msInterpolationMode = 'bicubic';

      // Force background-size for IE
      element.style.backgroundSize = 'contain !important';
    }

    // Apply hardware acceleration for all browsers
    element.style.transform = 'translateZ(0)';
    element.style.webkitTransform = 'translateZ(0)';
    element.style.mozTransform = 'translateZ(0)';
    element.style.msTransform = 'translateZ(0)';
    element.style.oTransform = 'translateZ(0)';
  }

  /**
   * Handle orientation change events
   */
  handleOrientationChange() {
    if (this.orientationChangeHandler) {
      this.orientationChangeHandler();
    }
  }

  /**
   * Handle image loading errors
   * @param {Error} error - The error that occurred
   */
  handleImageLoadError(error) {
    console.error('DisplayController: Image loading error:', error);

    // Reset state
    this.currentImage = null;
    this.isImageLoaded = false;

    // Hide the display image and loading state
    if (this.displayImage) {
      this.displayImage.style.display = 'none';
      this.displayImage.style.backgroundImage = 'none';
    }

    // Hide loading state
    this.hideLoadingState();

    // Get specific error message based on error type
    let errorMessage = error.message;
    let errorContext = 'DisplayController.loadImage';
    let errorType = error.type || 'unknown';

    // Enhanced error handling for background images
    if (errorType) {
      switch (errorType) {
        case 'cors':
          errorMessage = 'Unable to load image from external domain. This may be due to cross-origin restrictions.';
          errorContext = 'DisplayController.backgroundImageCors';
          break;
        case 'network':
          errorMessage = 'Network error while loading image. Please check your internet connection.';
          errorContext = 'DisplayController.backgroundImageNetwork';
          break;
        case 'timeout':
          errorMessage = 'Image loading timed out. The server might be slow or unresponsive.';
          errorContext = 'DisplayController.backgroundImageTimeout';
          break;
        case 'format':
          errorMessage = 'Invalid image format or corrupted image file.';
          errorContext = 'DisplayController.backgroundImageFormat';
          break;
        default:
          errorMessage = 'Failed to load image. Please try again later.';
      }
    }

    // Track error with performance monitor
    if (window.imagePerformanceMonitor) {
      window.imagePerformanceMonitor.recordError(errorType);
    }

    // Show error state in UI with specific message
    this.showErrorState(errorMessage, {
      isBackgroundImage: true,
      errorType: errorType
    });

    // Report error to Firebase if available with enhanced context
    if (window.firebaseService && typeof window.firebaseService.reportError === 'function') {
      // Add background image specific metadata
      const metadata = {
        isBackgroundImage: true,
        errorType: errorType,
        url: error.url || 'unknown',
        loadTime: error.loadTime || 0,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      };

      // Use non-blocking approach for error reporting
      setTimeout(() => {
        window.firebaseService.reportError(error, errorContext, metadata);
      }, 0);
    }

    // If error handler is available, use it for centralized error handling
    if (window.errorHandler) {
      // Use non-blocking approach for error handling
      setTimeout(() => {
        window.errorHandler.handleError(
          error,
          'image_loading',
          {
            isBackgroundImage: true,
            errorType: errorType,
            url: error.url || 'unknown',
            timestamp: Date.now()
          }
        );
      }, 0);
    }

    // Try to recover if possible
    this.attemptErrorRecovery(error);
  }

  /**
   * Attempt to recover from image loading errors
   * @param {Error} error - The error that occurred
   */
  attemptErrorRecovery(error) {
    // Skip recovery for certain error types
    if (error.type === 'format') {
      return; // Can't recover from invalid format
    }

    // For network errors, try again with reduced quality if URL supports it
    if (error.type === 'network' && error.url) {
      const url = error.url;

      // Check if this is a URL we can modify for recovery
      if (url.includes('width=') || url.includes('quality=')) {
        // Try with reduced quality and size
        let recoveryUrl = url;

        if (url.includes('quality=')) {
          recoveryUrl = recoveryUrl.replace(/quality=\d+/g, 'quality=70');
        }

        if (url.includes('width=')) {
          recoveryUrl = recoveryUrl.replace(/width=\d+/g, (match) => {
            const currentWidth = parseInt(match.split('=')[1]);
            const newWidth = Math.floor(currentWidth * 0.75);
            return `width=${newWidth}`;
          });
        }

        // Only try recovery if URL was modified
        if (recoveryUrl !== url) {
          console.log('🔄 Attempting error recovery with reduced quality image');

          // Try loading the recovery URL after a short delay
          setTimeout(() => {
            this.loadImage(recoveryUrl).catch(() => {
              // Silently fail if recovery also fails
            });
          }, 1000);
        }
      }
    }
  }

  /**
   * Show error state in the UI
   * @param {string} message - Error message to display
   * @param {Object} options - Additional options for error display
   */
  showErrorState(message, options = {}) {
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');

    if (errorMessage) {
      errorMessage.textContent = message || 'Failed to load image';

      // Add specific class for background image errors if specified
      if (options.isBackgroundImage) {
        errorMessage.classList.add('background-image-error');
      } else {
        errorMessage.classList.remove('background-image-error');
      }

      // Add error type as data attribute for potential styling
      if (options.errorType) {
        errorMessage.setAttribute('data-error-type', options.errorType);
      } else {
        errorMessage.removeAttribute('data-error-type');
      }
    }

    if (errorState) {
      errorState.style.display = 'block';

      // Add specific class for background image errors if specified
      if (options.isBackgroundImage) {
        errorState.classList.add('background-image-error');
      } else {
        errorState.classList.remove('background-image-error');
      }
    }

    // Hide loading state
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
      loadingState.style.display = 'none';
    }

    // Log error display
    console.log(`DisplayController: Showing error state: ${message}`, options);
  }

  /**
   * Hide error state and show loading state
   */
  hideErrorState() {
    const errorState = document.getElementById('error-state');
    if (errorState) {
      errorState.style.display = 'none';
    }
  }

  /**
   * Get current viewport dimensions
   * @returns {Object} Viewport dimensions
   */
  getViewportDimensions() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      aspectRatio: window.innerWidth / window.innerHeight
    };
  }

  /**
   * Get current image information
   * @returns {Object|null} Current image information or null if no image loaded
   */
  getCurrentImageInfo() {
    if (!this.currentImage || !this.isImageLoaded) {
      return null;
    }

    return {
      url: this.currentImage.url,
      naturalWidth: this.currentImage.naturalWidth,
      naturalHeight: this.currentImage.naturalHeight,
      aspectRatio: this.currentImage.aspectRatio,
      isLoaded: this.isImageLoaded,
      isBackgroundImage: true
    };
  }

  /**
   * Set background image with cross-browser fallbacks and optimizations
   * @param {string} imageUrl - URL of the image to set as background
   */
  setBackgroundImageWithFallbacks(imageUrl) {
    if (!this.displayImage || !imageUrl) {
      return;
    }

    // Check if we're setting the same image (no need to reapply)
    if (this._lastBackgroundImageUrl === imageUrl) {
      return;
    }

    // Store the URL for future reference
    this._lastBackgroundImageUrl = imageUrl;

    // Use data URI for cached images if available and small enough
    const cachedImage = this.imageCache && this.imageCache.get(imageUrl);
    if (cachedImage && cachedImage.toDataURL && cachedImage.width * cachedImage.height < 250000) {
      try {
        // For small images, data URIs can be faster than URL lookups
        const dataUrl = cachedImage.toDataURL('image/jpeg', 0.92);
        this.displayImage.style.backgroundImage = `url("${dataUrl}")`;
        return;
      } catch (e) {
        // Fall back to standard URL if data URI fails
        console.warn('Failed to use data URI, falling back to URL', e);
      }
    }

    // Standard approach for modern browsers with optimized syntax
    // Use single quotes for slightly better performance and less escaping
    this.displayImage.style.backgroundImage = `url('${imageUrl}')`;

    // Apply optimized browser-specific fixes
    if (this.browser) {
      // Apply only necessary browser-specific fixes
      if (this.browser.isIE) {
        // IE specific fix - IE sometimes has issues with quotes in url()
        this.displayImage.style.backgroundImage = `url(${imageUrl})`;
        this.displayImage.style.backgroundSize = 'contain !important';
      } else if (this.browser.isIOS) {
        // iOS specific fix - use hardware acceleration
        this.displayImage.style.webkitTransform = 'translate3d(0, 0, 0)';

        // Only force repaint if needed (iOS Safari has rendering issues)
        if (this.browser.isSafari) {
          // Use minimal reflow technique
          this.displayImage.style.opacity = '0.99';
          setTimeout(() => {
            this.displayImage.style.opacity = '1';
          }, 0);
        }
      } else if (this.browser.isAndroid) {
        // Android specific fix - use hardware acceleration
        this.displayImage.style.webkitTransform = 'translate3d(0, 0, 0)';
      }
    }

    // Fallback for browsers that don't support background-size
    if (!this.browser || !this.browser.supportsBackgroundSize) {
      this.applyFallbackStyles(imageUrl);
    }
  }

  /**
   * Apply fallback styles for browsers without background-size support
   * @param {string} imageUrl - URL of the image
   */
  applyFallbackStyles(imageUrl) {
    // Apply fallback styles for browsers without background-size support
    this.displayImage.style.maxWidth = '100%';
    this.displayImage.style.maxHeight = '100%';
    this.displayImage.style.position = 'absolute';
    this.displayImage.style.top = '50%';
    this.displayImage.style.left = '50%';
    this.displayImage.style.transform = 'translate(-50%, -50%)';

    console.log('DisplayController: Applied fallback styles for browsers without background-size support');
  }

  /**
   * Clean up event listeners and resources
   */
  destroy() {
    // Remove all event listeners
    if (this.orientationChangeHandler) {
      window.removeEventListener('orientationchange', this.orientationChangeHandler);

      // Remove screen orientation listener if supported
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', this.orientationChangeHandler);
      }
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    if (this.visualViewportHandler && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.visualViewportHandler);
    }

    if (this.deviceOrientationHandler) {
      window.removeEventListener('deviceorientation', this.deviceOrientationHandler);
    }

    if (this.fullscreenChangeHandler) {
      const fullscreenEvents = [
        'fullscreenchange',
        'webkitfullscreenchange',
        'mozfullscreenchange',
        'MSFullscreenChange'
      ];

      fullscreenEvents.forEach(event => {
        document.removeEventListener(event, this.fullscreenChangeHandler);
      });
    }

    // Reset state
    this.currentImage = null;
    this.isImageLoaded = false;
    this.orientationChangeHandler = null;
    this.resizeHandler = null;
    this.visualViewportHandler = null;
    this.deviceOrientationHandler = null;
    this.fullscreenChangeHandler = null;
  }
}

// Export for use in other modules
export default DisplayController;

/*
*
 * Performance monitoring utilities for background image loading
 */
class ImagePerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTimes: [],
      cacheTimes: [],
      renderTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      totalImages: 0,
      errors: 0
    };

    // Initialize Performance Observer if available
    this.initPerformanceObserver();
  }

  /**
   * Initialize Performance Observer to track image loading
   */
  initPerformanceObserver() {
    if (window.PerformanceObserver) {
      try {
        // Create observer for resource timing entries
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries().filter(entry =>
            entry.initiatorType === 'img' ||
            (entry.name && (
              entry.name.endsWith('.jpg') ||
              entry.name.endsWith('.jpeg') ||
              entry.name.endsWith('.png') ||
              entry.name.endsWith('.gif') ||
              entry.name.endsWith('.webp')
            ))
          );

          entries.forEach(entry => {
            this.metrics.loadTimes.push(entry.duration);
          });
        });

        // Start observing resource timing entries
        observer.observe({ entryTypes: ['resource'] });

        // Create observer for paint timing entries
        const paintObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.firstContentfulPaint = entry.startTime;
            }
          });
        });

        // Start observing paint timing entries
        paintObserver.observe({ entryTypes: ['paint'] });

      } catch (e) {
        console.warn('Performance observer not supported', e);
      }
    }
  }

  /**
   * Record image load time
   * @param {number} time - Load time in milliseconds
   * @param {boolean} fromCache - Whether the image was loaded from cache
   */
  recordLoadTime(time, fromCache = false) {
    this.metrics.totalImages++;

    if (fromCache) {
      this.metrics.cacheHits++;
      this.metrics.cacheTimes.push(time);
    } else {
      this.metrics.cacheMisses++;
      this.metrics.loadTimes.push(time);
    }
  }

  /**
   * Record render time
   * @param {number} time - Render time in milliseconds
   */
  recordRenderTime(time) {
    this.metrics.renderTimes.push(time);
  }

  /**
   * Record error
   * @param {string} type - Error type
   */
  recordError(type) {
    this.metrics.errors++;
    if (!this.metrics.errorTypes) {
      this.metrics.errorTypes = {};
    }

    this.metrics.errorTypes[type] = (this.metrics.errorTypes[type] || 0) + 1;
  }

  /**
   * Get performance report
   * @returns {Object} Performance metrics
   */
  getReport() {
    const calculateAverage = (arr) => {
      if (!arr || arr.length === 0) return 0;
      return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    };

    const calculatePercentile = (arr, percentile) => {
      if (!arr || arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const index = Math.floor(sorted.length * percentile / 100);
      return sorted[index];
    };

    return {
      averageLoadTime: calculateAverage(this.metrics.loadTimes),
      averageCacheTime: calculateAverage(this.metrics.cacheTimes),
      averageRenderTime: calculateAverage(this.metrics.renderTimes),
      p95LoadTime: calculatePercentile(this.metrics.loadTimes, 95),
      cacheHitRate: this.metrics.totalImages > 0 ?
        (this.metrics.cacheHits / this.metrics.totalImages) * 100 : 0,
      errorRate: this.metrics.totalImages > 0 ?
        (this.metrics.errors / this.metrics.totalImages) * 100 : 0,
      totalImages: this.metrics.totalImages,
      firstContentfulPaint: this.metrics.firstContentfulPaint || 0,
      errorTypes: this.metrics.errorTypes || {}
    };
  }

  /**
   * Log performance report to console
   */
  logReport() {
    const report = this.getReport();
    console.log('📊 Background Image Performance Report:', report);
    return report;
  }
}

// Create global instance for tracking
if (typeof window !== 'undefined') {
  window.imagePerformanceMonitor = new ImagePerformanceMonitor();
}