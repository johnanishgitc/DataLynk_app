import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { LoginResponse, UserConnection } from '../config/api';
import { apiService } from '../services/api';
import { navigationManager } from '../utils/navigationManager';
import { secureStorage } from '../utils/secureStorage';

// User data type
export interface UserData {
  name: string;
  email: string;
  token: string;
  is_first_login: number;
}

// Selected company data type
export interface SelectedCompany {
  company: string;
  shared_email: string;
  access_type: string;
  tallyloc_id: string;
  GUID: string;
  booksfrom?: string;
  startingfrom?: string;
  address?: string;
  pincode?: string;
  statename?: string;
  countryname?: string;
  email?: string;
  phonenumber?: string;
  mobilenumbers?: string;
  gstinno?: string;
  status?: string;
  createdAt?: string;
}

interface UserContextType {
  userData: UserData | null;
  setUserData: (data: UserData | null) => void;
  selectedCompany: SelectedCompany | null;
  setSelectedCompany: (company: SelectedCompany | null) => void;
  clearUserData: () => void;
  isSessionRestoring: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [userData, setUserDataState] = useState<UserData | null>(null);
  const [selectedCompany, setSelectedCompanyState] = useState<SelectedCompany | null>(null);
  const [isSessionRestoring, setIsSessionRestoring] = useState(true);

  // Restore session on app startup
  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('🔄 Restoring session on app startup...');
        
        // Try to get stored token and user data
        const storedToken = await secureStorage.getToken();
        const storedUserData = await secureStorage.getUserData();
        
        console.log('🔍 Stored session data:', {
          hasToken: !!storedToken,
          hasUserData: !!storedUserData,
          tokenLength: storedToken?.length,
          userId: storedUserData?.id,
          userName: storedUserData?.name
        });
        
        if (storedToken && storedUserData) {
          // Validate that token and user data are consistent
          if (storedUserData.token !== storedToken) {
            console.log('⚠️ Token mismatch detected, clearing session...');
            await secureStorage.clearTokens();
            await secureStorage.clearUserData();
            apiService.clearAuthToken();
            setUserDataState(null);
          } else {
            // Check if token is expired
            try {
              const tokenPayload = JSON.parse(atob(storedToken.split('.')[1]));
              const currentTime = Math.floor(Date.now() / 1000);
              const tokenExpiry = tokenPayload.exp;
              
              console.log('🕐 Token expiry check:', {
                currentTime,
                tokenExpiry,
                isExpired: currentTime >= tokenExpiry,
                expiresIn: tokenExpiry - currentTime
              });
              
              if (currentTime >= tokenExpiry) {
                console.log('⏰ Token has expired, clearing session and redirecting to login');
                // Clear expired session
                await secureStorage.clearTokens();
                await secureStorage.clearUserData();
                apiService.clearAuthToken();
                setUserDataState(null);
                return; // Don't restore the session
              }
            } catch (error) {
              console.log('❌ Error parsing token, clearing session');
              // Clear corrupted token
              await secureStorage.clearTokens();
              await secureStorage.clearUserData();
              apiService.clearAuthToken();
              setUserDataState(null);
              return;
            }
            
            // Set auth token in API service
            apiService.setAuthToken(storedToken);
            
            // Restore user data in context
            setUserDataState(storedUserData);
            
            console.log('✅ Session restored successfully for user:', storedUserData.name);
          }
        } else {
          console.log('ℹ️ No stored session found');
        }
      } catch (error) {
        console.error('❌ Error restoring session:', error);
        // Clear any corrupted data
        await secureStorage.clearTokens();
        await secureStorage.clearUserData();
        apiService.clearAuthToken();
        setUserDataState(null);
      } finally {
        // Session restoration is complete
        setIsSessionRestoring(false);
        console.log('🏁 Session restoration completed');
      }
    };

    restoreSession();
  }, []); // Run only once on mount

  // Ensure API Service token is synced with UserContext
  useEffect(() => {
    if (userData && userData.token) {
      try {
        apiService.setAuthToken(userData.token);
      } catch (error) {
        console.error('Error setting token in API Service:', error);
      }
    } else {
      try {
        apiService.clearAuthToken();
      } catch (error) {
        console.error('Error clearing API Service token:', error);
      }
    }
  }, [userData]);

  // Memoized setter functions to prevent unnecessary re-renders
  const setUserData = useCallback(async (data: UserData | null) => {
    try {
      // If setting new user data, clear all previous session data first
      if (data && data.token) {
        console.log('🔄 Setting new user data, clearing previous session...');
        
        // Clear all previous session data first
        try {
          await secureStorage.clearTokens();
          await secureStorage.clearUserData();
          apiService.clearAuthToken();
          console.log('✅ Previous session data cleared');
        } catch (error) {
          console.error('⚠️ Error clearing previous session:', error);
        }
        
        // Set new user data
        setUserDataState(data);
        
        try {
          // Store new token without expiration (indefinite session)
          await secureStorage.storeToken(data.token, undefined, undefined, data.email);
          
          // Store new user data
          await secureStorage.storeUserData(data);
          
          // Set auth token in API service
          apiService.setAuthToken(data.token);
          
          console.log('✅ New user session stored successfully');
        } catch (error) {
          console.error('❌ Error storing new user session:', error);
        }
      } else {
        // Clearing user data
        console.log('🔄 Clearing user data...');
        setUserDataState(data);
        
        try {
          // Clear stored session data
          await secureStorage.clearTokens();
          await secureStorage.clearUserData();
          
          // Clear API service token
          apiService.clearAuthToken();
          
          console.log('✅ User session cleared successfully');
        } catch (error) {
          console.error('❌ Error clearing user session:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error setting user data:', error);
    }
  }, []);

  const setSelectedCompany = useCallback((company: SelectedCompany | null) => {
    try {
      setSelectedCompanyState(company);
    } catch (error) {
      console.error('Error setting selected company:', error);
    }
  }, []);

  const clearUserData = useCallback(async () => {
    try {
      // Clear auth token in API service first
      apiService.clearAuthToken();
      
      // Clear secure storage
      await secureStorage.clearTokens();
      await secureStorage.clearUserData();
      
      // Note: Company data is preserved for offline use - user controls data deletion
      console.log('✅ Company data preserved for offline use');
      
      // Clear state immediately
      setUserDataState(null);
      setSelectedCompanyState(null);
      
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
      // Force clear even if there's an error
      apiService.clearAuthToken();
      setUserDataState(null);
      setSelectedCompanyState(null);
    }
  }, []);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    userData,
    setUserData,
    selectedCompany,
    setSelectedCompany,
    clearUserData,
    isSessionRestoring
  }), [userData, selectedCompany, setUserData, setSelectedCompany, clearUserData, isSessionRestoring]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};
