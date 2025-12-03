import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Encryption key (in production, this should be stored securely)
const ENCRYPTION_KEY = 'tally_catalyst_secure_key_2024';

export interface SecureStorageData {
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
}

class SecureStorage {
  private static instance: SecureStorage;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  // Simple XOR encryption for demo purposes
  // In production, use a proper encryption library like react-native-crypto-js
  private encrypt(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
    }
    return btoa(result); // Base64 encode
  }

  private decrypt(encryptedText: string): string {
    try {
      const decoded = atob(encryptedText);
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
      }
      return result;
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if storage is available
      await AsyncStorage.getItem('__test__');
      this.isInitialized = true;
    } catch (error) {
      console.error('Secure storage initialization failed:', error);
      throw new Error('Secure storage not available');
    }
  }

  async storeToken(token: string, refreshToken?: string, expiresAt?: number, userId?: string): Promise<void> {
    await this.initialize();

    const data: SecureStorageData = {
      token,
      refreshToken,
      expiresAt,
      userId,
    };

    try {
      const encryptedData = this.encrypt(JSON.stringify(data));
      await AsyncStorage.setItem('auth_tokens', encryptedData);
      
      // Store token expiry for automatic cleanup
      if (expiresAt) {
        await AsyncStorage.setItem('token_expiry', expiresAt.toString());
      }
    } catch (error) {
      console.error('Failed to store token:', error);
      throw new Error('Token storage failed');
    }
  }

  async getToken(): Promise<string | null> {
    await this.initialize();

    try {
      const encryptedData = await AsyncStorage.getItem('auth_tokens');
      if (!encryptedData) return null;

      const decryptedData = this.decrypt(encryptedData);
      const data: SecureStorageData = JSON.parse(decryptedData);

      // Token expiration check removed - sessions are kept active indefinitely
      // until user explicitly logs off

      return data.token;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      await this.clearTokens(); // Clear corrupted data
      return null;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    await this.initialize();

    try {
      const encryptedData = await AsyncStorage.getItem('auth_tokens');
      if (!encryptedData) return null;

      const decryptedData = this.decrypt(encryptedData);
      const data: SecureStorageData = JSON.parse(decryptedData);

      return data.refreshToken || null;
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  async getUserId(): Promise<string | null> {
    await this.initialize();

    try {
      const encryptedData = await AsyncStorage.getItem('auth_tokens');
      if (!encryptedData) return null;

      const decryptedData = this.decrypt(encryptedData);
      const data: SecureStorageData = JSON.parse(decryptedData);

      return data.userId || null;
    } catch (error) {
      console.error('Failed to retrieve user ID:', error);
      return null;
    }
  }

  async isTokenValid(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  async clearTokens(): Promise<void> {
    await this.initialize();

    try {
      await AsyncStorage.multiRemove([
        'auth_tokens',
        'token_expiry',
        'user_data',
        'selected_company'
        // Note: saved_credentials is intentionally NOT cleared here
        // so that "Remember Me" functionality persists after logout
      ]);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  async getTokenExpiry(): Promise<number | null> {
    await this.initialize();

    try {
      const expiry = await AsyncStorage.getItem('token_expiry');
      return expiry ? parseInt(expiry, 10) : null;
    } catch (error) {
      console.error('Failed to get token expiry:', error);
      return null;
    }
  }

  // Cleanup expired tokens
  async cleanupExpiredTokens(): Promise<void> {
    await this.initialize();

    try {
      const expiry = await this.getTokenExpiry();
      if (expiry && Date.now() > expiry) {
        await this.clearTokens();
      }
    } catch (error) {
      console.error('Token cleanup failed:', error);
    }
  }

  // Store user data securely
  async storeUserData(userData: any): Promise<void> {
    await this.initialize();

    try {
      const encryptedData = this.encrypt(JSON.stringify(userData));
      await AsyncStorage.setItem('user_data', encryptedData);
    } catch (error) {
      console.error('Failed to store user data:', error);
      throw new Error('User data storage failed');
    }
  }

  // Retrieve user data securely
  async getUserData(): Promise<any | null> {
    await this.initialize();

    try {
      const encryptedData = await AsyncStorage.getItem('user_data');
      if (!encryptedData) return null;

      const decryptedData = this.decrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  }

  // Clear user data
  async clearUserData(): Promise<void> {
    await this.initialize();

    try {
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }

  // Store login credentials
  async storeCredentials(emailOrPhone: string, password: string): Promise<void> {
    await this.initialize();

    try {
      const credentials = {
        emailOrPhone,
        password,
        timestamp: Date.now()
      };
      
      const encryptedData = this.encrypt(JSON.stringify(credentials));
      
      await AsyncStorage.setItem('saved_credentials', encryptedData);
    } catch (error) {
      console.error('❌ Failed to store credentials:', error);
      throw new Error('Credential storage failed');
    }
  }

  // Retrieve saved credentials
  async getCredentials(): Promise<{ emailOrPhone: string; password: string } | null> {
    await this.initialize();

    try {
      const encryptedData = await AsyncStorage.getItem('saved_credentials');
      
      if (!encryptedData) {
        return null;
      }

      const decryptedData = this.decrypt(encryptedData);
      const credentials = JSON.parse(decryptedData);
      
      // Return credentials if they're not too old (30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      if (credentials.timestamp && credentials.timestamp > thirtyDaysAgo) {
        return {
          emailOrPhone: credentials.emailOrPhone,
          password: credentials.password
        };
      }
      
      // Clear old credentials
      await this.clearCredentials();
      return null;
    } catch (error) {
      console.error('❌ Failed to retrieve credentials:', error);
      await this.clearCredentials(); // Clear corrupted data
      return null;
    }
  }

  // Clear saved credentials
  async clearCredentials(): Promise<void> {
    await this.initialize();

    try {
      await AsyncStorage.removeItem('saved_credentials');
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    }
  }
}

export const secureStorage = SecureStorage.getInstance();
export default SecureStorage;


