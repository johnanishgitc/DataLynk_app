import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useUser } from '../context/UserContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { userData } = useUser();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Give some time for session restoration to complete
    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
    }, 1000); // Wait 1 second for session restoration

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // If user is authenticated and we're done checking, redirect to company selection
    if (!isCheckingAuth && userData && userData.token) {
      console.log('🔐 User is authenticated, redirecting to company selection...');
      
      // Use a small delay to ensure navigation is ready
      const redirectTimer = setTimeout(() => {
        console.log('🚀 Executing redirect to company selection...');
        router.replace('/company-selection');
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [userData, isCheckingAuth]);

  // Show loading only while actively checking authentication
  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  // If user is authenticated, show loading while redirecting
  if (userData && userData.token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Redirecting to company selection...</Text>
      </View>
    );
  }

  // If no user data or no token, show login screen
  return <>{children}</>;
};

const styles = StyleSheet.create({
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
