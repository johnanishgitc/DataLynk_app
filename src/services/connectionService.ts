export type ConnectionStatus = 'online' | 'offline' | 'unknown';

class ConnectionService {
  private isOnline: boolean = true;
  private listeners: ((status: ConnectionStatus) => void)[] = [];

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Test initial connection
      await this.testConnection();
    } catch (error) {
      console.error('❌ Failed to initialize connection service:', error);
      this.isOnline = false;
    }
  }

  // Get current connection status
  getConnectionStatus(): ConnectionStatus {
    return this.isOnline ? 'online' : 'offline';
  }

  // Check if currently online
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  // Add connection status listener
  addListener(callback: (status: ConnectionStatus) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    const status = this.getConnectionStatus();
    this.listeners.forEach(listener => listener(status));
  }

  // Test connection to Tally server
  async testTallyConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/tally/ping', {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      console.log('🔍 Tally connection test failed:', error);
      return false;
    }
  }

  // Test connection to main server
  async testServerConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        timeout: 3000,
      });
      return response.ok;
    } catch (error) {
      console.log('🔍 Server connection test failed:', error);
      return false;
    }
  }

  // Test general connection
  async testConnection(): Promise<boolean> {
    try {
      // Try a simple fetch to test basic connectivity
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        timeout: 3000,
      });
      
      const isConnected = response.ok;
      
      if (isConnected !== this.isOnline) {
        this.isOnline = isConnected;
        this.notifyListeners();
      }
      
      return isConnected;
    } catch (error) {
      console.log('🔍 Connection test failed:', error);
      const wasOnline = this.isOnline;
      this.isOnline = false;
      
      if (wasOnline !== this.isOnline) {
        this.notifyListeners();
      }
      
      return false;
    }
  }
}

export const connectionService = new ConnectionService();
