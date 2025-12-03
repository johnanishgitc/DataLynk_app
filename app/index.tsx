import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { apiService } from '../src/services/api';
import { useUser } from '../src/context/UserContext';
import { secureStorage } from '../src/utils/secureStorage';
import { backendConfigService } from '../src/services/backendConfigService';
import { useRoles } from '../src/context/RolesContext';
import { useConfiguration } from '../src/context/ConfigurationContext';

export default function LoginPage() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [rememberCredentials, setRememberCredentials] = useState(false);
  const { userData, setUserData, clearUserData } = useUser();
  const { clearRoles } = useRoles();
  const { setRolesData } = useConfiguration();
  const { logout } = useLocalSearchParams();

  // Load saved credentials on component mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedCredentials = await secureStorage.getCredentials();
        
        if (savedCredentials) {
          setEmailOrPhone(savedCredentials.emailOrPhone);
          setPassword(savedCredentials.password);
          setRememberCredentials(true);
        }
      } catch (error) {
        console.error('❌ Error loading saved credentials:', error);
      }
    };

    loadSavedCredentials();
  }, []);

  // Check for existing authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // If coming from logout, skip authentication check and clear user data
        if (logout === 'true') {
          await clearUserData(); // Ensure user data is cleared
          backendConfigService.clearCache(); // Clear backend config cache
          clearRoles(); // Clear roles data
          setRolesData(null); // Clear roles in ConfigurationContext
          console.log('🔄 Cleared all cached data on logout');
          setIsCheckingAuth(false);
          setHasRedirected(false); // Reset redirect flag
          // Clear the logout parameter from URL after processing
          router.replace('/', { replace: true });
          return;
        }
        
        // Give more time for session restoration to complete
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (userData && userData.token) {
          setHasRedirected(true);
          router.replace('/company-selection');
        }
      } catch (error) {
        console.error('❌ Error checking authentication:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [logout, clearUserData, clearRoles, setRolesData]); // Add all dependencies

  // Handle userData changes after initial check
  useEffect(() => {
    // Skip this effect if coming from logout or if we're still checking auth
    if (logout === 'true' || isCheckingAuth) {
      return;
    }
    
    if (!hasRedirected) {
      if (userData && userData.token) {
        setHasRedirected(true);
        router.replace('/company-selection');
      } else if (userData === null) {
        setHasRedirected(false); // Reset flag for next login
      }
    }
  }, [userData, isCheckingAuth, hasRedirected, logout]);


  // Reset form and ensure clean state when page becomes active
  useFocusEffect(
    useCallback(() => {
      // Only reset form if we're not checking authentication and not coming from logout
      if (!isCheckingAuth && logout !== 'true') {
        // Only clear form if no credentials are loaded and form is empty
        if (!rememberCredentials) {
          setEmailOrPhone('');
          setPassword('');
        }
        setShowPassword(false);
        setIsLoading(false);
      }
      
      return () => {
        // Cleanup when leaving the page
      };
    }, [isCheckingAuth, logout, rememberCredentials])
  );

  // Memoized validation function
  const validateForm = useCallback((): boolean => {
    if (!emailOrPhone.trim()) {
      Alert.alert('Error', 'Please enter your email or phone number');
      return false;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return false;
    }
    return true;
  }, [emailOrPhone, password]);

  // Memoized login handler
  const handleLogin = useCallback(async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Clear backend config and roles cache on fresh login
      backendConfigService.clearCache();
      clearRoles();
      setRolesData(null);
      console.log('🔄 Backend config and roles cache cleared for fresh login');
      
      const response = await apiService.login({
        username: emailOrPhone.trim(),
        password: password.trim(),
      });

      if (response.success && response.data) {
        const loginData = response.data;
        
        // Store user data in context (this will also set the auth token and save to storage)
        await setUserData(loginData);
        
        // Save credentials if remember is checked
        if (rememberCredentials) {
          try {
            await secureStorage.storeCredentials(emailOrPhone.trim(), password.trim());
          } catch (error) {
            console.error('❌ Failed to save credentials:', error);
            // Don't show error to user as this is not critical
          }
        } else {
          // Clear saved credentials if remember is unchecked
          try {
            await secureStorage.clearCredentials();
          } catch (error) {
            console.error('❌ Failed to clear credentials:', error);
          }
        }
        
        // Check if this is the first login
        if (loginData.is_first_login === 1) {
          router.push('/reset-password');
        } else {
          // Regular login success - navigate to company selection
          router.push('/company-selection');
        }
      } else {
        // Show specific error message for incorrect credentials
        const errorMessage = response.message || 'Incorrect username or password. Please try again.';
        Alert.alert('Login Failed', errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Check if this is a network error and we have cached data
      const isNetworkError = error instanceof TypeError && 
        (error.message.includes('Network request failed') || 
         error.message.includes('fetch'));
      
      if (isNetworkError) {
        try {
          // Check for cached credentials and token
          const cachedToken = await secureStorage.getToken();
          const cachedUserData = await secureStorage.getUserData();
          
          // Check if token is still valid
          let isTokenValid = false;
          if (cachedToken && cachedUserData) {
            try {
              const tokenPayload = JSON.parse(atob(cachedToken.split('.')[1]));
              const currentTime = Math.floor(Date.now() / 1000);
              isTokenValid = currentTime < tokenPayload.exp;
            } catch (tokenError) {
              console.log('❌ Error parsing cached token:', tokenError);
            }
          }
          
          if (isTokenValid && cachedUserData) {
            // Restore session and allow offline access
            console.log('🔄 Network error detected, restoring cached session for offline access');
            await setUserData(cachedUserData);
            
            Alert.alert(
              'Offline Mode',
              'You are offline. Using cached data from your last session.',
              [
                {
                  text: 'Continue',
                  onPress: () => router.push('/company-selection')
                }
              ]
            );
            return;
          } else {
            // No valid cached data
            Alert.alert(
              'No Offline Data',
              'You are offline and have no cached data. Please connect to the internet to login.',
              [{ text: 'OK' }]
            );
            return;
          }
        } catch (cacheError) {
          console.error('❌ Error checking cached data:', cacheError);
        }
      }
      
      // Generic connection error for other cases
      Alert.alert('Connection Error', 'Unable to connect to the server. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [validateForm, emailOrPhone, password, setUserData, rememberCredentials, clearRoles, setRolesData]);

  // Memoized navigation handlers
  const handleSignup = useCallback(() => {
    router.push('/signup');
  }, []);

  const handleForgotPassword = useCallback(() => {
    router.push('/forgot-password');
  }, []);

  const handleLogoPress = useCallback(() => {
    Linking.openURL('https://www.itcatalystindia.com');
  }, []);

  // Memoized password toggle handler
  const handlePasswordToggle = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Memoized input change handlers
  const handleEmailOrPhoneChange = useCallback((text: string) => {
    setEmailOrPhone(text);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
  }, []);

  // Memoized styles to prevent recreation
  const containerStyle = useMemo(() => [
    styles.container,
    Platform.OS === 'ios' && styles.containerIOS
  ], []);

  const loginButtonStyle = useMemo(() => [
    styles.loginButton,
    isLoading && styles.loginButtonDisabled
  ], [isLoading]);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={containerStyle} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleLogoPress}>
              <Image
                source={require('../assets/DLlogo.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>



          {/* Login Form */}
          <View style={styles.form}>
            {/* Email/Phone Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email or Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email or phone number"
                value={emailOrPhone}
                onChangeText={handleEmailOrPhoneChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                autoComplete="off"
                spellCheck={false}
                textContentType="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, { borderWidth: 0 }]}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  autoComplete="off"
                  spellCheck={false}
                  textContentType="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={handlePasswordToggle}
                  disabled={isLoading}
                >
                  <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me Checkbox */}
            <View style={styles.rememberContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberCredentials(!rememberCredentials)}
                disabled={isLoading}
              >
                <View style={[styles.checkbox, rememberCredentials && styles.checkboxChecked]}>
                  {rememberCredentials && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={loginButtonStyle}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword} disabled={isLoading}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up Section */}
          <View style={styles.signupSection}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignup} disabled={isLoading}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Website Link */}
        <View style={styles.websiteSection}>
          <TouchableOpacity onPress={handleLogoPress}>
            <Text style={styles.websiteText}>www.itcatalystindia.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  containerIOS: {
    paddingTop: 100, // Adjust for iOS status bar
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerLogo: {
    width: 200,
    height: 80,
    marginBottom: 8,
  },

  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eyeText: {
    fontSize: 20,
  },
  rememberContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#5D8277',
    borderColor: '#5D8277',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rememberText: {
    fontSize: 14,
    color: '#495057',
  },
  loginButton: {
    backgroundColor: '#5D8277',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#5D8277',
    fontSize: 14,
  },
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  signupText: {
    color: '#6c757d',
    fontSize: 14,
  },
  signupLink: {
    color: '#5D8277',
    fontSize: 14,
    fontWeight: '600',
  },
  websiteSection: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  websiteText: {
    color: '#6c757d',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
