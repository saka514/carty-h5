/**
 * Tests for browser compatibility fixes
 */

// Import DisplayController
import DisplayController from './display-controller.js';

describe('Browser Compatibility', () => {
  let displayController;
  let originalUserAgent;
  
  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div id="app-container">
        <div id="image-container">
          <div id="display-image" style="display: none;"></div>
        </div>
        <div id="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading...</p>
        </div>
        <div id="error-state" style="display: none;">
          <div class="error-icon">⚠</div>
          <h2>Error</h2>
          <p id="error-message">Something went wrong. Please try again.</p>
        </div>
      </div>
    `;
    
    // Store original user agent
    originalUserAgent = navigator.userAgent;
    
    // Create a new DisplayController instance
    displayController = new DisplayController();
  });
  
  afterEach(() => {
    // Clean up
    if (displayController) {
      displayController.destroy();
    }
    
    // Restore original user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
    
    // Clean up DOM
    document.body.innerHTML = '';
  });
  
  // Helper function to mock user agent
  function mockUserAgent(userAgent) {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      configurable: true
    });
  }
  
  test('should detect browser capabilities correctly', () => {
    expect(displayController.browser).toBeDefined();
    expect(typeof displayController.browser.isIOS).toBe('boolean');
    expect(typeof displayController.browser.isAndroid).toBe('boolean');
    expect(typeof displayController.browser.isFirefox).toBe('boolean');
    expect(typeof displayController.browser.isEdge).toBe('boolean');
    expect(typeof displayController.browser.isIE).toBe('boolean');
    expect(typeof displayController.browser.isSafari).toBe('boolean');
    expect(typeof displayController.browser.isChrome).toBe('boolean');
    expect(typeof displayController.browser.isHighDPI).toBe('boolean');
    expect(typeof displayController.browser.supportsBackgroundSize).toBe('boolean');
    expect(typeof displayController.browser.supportsFlex).toBe('boolean');
    expect(typeof displayController.browser.supportsTransform).toBe('boolean');
  });
  
  test('should apply iOS specific fixes when on iOS', () => {
    // Mock iOS user agent
    mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
    
    // Re-initialize display controller with mocked user agent
    displayController.destroy();
    displayController = new DisplayController();
    
    // Check if iOS was detected
    expect(displayController.browser.isIOS).toBe(true);
    
    // Apply device specific optimizations
    const element = document.getElementById('display-image');
    displayController.applyDeviceSpecificOptimizations(element);
    
    // Check if iOS specific styles were applied
    expect(element.style.webkitBackfaceVisibility).toBe('hidden');
    expect(element.style.webkitPerspective).toBe('1000');
    expect(element.style.webkitTransform).toBe('translate3d(0, 0, 0)');
  });
  
  test('should apply Android specific fixes when on Android', () => {
    // Mock Android user agent
    mockUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36');
    
    // Re-initialize display controller with mocked user agent
    displayController.destroy();
    displayController = new DisplayController();
    
    // Check if Android was detected
    expect(displayController.browser.isAndroid).toBe(true);
    
    // Apply device specific optimizations
    const element = document.getElementById('display-image');
    displayController.applyDeviceSpecificOptimizations(element);
    
    // Check if Android specific styles were applied
    expect(element.style.backgroundAttachment).toBe('scroll');
    expect(element.style.willChange).toBe('transform');
    expect(element.style.webkitTransform).toBe('translate3d(0, 0, 0)');
  });
  
  test('should set background image with fallbacks', () => {
    const imageUrl = 'https://example.com/image.jpg';
    
    // Call the method
    displayController.setBackgroundImageWithFallbacks(imageUrl);
    
    // Check if background image was set
    const element = document.getElementById('display-image');
    expect(element.style.backgroundImage).toBe(`url("${imageUrl}")`);
  });
  
  test('should handle IE specific background image setting', () => {
    // Mock IE user agent
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko');
    
    // Re-initialize display controller with mocked user agent
    displayController.destroy();
    displayController = new DisplayController();
    
    // Check if IE was detected
    expect(displayController.browser.isIE).toBe(true);
    
    const imageUrl = 'https://example.com/image.jpg';
    
    // Call the method
    displayController.setBackgroundImageWithFallbacks(imageUrl);
    
    // Check if IE specific background image was set (without quotes)
    const element = document.getElementById('display-image');
    expect(element.style.backgroundImage).toBe(`url(${imageUrl})`);
  });
});