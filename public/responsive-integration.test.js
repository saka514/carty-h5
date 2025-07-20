/**
 * Integration tests for responsive design and cross-device compatibility
 * Tests touch events, mouse interactions, orientation changes, and viewport handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock DOM and browser APIs
const mockResponsiveDOM = () => {
  // Mock DOM elements
  const mockImageContainer = {
    id: 'image-container',
    style: {}
  };

  const mockDisplayImage = {
    id: 'display-image',
    style: {
      display: 'none',
      transform: '',
      transformOrigin: '',
      width: '',
      height: '',
      position: '',
      top: '',
      left: '',
      opacity: ''
    },
    src: '',
    alt: ''
  };

  const mockBody = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };

  // Mock document
  global.document = {
    getElementById: vi.fn((id) => {
      switch (id) {
        case 'image-container':
          return mockImageContainer;
        case 'display-image':
          return mockDisplayImage;
        default:
          return null;
      }
    }),
    body: mockBody,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };

  // Mock window with responsive properties
  global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    PointerEvent: class PointerEvent extends Event {
      constructor(type, options = {}) {
        super(type);
        this.pointerType = options.pointerType || 'mouse';
        this.clientX = options.clientX || 0;
        this.clientY = options.clientY || 0;
      }
    },
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
    }

    simulateLoad(width = 800, height = 600) {
      this.naturalWidth = width;
      this.naturalHeight = height;
      this.complete = true;
      if (this.onload) {
        setTimeout(() => this.onload(), 0);
      }
    }
  };

  return {
    mockImageContainer,
    mockDisplayImage,
    mockBody
  };
};

describe('Responsive Design and Cross-Device Compatibility Integration Tests', () => {
  let ClickHandler, DisplayController;
  let clickHandler, displayController;
  let mockElements;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set up DOM mocks
    mockElements = mockResponsiveDOM();
    
    // Import classes
    const clickModule = await import('./click-handler.js');
    const displayModule = await import('./display-controller.js');
    
    ClickHandler = clickModule.default || clickModule.ClickHandler;
    DisplayController = displayModule.default || displayModule.DisplayController;
    
    // Create instances
    displayController = new DisplayController();
    clickHandler = new ClickHandler();
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (clickHandler) {
      clickHandler.destroy();
    }
    if (displayController) {
      displayController.destroy();
    }
    
    // Restore console methods
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  describe('Touch Event Handling - Requirement 6.1', () => {
    it('should handle touch interactions on mobile devices', async () => {
      // WHEN accessed on mobile devices THEN the system SHALL provide touch-optimized interactions
      const instructionSet = {
        image_url: 'https://example.com/image.jpg',
        click_url: 'https://example.com/click',
        auto_click: false,
        deeplink_priority: false
      };

      clickHandler.initialize(instructionSet);

      // Verify touch event listeners are set up
      expect(document.body.addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        expect.any(Object)
      );
      expect(document.body.addEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        expect.any(Object)
      );
      expect(document.body.addEventListener).toHaveBeenCalledWith(
        'touchcancel',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should validate touch gestures correctly', async () => {
      const instructionSet = {
        image_url: 'https://example.com/image.jpg',
        click_url: 'https://example.com/click',
        auto_click: false,
        deeplink_priority: false
      };

      clickHandler.initialize(instructionSet);

      // Mock processClickAction
      const processClickSpy = vi.spyOn(clickHandler, 'processClickAction').mockResolvedValue();

      // Simulate valid touch sequence
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 105, clientY: 105 }]
      });

      // Simulate touch start
      clickHandler.handleTouchStart(touchStartEvent);
      expect(clickHandler.interactionState.isTouchActive).toBe(true);

      // Simulate touch end after short duration with minimal movement
      await clickHandler.handleTouchEnd(touchEndEvent);
      
      expect(processClickSpy).toHaveBeenCalledWith('manual_touch');
    });

    it('should reject invalid touch gestures', async () => {
      const instructionSet = {
        image_url: 'https://example.com/image.jpg',
        click_url: 'https://example.com/click',
        auto_click: false,
        deeplink_priority: false
      };

      clickHandler.initialize(instructionSet);

      // Mock processClickAction
      const processClickSpy = vi.spyOn(clickHandler, 'processClickAction').mockResolvedValue();

      // Simulate touch with too much movement
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 200 }] // 100+ pixels movement
      });

      clickHandler.handleTouchStart(touchStartEvent);
      await clickHandler.handleTouchEnd(touchEndEvent);
      
      // Should not process click due to excessive movement
      expect(processClickSpy).not.toHaveBeenCalled();
    });
  });

  describe('Mouse Click Support - Requirement 6.2', () => {
    it('should handle mouse interactions on desktop', async () => {
      // WHEN accessed on desktop THEN the system SHALL support mouse click interactions
      const instructionSet = {
        image_url: 'https://example.com/image.jpg',
        click_url: 'https://example.com/click',
        auto_click: false,
        deeplink_priority: false
      };

      clickHandler.initialize(instructionSet);

      // Verify mouse event listeners are set up
      expect(document.body.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        expect.any(Object)
      );
      expect(document.body.addEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function),
        expect.any(Object)
      );
      expect(document.body.addEventListener).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should process mouse clicks correctly', async () => {
      const instructionSet = {
        image_url: 'https://example.com/image.jpg',
        click_url: 'https://example.com/click',
        auto_click: false,
        deeplink_priority: false
      };

      clickHandler.initialize(instructionSet);

      // Mock processClickAction
      const processClickSpy = vi.spyOn(clickHandler, 'processClickAction').mockResolvedValue();

      // Simulate mouse click
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 100
      });

      await clickHandler.handleClick(clickEvent);
      
      expect(processClickSpy).toHaveBeenCalledWith('manual_click');
    });
  });

  describe('Orientation Change Handling - Requirement 6.3', () => {
    it('should maintain functionality during orientation changes', async () => {
      // WHEN screen orientation changes THEN the system SHALL maintain functionality and visual integrity
      
      // Load an image first
      const mockImage = new Image();
      mockImage.simulateLoad(800, 600);
      
      // Set up loaded state
      displayController.currentImage = mockImage;
      displayController.isImageLoaded = true;

      // Spy on responsive resize handler
      const resizeSpy = vi.spyOn(displayController, 'handleResponsiveResize');

      // Verify orientation change listeners are set up
      expect(window.addEventListener).toHaveBeenCalledWith(
        'orientationchange',
        expect.any(Function),
        expect.any(Object)
      );

      // Simulate orientation change
      const orientationEvent = new Event('orientationchange');
      
      // Trigger the handler directly (since we can't easily trigger the actual event)
      displayController.orientationChangeHandler();

      // Wait for timeouts to complete
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(resizeSpy).toHaveBeenCalled();
    });

    it('should handle multiple viewport APIs for orientation changes', () => {
      // Verify multiple orientation change listeners are set up
      expect(window.addEventListener).toHaveBeenCalledWith(
        'orientationchange',
        expect.any(Function),
        expect.any(Object)
      );

      if (window.visualViewport) {
        expect(window.visualViewport.addEventListener).toHaveBeenCalledWith(
          'resize',
          expect.any(Function),
          expect.any(Object)
        );
      }

      if (screen.orientation) {
        expect(screen.orientation.addEventListener).toHaveBeenCalledWith(
          'change',
          expect.any(Function),
          expect.any(Object)
        );
      }
    });
  });

  describe('Cross-Browser Compatibility - Requirement 6.4', () => {
    it('should provide consistent behavior across different browsers', () => {
      // WHEN accessed on different browsers THEN the system SHALL provide consistent behavior
      const instructionSet = {
        image_url: 'https://example.com/image.jpg',
        click_url: 'https://example.com/click',
        auto_click: false,
        deeplink_priority: false
      };

      // Initialize click handler to set up event listeners
      clickHandler.initialize(instructionSet);
      
      // Test pointer events support detection
      expect(window.PointerEvent).toBeDefined();
      
      // Verify pointer event listeners are set up when supported
      if (window.PointerEvent) {
        expect(document.body.addEventListener).toHaveBeenCalledWith(
          'pointerdown',
          expect.any(Function),
          expect.any(Object)
        );
        expect(document.body.addEventListener).toHaveBeenCalledWith(
          'pointerup',
          expect.any(Function),
          expect.any(Object)
        );
      }
    });

    it('should handle pointer events when available', async () => {
      const instructionSet = {
        image_url: 'https://example.com/image.jpg',
        click_url: 'https://example.com/click',
        auto_click: false,
        deeplink_priority: false
      };

      clickHandler.initialize(instructionSet);

      // Mock processClickAction
      const processClickSpy = vi.spyOn(clickHandler, 'processClickAction').mockResolvedValue();

      // Simulate pointer events using the mocked PointerEvent
      const pointerDownEvent = new window.PointerEvent('pointerdown', {
        pointerType: 'touch',
        clientX: 100,
        clientY: 100
      });

      const pointerUpEvent = new window.PointerEvent('pointerup', {
        pointerType: 'touch',
        clientX: 100,
        clientY: 100
      });

      clickHandler.handlePointerDown(pointerDownEvent);
      expect(clickHandler.interactionState.isPointerActive).toBe(true);

      await clickHandler.handlePointerUp(pointerUpEvent);
      expect(processClickSpy).toHaveBeenCalledWith('manual_touch');
    });

    it('should prevent context menu on touch devices', () => {
      const instructionSet = {
        image_url: 'https://example.com/image.jpg',
        click_url: 'https://example.com/click',
        auto_click: false,
        deeplink_priority: false
      };

      clickHandler.initialize(instructionSet);

      // Set touch as last interaction type
      clickHandler.interactionState.lastInteractionType = 'touch';

      // Create context menu event
      const contextMenuEvent = new Event('contextmenu');
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');

      clickHandler.handleContextMenu(contextMenuEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Responsive Image Scaling', () => {
    it('should calculate correct scaling for different viewport sizes', () => {
      const mockImage = {
        naturalWidth: 800,
        naturalHeight: 600
      };

      // Test mobile portrait
      window.innerWidth = 375;
      window.innerHeight = 667;
      
      let scaling = displayController.calculateScaling(mockImage);
      expect(scaling.scale).toBeCloseTo(0.469, 2); // 375/800 = 0.469

      // Test mobile landscape
      window.innerWidth = 667;
      window.innerHeight = 375;
      
      scaling = displayController.calculateScaling(mockImage);
      expect(scaling.scale).toBeCloseTo(0.625, 2); // 375/600 = 0.625

      // Test tablet
      window.innerWidth = 768;
      window.innerHeight = 1024;
      
      scaling = displayController.calculateScaling(mockImage);
      expect(scaling.scale).toBeCloseTo(0.96, 2); // 768/800 = 0.96

      // Test desktop
      window.innerWidth = 1920;
      window.innerHeight = 1080;
      
      scaling = displayController.calculateScaling(mockImage);
      expect(scaling.scale).toBeCloseTo(1.8, 2); // 1080/600 = 1.8
    });

    it('should handle visual viewport changes on mobile', () => {
      // Mock visual viewport
      window.visualViewport = {
        width: 375,
        height: 500, // Reduced due to virtual keyboard
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };

      const mockImage = {
        naturalWidth: 800,
        naturalHeight: 600
      };

      displayController.currentImage = mockImage;
      displayController.isImageLoaded = true;

      // Spy on scaling methods
      const calculateScalingSpy = vi.spyOn(displayController, 'calculateScaling');
      const applyScalingSpy = vi.spyOn(displayController, 'applyImageScaling');

      // Mock return value
      calculateScalingSpy.mockReturnValue({
        scale: 0.5,
        width: 400,
        height: 300,
        transform: 'scale(0.5)'
      });

      // Trigger responsive resize
      displayController.handleResponsiveResize();

      expect(calculateScalingSpy).toHaveBeenCalledWith(mockImage);
      expect(applyScalingSpy).toHaveBeenCalled();
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should properly clean up all event listeners', () => {
      const instructionSet = {
        image_url: 'https://example.com/image.jpg',
        click_url: 'https://example.com/click',
        auto_click: false,
        deeplink_priority: false
      };

      clickHandler.initialize(instructionSet);

      // Destroy and verify cleanup
      clickHandler.destroy();

      // Verify removeEventListener calls for all event types
      expect(document.body.removeEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        expect.any(Object)
      );
      expect(document.body.removeEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        expect.any(Object)
      );
      expect(document.body.removeEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        expect.any(Object)
      );

      // Verify state cleanup
      expect(clickHandler.interactionState).toBeNull();
      expect(clickHandler.clickListenersSetup).toBe(false);
    });

    it('should clean up display controller event listeners', () => {
      displayController.destroy();

      // Verify orientation change listeners are removed
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'orientationchange',
        expect.any(Function)
      );
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );

      if (window.visualViewport) {
        expect(window.visualViewport.removeEventListener).toHaveBeenCalledWith(
          'resize',
          expect.any(Function)
        );
      }
    });
  });
});