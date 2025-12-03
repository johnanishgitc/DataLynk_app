import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { apiService } from '../src/services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const validateForm = (): boolean => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await apiService.forgotPassword(email.trim());

      if (response.success) {
        // Handle success differently for web and mobile
        if (Platform.OS === 'web') {
          // For web: show custom alert and navigate after a delay
          setAlertMessage(response.message || 'Password reset instructions sent to your email!');
          setShowSuccessAlert(true);
          // Clear form
          setEmail('');
          // Navigate after a short delay to allow user to see the message
          setTimeout(() => {
            setShowSuccessAlert(false);
            router.push('/');
          }, 3000);
        } else {
          // For mobile: use native Alert
          Alert.alert(
            'Success',
            response.message || 'Password reset instructions sent to your email!',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Clear form and navigate back to login
                  setEmail('');
                  router.push('/');
                },
              },
            ]
          );
        }
      } else {
        if (Platform.OS === 'web') {
          setAlertMessage(response.message || 'Failed to send reset instructions. Please try again.');
          setShowSuccessAlert(true);
          setTimeout(() => setShowSuccessAlert(false), 3000);
        } else {
          Alert.alert('Error', response.message || 'Failed to send reset instructions. Please try again.');
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      if (Platform.OS === 'web') {
        setAlertMessage('Something went wrong. Please try again.');
        setShowSuccessAlert(true);
        setTimeout(() => setShowSuccessAlert(false), 3000);
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const handleLogoPress = () => {
    Linking.openURL('https://www.itcatalystindia.com');
  };

  const dismissAlert = () => {
    setShowSuccessAlert(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Forgot Password</Text>
            <Image
              source={require('../assets/TallyCatalyst.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Enter your email to reset your password</Text>
          </View>

          {/* Forgot Password Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Reset Password Button */}
            <TouchableOpacity 
              style={[styles.resetButton, isLoading && styles.resetButtonDisabled]} 
              onPress={handleForgotPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.resetButtonText}>Send Reset Instructions</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Back to Login Section */}
          <View style={styles.loginSection}>
            <Text style={styles.loginText}>Remember your password? </Text>
            <TouchableOpacity onPress={handleBackToLogin} disabled={isLoading}>
              <Text style={styles.loginLink}>Sign In</Text>
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
      
      {/* Custom Alert for Web */}
      {Platform.OS === 'web' && showSuccessAlert && (
        <TouchableOpacity style={styles.webAlert} onPress={dismissAlert}>
          <Text style={styles.webAlertText}>{alertMessage}</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  headerLogo: {
    width: 200,
    height: 80,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
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
  resetButton: {
    backgroundColor: '#5D8277',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  loginText: {
    color: '#6c757d',
    fontSize: 16,
  },
  loginLink: {
    color: '#5D8277',
    fontSize: 16,
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
  webAlert: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#5D8277',
    padding: 16,
    borderRadius: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  webAlertText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});
