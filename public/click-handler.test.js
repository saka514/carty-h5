/**
 * ClickHandler Unit Tests
 * Tests for click handling, auto-click functionality, and URL routing logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ClickHandler Auto-click Functionality', () => {
  let clickHandler;
  let mockInstructionSet;
  let ClickHandler;

  beforeEach(async () => {
    // Import the ClickHandler class
    ClickHandler = (await import('./click-handler.js')).default || 
      (await import('./click-handler.js')).ClickHandler ||
      require('./click-handler.js');
    
    // Reset DOM
    document.body.innerHTML = '';
    
    // Create fresh ClickHandler instance
    clickHandler = new ClickHandler();
    
    // Mock instruction set
    mockInstructionSet = {
      image_url: 'https://example.com/image.jpg',
      click_url: 'https://example.com/click',
      deeplink_url: 'myapp://deeplink',
      auto_click: false,
      deeplink_priority: false,
      auto_click_delay: 2000
    };

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Use fake timers for auto-click testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clean up timers and handlers
    if (clickHandler) {
      clickHandler.destroy();
    }
    
    // Clear all timers
    vi.clearAllTimers();
    vi.useRealTimers();
    
    // Restore console methods
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  it('should not schedule auto-click when auto_click is disabled (default)', () => {
    // Requirement 4.1: WHEN auto-click is disabled (default) THEN the system SHALL wait for manual user interaction
    const instructionSet = { ...mockInstructionSet, auto_click: false };
    
    clickHandler.initialize(instructionSet);
    
    expect(clickHandler.autoClickTimer).toBeNull();
    
    // Fast-forward time to ensure no auto-click is triggered
    vi.advanceTimersByTime(10000);
    expect(clickHandler.autoClickTimer).toBeNull();
  });

  it('should schedule auto-click when auto_click is enabled', () => {
    // Requirement 4.2: WHEN auto-click is enabled THEN the system SHALL automatically trigger the click action after page load
    const instructionSet = { ...mockInstructionSet, auto_click: true };
    
    clickHandler.initialize(instructionSet);
    
    expect(clickHandler.autoClickTimer).not.toBeNull();
  });

  it('should use custom delay when auto_click_delay is specified', () => {
    // Requirement 4.4: WHEN auto-click timing is configured THEN the system SHALL respect the specified delay before triggering
    const customDelay = 5000;
    const instructionSet = { 
      ...mockInstructionSet, 
      auto_click: true,
      auto_click_delay: customDelay
    };
    
    // Mock processClickAction to verify it gets called
    const processClickSpy = vi.spyOn(clickHandler, 'processClickAction').mockResolvedValue();
    
    clickHandler.initialize(instructionSet);
    
    // Fast-forward by less than custom delay - should not trigger
    vi.advanceTimersByTime(customDelay - 1000);
    expect(processClickSpy).not.toHaveBeenCalled();
    
    // Fast-forward to exact custom delay - should trigger
    vi.advanceTimersByTime(1000);
    expect(processClickSpy).toHaveBeenCalledWith('auto_click');
  });

  it('should follow deeplink priority logic for auto-click', async () => {
    // Requirement 4.3: WHEN auto-click is triggered THEN the system SHALL follow the same deeplink priority logic as manual clicks
    const instructionSet = { 
      ...mockInstructionSet, 
      auto_click: true,
      deeplink_priority: true,
      auto_click_delay: 1000
    };
    
    // Mock the deeplink attempt methods
    const attemptDeeplinkSpy = vi.spyOn(clickHandler, 'attemptDeeplinkWithFallback').mockResolvedValue();
    
    clickHandler.initialize(instructionSet);
    
    // Fast-forward to trigger auto-click
    vi.advanceTimersByTime(1000);
    
    // Wait for async operations using fake timers
    await vi.runAllTimersAsync();
    
    expect(attemptDeeplinkSpy).toHaveBeenCalled();
  });

  it('should cancel auto-click timer when cancelAutoClick is called', () => {
    const instructionSet = { ...mockInstructionSet, auto_click: true };
    
    clickHandler.initialize(instructionSet);
    expect(clickHandler.autoClickTimer).not.toBeNull();
    
    clickHandler.cancelAutoClick();
    expect(clickHandler.autoClickTimer).toBeNull();
  });

  it('should clean up auto-click timer on destroy', () => {
    const instructionSet = { ...mockInstructionSet, auto_click: true };
    
    clickHandler.initialize(instructionSet);
    expect(clickHandler.autoClickTimer).not.toBeNull();
    
    clickHandler.destroy();
    expect(clickHandler.autoClickTimer).toBeNull();
  });
});