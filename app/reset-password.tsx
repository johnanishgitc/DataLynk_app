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
import { useUser } from '../src/context/UserContext';

export default function ResetPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const { userData, clearUserData } = useUser();

  const validateForm = (): boolean => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      return false;
    }
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter your new password');
      return false;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return false;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return false;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    // Check if user data is available
    if (!userData || !userData.email) {
      Alert.alert('Error', 'User data not found. Please login again.');
      router.push('/');
      return;
    }


    setIsLoading(true);
    try {
      const response = await apiService.changePassword({
        email: userData.email,
        oldPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      if (response.success) {
        // Handle success differently for web and mobile
        if (Platform.OS === 'web') {
          // For web: show custom alert and navigate after a delay
          setAlertMessage(response.message || 'Password changed successfully!');
          setShowSuccessAlert(true);
          // Clear form and user data
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          clearUserData(); // Clear user session
          // Navigate after a short delay to allow user to see the message
          setTimeout(() => {
            setShowSuccessAlert(false);
            router.push('/');
          }, 2000);
        } else {
          // For mobile: use native Alert
          Alert.alert(
            'Success',
            response.message || 'Password changed successfully!',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Clear form and user data, then navigate back to login page
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  clearUserData(); // Clear user session
                  router.push('/');
                },
              },
            ]
          );
        }
      } else {
        if (Platform.OS === 'web') {
          setAlertMessage(response.message || 'Password change failed. Please try again.');
          setShowSuccessAlert(true);
          setTimeout(() => setShowSuccessAlert(false), 3000);
        } else {
          Alert.alert('Error', response.message || 'Password change failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Reset password error:', error);
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
            <Text style={styles.title}>Reset Password</Text>
            <Image
              source={require('../assets/DLlogo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Set your new password</Text>
          </View>

          {/* Reset Password Form */}
          <View style={styles.form}>
            {/* Current Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Text style={styles.eyeText}>
                    {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Text style={styles.eyeText}>
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.eyeText}>
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reset Password Button */}
            <TouchableOpacity 
              style={[styles.resetButton, isLoading && styles.resetButtonDisabled]} 
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.resetButtonText}>Reset Password</Text>
              )}
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
