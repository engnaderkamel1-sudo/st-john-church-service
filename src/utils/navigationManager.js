import { useEffect, useRef } from 'react';

// Priority Levels for Hierarchical Back Navigation
export const NAV_PRIORITY = {
  LIGHTBOX: 50,  // Full-screen photo/document/video lightboxes
  MODAL: 40,     // Popups, forms, confirmation dialogs
  DRAWER: 30,    // Navigation menus, sidebars, notification panels
  SUBVIEW: 20,   // Sub-sections (e.g. lecture within subject)
  TAB: 10,       // Top-level tab navigation back to home
};

let handlers = [];
let nextHandlerId = 1;
let isInitialized = false;
let lastBackPressTime = 0;
const exitListeners = new Set();

/**
 * Subscribe to exit prompt events (triggered when back is pressed at root view)
 */
export function onExitPrompt(listener) {
  exitListeners.add(listener);
  return () => exitListeners.delete(listener);
}

function notifyExitPrompt() {
  exitListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Exit prompt listener error:', e);
    }
  });
}

function ensureSentinel() {
  if (typeof window === 'undefined') return;
  try {
    window.history.pushState({ pwaSentinel: true, t: Date.now() }, '', window.location.href);
  } catch (e) {
    // History push error ignored
  }
}

/**
 * Initializes the global Back button interceptor for PWA & mobile browsers
 */
export function initNavigationManager() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  // Set the initial sentinel state
  ensureSentinel();

  window.addEventListener('popstate', () => {
    // If any back handlers are registered (modals, drawers, subviews, tabs)
    if (handlers.length > 0) {
      // Pick highest priority handler, tie-broken by latest registration
      handlers.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return b.id - a.id;
      });

      const topHandler = handlers.shift();
      try {
        topHandler.callback();
      } catch (err) {
        console.warn('Back handler error:', err);
      }

      // Re-arm sentinel so the next back press is also caught
      ensureSentinel();
      return;
    }

    // No handlers registered: user is on the root screen
    const now = Date.now();
    if (now - lastBackPressTime < 2000) {
      // User pressed back twice within 2 seconds: allow default navigation (exits app)
      lastBackPressTime = 0;
    } else {
      // First back press at root: warn user with toast and re-arm sentinel
      lastBackPressTime = now;
      notifyExitPrompt();
      ensureSentinel();
    }
  });
}

/**
 * Register a low-level callback to run on back press
 */
export function registerBackHandler(callback, priority = NAV_PRIORITY.TAB) {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }

  const id = nextHandlerId++;
  const handler = { id, callback, priority };
  handlers.push(handler);

  return () => {
    handlers = handlers.filter((h) => h.id !== id);
  };
}

/**
 * React Hook: Bind a modal or drawer's open state to the mobile back button
 */
export function useBackHandler(isOpen, onClose, priority = NAV_PRIORITY.MODAL) {
  const callbackRef = useRef(onClose);
  callbackRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      if (typeof callbackRef.current === 'function') {
        callbackRef.current();
      }
    }, priority);
  }, [isOpen, priority]);
}

/**
 * React Hook: Manage tab navigation history so back button returns to previous tab or home
 */
export function useTabBackHandler(activeTab, setActiveTab, defaultTab = 'home') {
  const historyRef = useRef([activeTab]);
  const setActiveTabRef = useRef(setActiveTab);
  setActiveTabRef.current = setActiveTab;

  useEffect(() => {
    const history = historyRef.current;
    if (history[history.length - 1] !== activeTab) {
      if (activeTab === defaultTab) {
        historyRef.current = [defaultTab];
      } else {
        history.push(activeTab);
      }
    }
  }, [activeTab, defaultTab]);

  useEffect(() => {
    if (activeTab === defaultTab) return;

    return registerBackHandler(() => {
      const history = historyRef.current;
      history.pop(); // Remove current tab
      const prev = history[history.length - 1] || defaultTab;
      if (typeof setActiveTabRef.current === 'function') {
        setActiveTabRef.current(prev);
      }
    }, NAV_PRIORITY.TAB);
  }, [activeTab, defaultTab]);
}
