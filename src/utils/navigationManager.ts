// Global navigation state manager
// This avoids using Expo Router before the app is fully mounted

type NavigationAction = {
  type: 'navigate' | 'replace';
  route: string;
  timestamp: number;
};

class NavigationManager {
  private isAppReady = false;
  private navigationQueue: NavigationAction[] = [];
  private readyCallbacks: (() => void)[] = [];

  // Mark app as ready
  setAppReady() {
    if (this.isAppReady) {
      return;
    }
    
    this.isAppReady = true;
    
    // Process queued navigation safely
    setTimeout(() => {
      this.processQueue();
    }, 100);
    
    // Notify all ready callbacks safely
    setTimeout(() => {
      this.readyCallbacks.forEach(callback => callback());
      this.readyCallbacks = [];
    }, 200);
  }

  // Check if app is ready
  isReady() {
    return this.isAppReady;
  }
  
  // Check if navigation is in progress
  isNavigating() {
    return this.navigationQueue.length > 0;
  }
  
  // Get queue status
  getQueueStatus() {
    return {
      isReady: this.isAppReady,
      queueLength: this.navigationQueue.length,
      readyCallbacks: this.readyCallbacks.length
    };
  }

  // Queue navigation until app is ready
  queueNavigation(action: NavigationAction) {
    // Prevent duplicate navigation to the same route
    const isDuplicate = this.navigationQueue.some(
      queued => queued.type === action.type && queued.route === action.route
    );
    
    if (isDuplicate) {
      return;
    }
    
    // Prevent multiple logout attempts
    if (action.route === '/' && this.navigationQueue.some(queued => queued.route === '/')) {
      return;
    }
    
    if (this.isAppReady) {
      this.executeNavigation(action);
    } else {
      this.navigationQueue.push(action);
    }
  }

  // Process queued navigation
  private processQueue() {
    // Process queue safely to prevent infinite loops
    const actionsToProcess = [...this.navigationQueue];
    this.navigationQueue = [];
    
    actionsToProcess.forEach((action, index) => {
      this.executeNavigation(action);
    });
  }

  // Execute navigation (this will be called when app is ready)
  private executeNavigation(action: NavigationAction) {
    try {
      // Import router dynamically to avoid early initialization
      const { router } = require('expo-router');
      
      // Check if router is available and ready
      if (!router) {
        console.log('Navigation Manager: Router not available, queuing navigation');
        this.navigationQueue.push(action);
        return;
      }
      
      if (action.type === 'replace') {
        router.replace(action.route);
      } else {
        router.push(action.route);
      }
      
      // Navigation executed successfully
      console.log(`Navigation Manager: Successfully ${action.type} to ${action.route}`);
    } catch (error) {
      console.error(`Navigation Manager: Failed to ${action.type} to ${action.route}:`, error);
      
      // If navigation fails due to timing, retry after a delay
      if (error instanceof Error && error.message.includes('before mounting')) {
        console.log('Navigation Manager: App not ready, retrying in 1 second...');
        setTimeout(() => {
          this.executeNavigation(action);
        }, 1000);
        return;
      }
      
      // If navigation fails, don't retry immediately to prevent loops
      // But keep the action in queue for later retry
      if (!this.navigationQueue.includes(action)) {
        this.navigationQueue.push(action);
      }
    }
  }

  // Navigate (push)
  navigate(route: string) {
    // Prevent navigation to current route if already there
    if (this.isAppReady && route === '/') {
      return;
    }
    
    // Add to queue
    this.queueNavigation({ type: 'navigate', route });
    
    // Process queue if app is ready
    if (this.isAppReady) {
      this.processQueue();
    }
  }

  // Replace navigation
  replace(route: string) {
    // Prevent navigation to current route if already there
    if (this.isAppReady && route === '/') {
      return;
    }
    
    // Add to queue
    this.queueNavigation({ type: 'replace', route });
    
    // Process queue if app is ready
    if (this.isAppReady) {
      this.processQueue();
    } else {
      // If app is not ready, wait a bit and try again
      setTimeout(() => {
        if (this.isAppReady) {
          this.processQueue();
        }
      }, 500);
    }
  }

  // Wait for app to be ready
  onReady(callback: () => void) {
    if (this.isAppReady) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  // Clear all queued navigation
  clearQueue() {
    this.navigationQueue = [];
  }
  
  // Reset the navigation manager (for testing/debugging)
  reset() {
    this.isAppReady = false;
    this.navigationQueue = [];
    this.readyCallbacks = [];
  }
}

// Export singleton instance
export const navigationManager = new NavigationManager();

// Only auto-mark ready if not already done and not already scheduled
if (!navigationManager.isReady() && !global.__navigationManagerScheduled) {
  global.__navigationManagerScheduled = true;
  
  if (typeof window !== 'undefined') {
    // Web environment
    setTimeout(() => {
      navigationManager.setAppReady();
    }, 1000);
  } else {
    // Mobile environment - mark ready after a longer delay
    setTimeout(() => {
      navigationManager.setAppReady();
    }, 2000);
  }
}

// Auto-mark ready when navigation manager is created
if (!global.__navigationManagerInitialized) {
  global.__navigationManagerInitialized = true;
}
