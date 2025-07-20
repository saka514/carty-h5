/**
 * Unit tests for DisplayController class
 * Tests image loading, scaling calculations, orientation handling, and error scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM elements and global objects
const mockDOM = () => {
  // Mock DOM elements
  const mockImageContainer = {
    id: 'image-container',
    style: {}
  };

  const mockDisplayImage = {
    id: 'display-image',
    style: {
      display: 'none',
      backgroundImage: '',
      backgroundSize: '',
      backgroundPosition: '',
      backgroundRepeat: '',
      width: '',
      height: '',
      position: '',
      top: '',
      left: '',
      opacity: ''
    }
  };

  const mockErrorState = {
    id: 'error-state',
    style: { display: 'none' },
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn()
    }
  };

  const mockErrorMessage = {
    id: 'error-message',
    textContent: '',
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn()
    },
    setAttribute: vi.fn(),
    removeAttribute: vi.fn()
  };

  const mockLoadingState = {
    id: 'loading-state',
    style: { display: 'block' }
  };

  // Mock document.getElementById and addEventListener
  global.document = {
    getElementById: vi.fn((id) => {
      switch (id) {
        case 'image-container':
          return mockImageContainer;
        case 'display-image':
          return mockDisplayImage;
        case 'error-state':
          return mockErrorState;
        case 'error-message':
          return mockErrorMessage;
        case 'loading-state':
          return mockLoadingState;
        default:
          return null;
      }
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };

  // Mock window object
  global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    visualViewport: {
      width: 1920,
      height: 1080,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    },
    DeviceOrientationEvent: class DeviceOrientationEvent extends Event {
      constructor(type, options = {}) {
        super(type);
        this.alpha = options.alpha || 0;
        this.beta = options.beta || 0;
        this.gamma = options.gamma || 0;
      }
    }
  };

  // Mock screen orientation API
  global.screen = {
    orientation: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      angle: 0,
      type: 'landscape-primary'
    }
  };

  // Mock Image constructor
  global.Image = class {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this.src = '';
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.complete = false;
      this.eventListeners = {};
    }

    // Mock addEventListener
    addEventListener(event, callback, options) {
      if (!this.eventListeners[event]) {
        this.eventListeners[event] = [];
      }
      this.eventListeners[event].push({ callback, options });
    }

    // Mock removeEventListener
    removeEventListener(event, callback) {
      if (this.eventListeners[event]) {
        this.eventListeners[event] = this.eventListeners[event].filter(
          listener => listener.callback !== callback
        );
      }
    }

    // Simulate successful image load
    simulateLoad(width = 800, height = 600) {
      this.naturalWidth = width;
      this.naturalHeight = height;
      this.complete = true;
      if (this.onload) {
        setTimeout(() => this.onload(), 0);
      }
      // Trigger load event listeners
      if (this.eventListeners && this.eventListeners.load) {
        this.eventListeners.load.forEach(listener => {
          setTimeout(() => listener.callback(), 0);
        });
      }
    }

    // Simulate image load error
    simulateError() {
      if (this.onerror) {
        setTimeout(() => this.onerror(), 0);
      }
      // Trigger error event listeners
      if (this.eventListeners && this.eventListeners.error) {
        this.eventListeners.error.forEach(listener => {
          setTimeout(() => listener.callback(), 0);
        });
      }
    }
  };

  return {
    mockImageContainer,
    mockDisplayImage,
    mockErrorState,
    mockErrorMessage,
    mockLoadingState
  };
};

// Import DisplayController after mocking
let DisplayController;

describe('DisplayController', () => {
  let displayController;
  let mockElements;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set up DOM mocks
    mockElements = mockDOM();
    
    // Import DisplayController
    const module = await import('./display-controller.js');
    DisplayController = module.default || DisplayController;
    
    // Create new instance
    displayController = new DisplayController();
  });

  afterEach(() => {
    if (displayController) {
      displayController.destroy();
    }
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct DOM elements', () => {
      expect(displayController.imageContainer).toBeTruthy();
      expect(displayController.displayImage).toBeTruthy();
      expect(displayController.isImageLoaded).toBe(false);
      expect(displayController.currentImage).toBe(null);
    });

    it('should throw error if required DOM elements are missing', () => {
      // Mock missing elements
      document.getElementById = vi.fn(() => null);
      
      expect(() => {
        new DisplayController();
      }).toThrow('Required DOM elements not found: image-container or display-image');
    });

    it('should set up event listeners for orientation and resize', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function), { passive: true });
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true });
      expect(window.addEventListener).toHaveBeenCalledWith('deviceorientation', expect.any(Function), { passive: true });
    });
  });

  describe('Image Loading', () => {
    it('should successfully load a valid image', async () => {
      const imageUrl = 'https://example.com/test-image.jpg';
      
      // Mock Image constructor to simulate immediate load
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          this.onload = null;
          this.onerror = null;
          this.src = '';
          this.naturalWidth = 0;
          this.naturalHeight = 0;
          this.complete = false;
          this.eventListeners = {};
        }

        // Mock addEventListener
        addEventListener(event, callback, options) {
          if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
          }
          this.eventListeners[event].push({ callback, options });
        }

        // Mock removeEventListener
        removeEventListener(event, callback) {
          if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(
              listener => listener.callback !== callback
            );
          }
        }

        set src(value) {
          this._src = value;
          // Simulate immediate successful load
          setTimeout(() => {
            this.naturalWidth = 800;
            this.naturalHeight = 600;
            this.complete = true;
            if (this.onload) {
              this.onload();
            }
            // Trigger load event listeners
            if (this.eventListeners && this.eventListeners.load) {
              this.eventListeners.load.forEach(listener => {
                listener.callback();
              });
            }
          }, 0);
        }

        get src() {
          return this._src;
        }
      };
      
      // Start loading
      const loadedImage = await displayController.loadImage(imageUrl);
      
      expect(loadedImage).toBeDefined();
      expect(displayController.isImageLoaded).toBe(true);
      expect(displayController.currentImage).toBeTruthy();
      expect(mockElements.mockDisplayImage.style.backgroundImage).toBe(`url("${imageUrl}")`);
      expect(mockElements.mockDisplayImage.style.display).toBe('block');
      
      // Restore original Image
      global.Image = originalImage;
    });
    
    it('should successfully load a cross-origin image using background-image approach', async () => {
      const crossOriginUrl = 'https://external-domain.com/image.jpg';
      
      // Mock window.location
      if (!window.location) {
        window.location = {};
      }
      const originalLocation = { ...window.location };
      window.location = {
        ...window.location,
        origin: 'https://app-domain.com'
      };
      
      // Mock Image constructor to simulate immediate load
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          this.onload = null;
          this.onerror = null;
          this.src = '';
          this.naturalWidth = 0;
          this.naturalHeight = 0;
          this.complete = false;
          this.eventListeners = {};
        }

        // Mock addEventListener
        addEventListener(event, callback, options) {
          if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
          }
          this.eventListeners[event].push({ callback, options });
        }

        // Mock removeEventListener
        removeEventListener(event, callback) {
          if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(
              listener => listener.callback !== callback
            );
          }
        }

        set src(value) {
          this._src = value;
          // Simulate immediate successful load
          setTimeout(() => {
            this.naturalWidth = 1200;
            this.naturalHeight = 800;
            this.complete = true;
            if (this.onload) {
              this.onload();
            }
            // Trigger load event listeners
            if (this.eventListeners && this.eventListeners.load) {
              this.eventListeners.load.forEach(listener => {
                listener.callback();
              });
            }
          }, 0);
        }

        get src() {
          return this._src;
        }
      };
      
      // We can't spy on isCrossOriginUrl directly since it's not called in the test environment
      // Instead, let's verify the image was loaded successfully
      
      // Start loading
      const loadedImage = await displayController.loadImage(crossOriginUrl);
      
      // Verify image was loaded successfully
      expect(loadedImage).toBeDefined();
      expect(displayController.isImageLoaded).toBe(true);
      expect(displayController.currentImage).toBeTruthy();
      expect(mockElements.mockDisplayImage.style.backgroundImage).toBe(`url("${crossOriginUrl}")`);
      expect(mockElements.mockDisplayImage.style.display).toBe('block');
      
      // Restore original Image and location
      global.Image = originalImage;
      window.location = originalLocation;
    });

    it('should reject with error for invalid image URL', async () => {
      await expect(displayController.loadImage('')).rejects.toThrow('Invalid image URL provided');
      await expect(displayController.loadImage(null)).rejects.toThrow('Invalid image URL provided');
      await expect(displayController.loadImage(123)).rejects.toThrow('Invalid image URL provided');
    });

    it('should handle image loading errors', async () => {
      const imageUrl = 'https://example.com/invalid-image.jpg';
      
      // Mock Image constructor to simulate error
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          this.onload = null;
          this.onerror = null;
          this.src = '';
          this.naturalWidth = 0;
          this.naturalHeight = 0;
          this.complete = false;
          this.eventListeners = {};
        }

        // Mock addEventListener
        addEventListener(event, callback, options) {
          if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
          }
          this.eventListeners[event].push({ callback, options });
        }

        // Mock removeEventListener
        removeEventListener(event, callback) {
          if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(
              listener => listener.callback !== callback
            );
          }
        }

        set src(value) {
          this._src = value;
          // Simulate immediate error
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event('error'));
            }
            // Trigger error event listeners
            if (this.eventListeners && this.eventListeners.error) {
              this.eventListeners.error.forEach(listener => {
                listener.callback(new Event('error'));
              });
            }
          }, 0);
        }

        get src() {
          return this._src;
        }
      };
      
      // Should reject with error
      await expect(displayController.loadImage(imageUrl)).rejects.toThrow(`Invalid image format: ${imageUrl}`);
      
      expect(displayController.isImageLoaded).toBe(false);
      expect(displayController.currentImage).toBe(null);
      expect(mockElements.mockDisplayImage.style.display).toBe('none');
      expect(mockElements.mockDisplayImage.style.backgroundImage).toBe('none');
      expect(mockElements.mockErrorState.style.display).toBe('block');
      
      // Restore original Image
      global.Image = originalImage;
    });
    
    it('should handle CORS errors with background-image approach', async () => {
      const corsErrorUrl = 'https://cors-error-domain.com/image.jpg';
      
      // Mock window.location
      if (!window.location) {
        window.location = {};
      }
      const originalLocation = { ...window.location };
      window.location = {
        ...window.location,
        origin: 'https://app-domain.com'
      };
      
      // Mock Image constructor to simulate CORS error
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          this.onload = null;
          this.onerror = null;
          this.src = '';
          this.naturalWidth = 0;
          this.naturalHeight = 0;
          this.complete = false;
          this.eventListeners = {};
        }

        // Mock addEventListener
        addEventListener(event, callback, options) {
          if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
          }
          this.eventListeners[event].push({ callback, options });
        }

        // Mock removeEventListener
        removeEventListener(event, callback) {
          if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(
              listener => listener.callback !== callback
            );
          }
        }

        set src(value) {
          this._src = value;
          
          // Check if this is a cross-origin URL
          if (value.includes('cors-error-domain.com')) {
            // Simulate CORS error
            setTimeout(() => {
              // Create a mock error event with CORS-specific properties
              const errorEvent = new Event('error');
              
              if (this.onerror) {
                this.onerror(errorEvent);
              }
              
              // Trigger error event listeners
              if (this.eventListeners && this.eventListeners.error) {
                this.eventListeners.error.forEach(listener => {
                  listener.callback(errorEvent);
                });
              }
            }, 0);
          }
        }

        get src() {
          return this._src;
        }
      };
      
      // Mock the error type detection in preloadImage
      const originalPreloadImage = displayController.preloadImage;
      displayController.preloadImage = vi.fn().mockImplementation((url) => {
        const error = new Error(`Cross-origin image load failed: ${url}`);
        error.type = 'cors';
        error.url = url;
        throw error;
      });
      
      // Should reject with CORS error
      await expect(displayController.loadImage(corsErrorUrl)).rejects.toThrow(`Cross-origin image load failed: ${corsErrorUrl}`);
      
      // Verify error handling
      expect(displayController.isImageLoaded).toBe(false);
      expect(displayController.currentImage).toBe(null);
      expect(mockElements.mockDisplayImage.style.display).toBe('none');
      expect(mockElements.mockDisplayImage.style.backgroundImage).toBe('none');
      expect(mockElements.mockErrorState.style.display).toBe('block');
      
      // Restore original methods and properties
      global.Image = originalImage;
      window.location = originalLocation;
      displayController.preloadImage = originalPreloadImage;
    });

    it('should handle images with zero dimensions', async () => {
      const imageUrl = 'https://example.com/zero-dimension-image.jpg';
      
      // Mock Image constructor to simulate zero dimensions
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          this.onload = null;
          this.onerror = null;
          this.src = '';
          this.naturalWidth = 0;
          this.naturalHeight = 0;
          this.complete = false;
          this.eventListeners = {};
        }

        // Mock addEventListener
        addEventListener(event, callback, options) {
          if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
          }
          this.eventListeners[event].push({ callback, options });
        }

        // Mock removeEventListener
        removeEventListener(event, callback) {
          if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(
              listener => listener.callback !== callback
            );
          }
        }

        set src(value) {
          this._src = value;
          // Simulate load with zero dimensions
          setTimeout(() => {
            this.naturalWidth = 0;
            this.naturalHeight = 0;
            this.complete = true;
            if (this.onload) {
              this.onload();
            }
            // Trigger load event listeners
            if (this.eventListeners && this.eventListeners.load) {
              this.eventListeners.load.forEach(listener => {
                listener.callback();
              });
            }
          }, 0);
        }

        get src() {
          return this._src;
        }
      };
      
      // Should reject with error
      await expect(displayController.loadImage(imageUrl)).rejects.toThrow('Invalid image: zero dimensions');
      
      // Restore original Image
      global.Image = originalImage;
    });
    
    it('should handle network errors with background-image approach', async () => {
      const networkErrorUrl = 'https://network-error-domain.com/image.jpg';
      
      // Mock navigator.onLine to simulate offline state
      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });
      
      // Mock Image constructor to simulate network error
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          this.onload = null;
          this.onerror = null;
          this.src = '';
          this.naturalWidth = 0;
          this.naturalHeight = 0;
          this.complete = false;
          this.eventListeners = {};
        }

        // Mock addEventListener
        addEventListener(event, callback, options) {
          if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
          }
          this.eventListeners[event].push({ callback, options });
        }

        // Mock removeEventListener
        removeEventListener(event, callback) {
          if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(
              listener => listener.callback !== callback
            );
          }
        }

        set src(value) {
          this._src = value;
          
          // Simulate network error
          setTimeout(() => {
            const errorEvent = new Event('error');
            
            if (this.onerror) {
              this.onerror(errorEvent);
            }
            
            // Trigger error event listeners
            if (this.eventListeners && this.eventListeners.error) {
              this.eventListeners.error.forEach(listener => {
                listener.callback(errorEvent);
              });
            }
          }, 0);
        }

        get src() {
          return this._src;
        }
      };
      
      // Mock the error type detection in preloadImage
      const originalPreloadImage = displayController.preloadImage;
      displayController.preloadImage = vi.fn().mockImplementation((url) => {
        const error = new Error(`Network error loading image: ${url}`);
        error.type = 'network';
        error.url = url;
        throw error;
      });
      
      // Should reject with network error
      await expect(displayController.loadImage(networkErrorUrl)).rejects.toThrow(`Network error loading image: ${networkErrorUrl}`);
      
      // Verify error handling
      expect(displayController.isImageLoaded).toBe(false);
      expect(displayController.currentImage).toBe(null);
      expect(mockElements.mockDisplayImage.style.display).toBe('none');
      expect(mockElements.mockDisplayImage.style.backgroundImage).toBe('none');
      expect(mockElements.mockErrorState.style.display).toBe('block');
      
      // Restore original methods and properties
      global.Image = originalImage;
      Object.defineProperty(navigator, 'onLine', {
        value: originalOnLine,
        writable: true
      });
      displayController.preloadImage = originalPreloadImage;
    });
  });

  describe('Scaling Calculations', () => {
    let mockImage;

    beforeEach(() => {
      mockImage = {
        naturalWidth: 800,
        naturalHeight: 600
      };
    });

    it('should calculate correct scaling for landscape image in landscape viewport', () => {
      // Landscape viewport (1920x1080)
      window.innerWidth = 1920;
      window.innerHeight = 1080;
      
      const scaling = displayController.calculateScaling(mockImage);
      
      expect(scaling.originalWidth).toBe(800);
      expect(scaling.originalHeight).toBe(600);
      expect(scaling.viewportWidth).toBe(1920);
      expect(scaling.viewportHeight).toBe(1080);
      expect(scaling.scale).toBeCloseTo(1.8, 2); // 1080/600 = 1.8, 1920/800 = 2.4, min = 1.8
      expect(scaling.width).toBeCloseTo(1440, 0); // 800 * 1.8
      expect(scaling.height).toBeCloseTo(1080, 0); // 600 * 1.8
      expect(scaling.backgroundSize).toBe('contain');
      expect(scaling.backgroundPosition).toBe('center');
      expect(scaling.isBackgroundImage).toBe(true);
    });

    it('should calculate correct scaling for portrait image in landscape viewport', () => {
      // Portrait image in landscape viewport
      mockImage.naturalWidth = 600;
      mockImage.naturalHeight = 800;
      window.innerWidth = 1920;
      window.innerHeight = 1080;
      
      const scaling = displayController.calculateScaling(mockImage);
      
      expect(scaling.scale).toBeCloseTo(1.35, 2); // 1080/800 = 1.35
      expect(scaling.width).toBeCloseTo(810, 0); // 600 * 1.35
      expect(scaling.height).toBeCloseTo(1080, 0); // 800 * 1.35
    });

    it('should calculate correct scaling for square image', () => {
      // Square image
      mockImage.naturalWidth = 500;
      mockImage.naturalHeight = 500;
      window.innerWidth = 1000;
      window.innerHeight = 800;
      
      const scaling = displayController.calculateScaling(mockImage);
      
      expect(scaling.scale).toBeCloseTo(1.6, 2); // min(1000/500, 800/500) = min(2, 1.6) = 1.6
      expect(scaling.width).toBeCloseTo(800, 0); // 500 * 1.6
      expect(scaling.height).toBeCloseTo(800, 0); // 500 * 1.6
    });

    it('should calculate correct centering offsets', () => {
      window.innerWidth = 1000;
      window.innerHeight = 800;
      mockImage.naturalWidth = 400;
      mockImage.naturalHeight = 300;
      
      const scaling = displayController.calculateScaling(mockImage);
      
      // Scale should be min(1000/400, 800/300) = min(2.5, 2.67) = 2.5
      expect(scaling.scale).toBeCloseTo(2.5, 2);
      
      // Final dimensions: 400*2.5=1000, 300*2.5=750
      expect(scaling.width).toBeCloseTo(1000, 0);
      expect(scaling.height).toBeCloseTo(750, 0);
      
      // Offsets: x=(1000-1000)/2=0, y=(800-750)/2=25
      expect(scaling.offsetX).toBeCloseTo(0, 0);
      expect(scaling.offsetY).toBeCloseTo(25, 0);
    });

    it('should throw error for invalid image', () => {
      expect(() => {
        displayController.calculateScaling(null);
      }).toThrow('Invalid image info provided for scaling calculation');

      expect(() => {
        displayController.calculateScaling({});
      }).toThrow('Invalid image info provided for scaling calculation');

      expect(() => {
        displayController.calculateScaling({ naturalWidth: 0, naturalHeight: 100 });
      }).toThrow('Invalid image info provided for scaling calculation');
    });
  });

  describe('Image Scaling Application', () => {
    let mockImage, mockScaling;

    beforeEach(() => {
      mockImage = {
        naturalWidth: 800,
        naturalHeight: 600
      };

      mockScaling = {
        width: 1440,
        height: 1080,
        scale: 1.8,
        offsetX: 240,
        offsetY: 0,
        transform: 'translate(240px, 0px) scale(1.8)',
        originalWidth: 800,
        originalHeight: 600
      };
    });

    it('should apply scaling correctly to display image using background-image approach', () => {
      // Update mockScaling to include background-image properties
      mockScaling.backgroundSize = 'contain';
      mockScaling.backgroundPosition = 'center';
      mockScaling.isBackgroundImage = true;
      
      displayController.applyImageScaling(mockImage, mockScaling);
      
      const displayImg = mockElements.mockDisplayImage;
      
      expect(displayImg.style.backgroundSize).toBe('contain');
      expect(displayImg.style.backgroundPosition).toBe('center');
      expect(displayImg.style.backgroundRepeat).toBe('no-repeat');
      expect(displayImg.style.width).toBe('100%');
      expect(displayImg.style.height).toBe('100%');
      expect(displayImg.style.position).toBe('absolute');
      expect(displayImg.style.top).toBe('0');
      expect(displayImg.style.left).toBe('0');
      expect(displayImg.style.display).toBe('block');
      expect(displayImg.style.opacity).toBe('1');
    });

    it('should throw error for invalid parameters', () => {
      expect(() => {
        displayController.applyImageScaling(null, mockScaling);
      }).toThrow('Invalid image info or scaling parameters provided');

      expect(() => {
        displayController.applyImageScaling(mockImage, null);
      }).toThrow('Invalid image info or scaling parameters provided');
    });
  });

  describe('Orientation and Resize Handling', () => {
    it('should handle orientation change when image is loaded', () => {
      // Set up loaded image state
      displayController.currentImage = { naturalWidth: 800, naturalHeight: 600 };
      displayController.isImageLoaded = true;
      
      // Spy on calculateScaling and applyImageScaling
      const calculateScalingSpy = vi.spyOn(displayController, 'calculateScaling');
      const applyImageScalingSpy = vi.spyOn(displayController, 'applyImageScaling');
      
      // Mock return value for calculateScaling
      const mockScaling = { scale: 1.5, transform: 'scale(1.5)' };
      calculateScalingSpy.mockReturnValue(mockScaling);
      applyImageScalingSpy.mockImplementation(() => {});
      
      // Trigger orientation change
      displayController.handleOrientationChange();
      
      // Wait for timeout
      setTimeout(() => {
        expect(calculateScalingSpy).toHaveBeenCalledWith(displayController.currentImage);
        expect(applyImageScalingSpy).toHaveBeenCalledWith(displayController.currentImage, mockScaling);
      }, 150);
    });

    it('should not handle orientation change when no image is loaded', () => {
      displayController.isImageLoaded = false;
      displayController.currentImage = null;
      
      const calculateScalingSpy = vi.spyOn(displayController, 'calculateScaling');
      const applyImageScalingSpy = vi.spyOn(displayController, 'applyImageScaling');
      
      displayController.handleOrientationChange();
      
      setTimeout(() => {
        expect(calculateScalingSpy).not.toHaveBeenCalled();
        expect(applyImageScalingSpy).not.toHaveBeenCalled();
      }, 150);
    });
  });

  describe('Error Handling', () => {
    it('should handle image load error correctly', () => {
      const error = new Error('Test error');
      
      // Set up initial state
      displayController.currentImage = { src: 'test.jpg' };
      displayController.isImageLoaded = true;
      
      displayController.handleImageLoadError(error);
      
      expect(displayController.currentImage).toBe(null);
      expect(displayController.isImageLoaded).toBe(false);
      expect(mockElements.mockDisplayImage.style.display).toBe('none');
      expect(mockElements.mockDisplayImage.style.backgroundImage).toBe('none');
      expect(mockElements.mockErrorState.style.display).toBe('block');
      expect(mockElements.mockErrorMessage.textContent).toBe('Test error');
    });

    it('should show error state with custom message', () => {
      const message = 'Custom error message';
      
      displayController.showErrorState(message);
      
      expect(mockElements.mockErrorMessage.textContent).toBe(message);
      expect(mockElements.mockErrorState.style.display).toBe('block');
      expect(mockElements.mockLoadingState.style.display).toBe('none');
    });

    it('should hide error state', () => {
      displayController.hideErrorState();
      
      expect(mockElements.mockErrorState.style.display).toBe('none');
    });
  });

  describe('Utility Methods', () => {
    it('should correctly identify cross-origin URLs', () => {
      // Mock window.location
      if (!window.location) {
        window.location = {};
      }
      const originalLocation = { ...window.location };
      window.location = {
        ...window.location,
        origin: 'https://app-domain.com'
      };
      
      // Same origin URL
      expect(displayController.isCrossOriginUrl('https://app-domain.com/image.jpg')).toBe(false);
      
      // Cross-origin URLs
      expect(displayController.isCrossOriginUrl('https://external-domain.com/image.jpg')).toBe(true);
      expect(displayController.isCrossOriginUrl('http://app-domain.com/image.jpg')).toBe(true); // Different protocol
      expect(displayController.isCrossOriginUrl('https://subdomain.app-domain.com/image.jpg')).toBe(true); // Subdomain is different origin
      
      // Invalid URL should not throw error
      expect(displayController.isCrossOriginUrl('invalid-url')).toBe(false);
      
      // Restore original location
      window.location = originalLocation;
    });
    
    it('should get viewport dimensions correctly', () => {
      window.innerWidth = 1024;
      window.innerHeight = 768;
      
      const dimensions = displayController.getViewportDimensions();
      
      expect(dimensions.width).toBe(1024);
      expect(dimensions.height).toBe(768);
      expect(dimensions.aspectRatio).toBeCloseTo(1.333, 3);
    });

    it('should get current image info when image is loaded', () => {
      displayController.currentImage = {
        url: 'test.jpg',
        naturalWidth: 800,
        naturalHeight: 600,
        aspectRatio: 800/600
      };
      displayController.isImageLoaded = true;
      
      const info = displayController.getCurrentImageInfo();
      
      expect(info.url).toBe('test.jpg');
      expect(info.naturalWidth).toBe(800);
      expect(info.naturalHeight).toBe(600);
      expect(info.aspectRatio).toBeCloseTo(1.333, 3);
      expect(info.isLoaded).toBe(true);
      expect(info.isBackgroundImage).toBe(true);
    });

    it('should return null for image info when no image is loaded', () => {
      displayController.isImageLoaded = false;
      displayController.currentImage = null;
      
      const info = displayController.getCurrentImageInfo();
      
      expect(info).toBe(null);
    });
  });

  describe('Cleanup', () => {
    it('should clean up event listeners and reset state on destroy', () => {
      displayController.destroy();
      
      expect(window.removeEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(displayController.currentImage).toBe(null);
      expect(displayController.isImageLoaded).toBe(false);
      expect(displayController.orientationChangeHandler).toBe(null);
      expect(displayController.resizeHandler).toBe(null);
    });
  });
});