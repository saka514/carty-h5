/**
 * Unit tests for FirebaseService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firebase
const mockAnalytics = {
  logEvent: vi.fn()
};

const mockPerformance = {
  trace: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    putAttribute: vi.fn(),
    putMetric: vi.fn()
  }))
};

const mockFirebase = {
  analytics: vi.fn(() => mockAnalytics),
  performance: vi.fn(() => mockPerformance)
};

// Setup global mocks
global.firebase = mockFirebase;
global.console = {
  log: vi.fn(),
  error: vi.fn()
};

// Mock DOM globals
global.document = {
  title: 'Test Page'
};

global.window = {
  location: {
    href: 'https://test.example.com'
  },
  screen: {
    width: 1920,
    height: 1080
  },
  innerWidth: 1200,
  innerHeight: 800
};

global.navigator = {
  userAgent: 'Test User Agent'
};

// Import the service after mocks are set up
await import('./firebase-service.js');
const FirebaseService = window.FirebaseService;

describe('FirebaseService', () => {
  let firebaseService;

  beforeEach(() => {
    firebaseService = new FirebaseService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully with Firebase available', async () => {
      await firebaseService.initialize();
      
      expect(firebaseService.isInitialized()).toBe(true);
      expect(mockFirebase.analytics).toHaveBeenCalled();
      expect(mockFirebase.performance).toHaveBeenCalled();
    });

    it('should handle initialization failure gracefully', async () => {
      // Mock Firebase as undefined
      const originalFirebase = global.firebase;
      global.firebase = undefined;
      
      await firebaseService.initialize();
      
      expect(firebaseService.isInitialized()).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Firebase initialization failed:', expect.any(Error));
      
      // Restore Firebase
      global.firebase = originalFirebase;
    });

    it('should return same promise for multiple initialization calls', async () => {
      const promise1 = firebaseService.initialize();
      const promise2 = firebaseService.initialize();
      
      expect(promise1).toStrictEqual(promise2);
      
      await promise1;
      await promise2;
    });

    it('should handle missing analytics service', async () => {
      const originalAnalytics = mockFirebase.analytics;
      mockFirebase.analytics = null;
      
      await firebaseService.initialize();
      
      expect(firebaseService.isInitialized()).toBe(true);
      expect(firebaseService.analytics).toBeNull();
      
      mockFirebase.analytics = originalAnalytics;
    });
  });

  describe('trackPageView', () => {
    beforeEach(async () => {
      await firebaseService.initialize();
      // Ensure the service is properly initialized
      firebaseService.initialized = true;
      firebaseService.analytics = mockAnalytics;
    });

    it('should track page view with correct data', () => {
      firebaseService.trackPageView();
      
      expect(mockAnalytics.logEvent).toHaveBeenCalledWith('page_view', {
        page_title: 'Test Page',
        page_location: 'https://test.example.com',
        timestamp: expect.any(Number),
        user_agent: 'Test User Agent',
        screen_width: 1920,
        screen_height: 1080,
        viewport_width: 1200,
        viewport_height: 800
      });
    });

    it('should not track when not initialized', () => {
      const uninitializedService = new FirebaseService();
      uninitializedService.trackPageView();
      
      expect(mockAnalytics.logEvent).not.toHaveBeenCalled();
    });

    it('should handle tracking errors gracefully', () => {
      mockAnalytics.logEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });
      
      firebaseService.trackPageView();
      
      expect(console.error).toHaveBeenCalledWith('Failed to track page view:', expect.any(Error));
    });
  });

  describe('trackUserInteraction', () => {
    beforeEach(async () => {
      await firebaseService.initialize();
      firebaseService.initialized = true;
      firebaseService.analytics = mockAnalytics;
    });

    it('should track user interaction with action and details', () => {
      const action = 'button_click';
      const details = { button_id: 'test-button' };
      
      firebaseService.trackUserInteraction(action, details);
      
      expect(mockAnalytics.logEvent).toHaveBeenCalledWith('user_interaction', {
        action: 'button_click',
        timestamp: expect.any(Number),
        button_id: 'test-button'
      });
    });

    it('should track interaction without details', () => {
      firebaseService.trackUserInteraction('page_scroll');
      
      expect(mockAnalytics.logEvent).toHaveBeenCalledWith('user_interaction', {
        action: 'page_scroll',
        timestamp: expect.any(Number)
      });
    });

    it('should handle tracking errors gracefully', () => {
      mockAnalytics.logEvent.mockImplementation(() => {
        throw new Error('Tracking error');
      });
      
      firebaseService.trackUserInteraction('test_action');
      
      expect(console.error).toHaveBeenCalledWith('Failed to track user interaction:', expect.any(Error));
    });
  });

  describe('reportError', () => {
    beforeEach(async () => {
      await firebaseService.initialize();
      firebaseService.initialized = true;
      firebaseService.analytics = mockAnalytics;
    });

    it('should report error with context', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      const context = 'test_context';
      
      firebaseService.reportError(error, context);
      
      expect(mockAnalytics.logEvent).toHaveBeenCalledWith('error_occurred', {
        error_message: 'Test error',
        error_stack: 'Error stack trace',
        error_context: 'test_context',
        timestamp: expect.any(Number),
        page_location: 'https://test.example.com'
      });
    });

    it('should handle error reporting failure', () => {
      mockAnalytics.logEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });
      
      const testError = new Error('Original error');
      firebaseService.reportError(testError, 'test_context');
      
      expect(console.error).toHaveBeenCalledWith('Failed to report error to Firebase:', expect.any(Error));
    });
  });

  describe('trackPerformance', () => {
    let mockTrace;

    beforeEach(async () => {
      mockTrace = {
        start: vi.fn(),
        stop: vi.fn(),
        putAttribute: vi.fn(),
        putMetric: vi.fn()
      };
      mockPerformance.trace.mockReturnValue(mockTrace);
      await firebaseService.initialize();
      firebaseService.initialized = true;
      firebaseService.performance = mockPerformance;
    });

    it('should track performance metric with attributes', () => {
      const metric = 'load_time';
      const value = 1500;
      const attributes = { page: 'home', user_type: 'new' };
      
      firebaseService.trackPerformance(metric, value, attributes);
      
      expect(mockPerformance.trace).toHaveBeenCalledWith('load_time');
      expect(mockTrace.start).toHaveBeenCalled();
      expect(mockTrace.putAttribute).toHaveBeenCalledWith('page', 'home');
      expect(mockTrace.putAttribute).toHaveBeenCalledWith('user_type', 'new');
      expect(mockTrace.putMetric).toHaveBeenCalledWith('load_time', 1500);
      expect(mockTrace.stop).toHaveBeenCalled();
    });

    it('should track performance without attributes', () => {
      firebaseService.trackPerformance('simple_metric', 100);
      
      expect(mockPerformance.trace).toHaveBeenCalledWith('simple_metric');
      expect(mockTrace.putMetric).toHaveBeenCalledWith('simple_metric', 100);
    });

    it('should handle performance tracking errors', () => {
      mockPerformance.trace.mockImplementation(() => {
        throw new Error('Performance error');
      });
      
      firebaseService.trackPerformance('error_metric', 50);
      
      expect(console.error).toHaveBeenCalledWith('Failed to track performance metric:', expect.any(Error));
    });
  });

  describe('trackImageLoad', () => {
    beforeEach(async () => {
      await firebaseService.initialize();
      firebaseService.initialized = true;
      firebaseService.analytics = mockAnalytics;
      firebaseService.performance = mockPerformance;
      vi.spyOn(firebaseService, 'trackPerformance');
      vi.spyOn(firebaseService, 'trackUserInteraction');
    });

    it('should track successful image load', () => {
      const imageUrl = 'https://example.com/image.jpg';
      const loadTime = 800;
      
      firebaseService.trackImageLoad(imageUrl, loadTime, true);
      
      expect(firebaseService.trackPerformance).toHaveBeenCalledWith('image_load', 800, {
        image_url: 'https://example.com/image.jpg',
        success: 'true'
      });
      
      expect(firebaseService.trackUserInteraction).toHaveBeenCalledWith('image_load', {
        image_url: 'https://example.com/image.jpg',
        load_time: 800,
        success: true
      });
    });

    it('should track failed image load', () => {
      firebaseService.trackImageLoad('bad-url', 0, false);
      
      expect(firebaseService.trackPerformance).toHaveBeenCalledWith('image_load', 0, {
        image_url: 'bad-url',
        success: 'false'
      });
    });
  });

  describe('trackClick', () => {
    beforeEach(async () => {
      await firebaseService.initialize();
      firebaseService.initialized = true;
      firebaseService.analytics = mockAnalytics;
      vi.spyOn(firebaseService, 'trackUserInteraction');
    });

    it('should track manual click event', () => {
      firebaseService.trackClick('manual', 'https://example.com', false);
      
      expect(firebaseService.trackUserInteraction).toHaveBeenCalledWith('click_event', {
        click_type: 'manual',
        target_url: 'https://example.com',
        is_deeplink: false,
        timestamp: expect.any(Number)
      });
    });

    it('should track deeplink click event', () => {
      firebaseService.trackClick('auto', 'app://deeplink', true);
      
      expect(firebaseService.trackUserInteraction).toHaveBeenCalledWith('click_event', {
        click_type: 'auto',
        target_url: 'app://deeplink',
        is_deeplink: true,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('trackDecryption', () => {
    beforeEach(async () => {
      await firebaseService.initialize();
      firebaseService.initialized = true;
      firebaseService.analytics = mockAnalytics;
      firebaseService.performance = mockPerformance;
      vi.spyOn(firebaseService, 'trackUserInteraction');
      vi.spyOn(firebaseService, 'trackPerformance');
    });

    it('should track successful decryption', () => {
      firebaseService.trackDecryption(true, 250);
      
      expect(firebaseService.trackUserInteraction).toHaveBeenCalledWith('decryption_attempt', {
        success: true,
        processing_time: 250
      });
      
      expect(firebaseService.trackPerformance).toHaveBeenCalledWith('decryption_time', 250, {
        success: 'true'
      });
    });

    it('should track failed decryption', () => {
      firebaseService.trackDecryption(false, 100);
      
      expect(firebaseService.trackUserInteraction).toHaveBeenCalledWith('decryption_attempt', {
        success: false,
        processing_time: 100
      });
      
      expect(firebaseService.trackPerformance).toHaveBeenCalledWith('decryption_time', 100, {
        success: 'false'
      });
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(firebaseService.isInitialized()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      await firebaseService.initialize();
      expect(firebaseService.isInitialized()).toBe(true);
    });

    it('should return false after failed initialization', async () => {
      global.firebase = undefined;
      await firebaseService.initialize();
      expect(firebaseService.isInitialized()).toBe(false);
    });
  });
});