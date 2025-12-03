import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OrderHeader } from '../src/components/order/OrderHeader';
import { useBackendPermissions } from '../src/hooks/useBackendPermissions';

export default function ItemDetailsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const permissions = useBackendPermissions();
  
  // Check if user has permission to access item description
  if (!permissions.showItemDesc) {
    return (
      <SafeAreaView style={styles.container}>
        <OrderHeader 
          title="Item Details" 
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            You don't have permission to access item descriptions.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Get initial data from order entry
  const initialItemName = (params.itemName as string) || '';
  const initialItemDescription = (params.itemDescription as string) || '';
  
  // State for form data
  const [itemDescription, setItemDescription] = useState(initialItemDescription);
  
  // State for hamburger menu
  const [showMenu, setShowMenu] = useState(false);
  
  // Ref for the text input to auto-focus
  const textInputRef = useRef<TextInput>(null);
  
  // Check if there are any changes
  const hasChanges = itemDescription !== initialItemDescription;
  
  // Auto-focus the text input when component mounts
  useEffect(() => {
    // Small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle hamburger menu
  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleNavigationWithMenu = (route: string) => {
    setShowMenu(false);
    if (route === 'logout') {
      // Use proper logout function instead of direct navigation
      clearUserData();
    } else if (route) {
      router.push(`/${route}`);
    }
  };

  const handleSave = () => {
    // Store the updated item description in AsyncStorage
    const storeItemDescription = async () => {
      try {
        const itemDetails = {
          itemName: initialItemName,
          itemDescription: itemDescription,
          timestamp: Date.now()
        };
        
        await AsyncStorage.setItem('temp_item_description', JSON.stringify(itemDetails));
        
        // Navigate back to the existing order entry screen
        router.back();
      } catch (error) {
        console.error('Error storing item description:', error);
        router.back();
      }
    };
    
    storeItemDescription();
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <OrderHeader
        showMenu={showMenu}
        onMenuPress={handleMenuPress}
        onNavigation={handleNavigationWithMenu}
        selectedCompany={null}
      />
      
      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.itemName}>{initialItemName}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Item User description:</Text>
            <TextInput
              ref={textInputRef}
              style={[styles.input, styles.textArea]}
              value={itemDescription}
              onChangeText={setItemDescription}
              placeholder="Enter item description (multiple lines supported)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          {/* Action Buttons - Moved below text box */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!hasChanges}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#5D8277',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#adb5bd',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#5D8277',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
