import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Camera, CameraView } from 'expo-camera';
import * as Linking from 'expo-linking';
import { SampleCustomer } from '../../data/sampleSalesRoutes';
import { getDistanceMeters } from '../../utils/geo';

export interface RouteVisitRecord {
  note?: string;
  photoUri: string;
  location: { latitude: number; longitude: number };
  distanceMeters: number;
  timestamp: string;
}

interface SalesPersonRouteListProps {
  customers: SampleCustomer[];
  visits: Record<string, RouteVisitRecord>;
  onVisitRecorded: (customerId: string, visit: RouteVisitRecord) => void;
  onFocusCustomer?: (customerId: string) => void;
}

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

const CHECK_IN_DISTANCE_THRESHOLD_METERS = 50;

export const SalesPersonRouteList: React.FC<SalesPersonRouteListProps> = ({
  customers,
  visits,
  onVisitRecorded,
  onFocusCustomer,
}) => {
  const cameraRef = useRef<CameraView | null>(null);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<PermissionStatus>('undetermined');
  const [locationPermission, setLocationPermission] = useState<PermissionStatus>('undetermined');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [capturedLocation, setCapturedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [capturedDistance, setCapturedDistance] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status as PermissionStatus);
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }, []);

  const requestCamera = useCallback(async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status as PermissionStatus);
    if (status !== 'granted') {
      throw new Error('Camera permission denied');
    }
  }, []);

  const resetCaptureState = useCallback(() => {
    setCapturedPhotoUri(null);
    setCapturedLocation(null);
    setCapturedDistance(null);
    setNote('');
    setIsSubmitting(false);
    setCameraVisible(false);
  }, []);

  const startCheckIn = useCallback(
    async (customer: SampleCustomer) => {
      try {
        setActiveCustomerId(customer.id);
        const location = await requestLocation();
        const distanceMeters = getDistanceMeters(
          location.latitude,
          location.longitude,
          customer.latitude,
          customer.longitude
        );

        if (distanceMeters > CHECK_IN_DISTANCE_THRESHOLD_METERS) {
          Alert.alert(
            'Too far from customer',
            `You are ${distanceMeters.toFixed(1)} meters away. Move closer (within ${CHECK_IN_DISTANCE_THRESHOLD_METERS} meters) to check in.`
          );
          setActiveCustomerId(null);
          return;
        }

        await requestCamera();
        setCapturedLocation(location);
        setCapturedDistance(distanceMeters);
        setCameraVisible(true);
      } catch (error: any) {
        console.error('Check-in error:', error);
        Alert.alert('Unable to start check-in', error?.message ?? 'Please try again.');
        setActiveCustomerId(null);
      }
    },
    [requestLocation, requestCamera]
  );

  const completeCheckIn = useCallback(async () => {
    if (!activeCustomerId || !capturedPhotoUri || !capturedLocation || capturedDistance === null) return;
    setIsSubmitting(true);
    try {
      const visit: RouteVisitRecord = {
        note: note.trim() ? note.trim() : undefined,
        photoUri: capturedPhotoUri,
        location: capturedLocation,
        distanceMeters: capturedDistance,
        timestamp: new Date().toISOString(),
      };
      onVisitRecorded(activeCustomerId, visit);
      resetCaptureState();
      setActiveCustomerId(null);
    } catch (error: any) {
      console.error('Failed to record visit', error);
      Alert.alert('Failed to record visit', error?.message ?? 'Please try again.');
      setIsSubmitting(false);
    }
  }, [activeCustomerId, capturedPhotoUri, capturedLocation, note, onVisitRecorded, resetCaptureState]);

  const handleSnap = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        exif: false,
      });
      if (photo?.uri) {
        setCapturedPhotoUri(photo.uri);
        setCameraVisible(false);
      }
    } catch (error) {
      console.error('Failed to capture photo', error);
      Alert.alert('Capture failed', 'Unable to take a photo. Please try again.');
    }
  }, []);

  const handleFocus = useCallback(
    (customerId: string) => {
      if (onFocusCustomer) {
        onFocusCustomer(customerId);
      }
    },
    [onFocusCustomer]
  );

  const handleNavigate = useCallback(async (customer: SampleCustomer) => {
    try {
      const destination = `${customer.latitude},${customer.longitude}`;

      if (Platform.OS === 'android') {
        const androidUri = `google.navigation:q=${destination}`;
        const canOpen = await Linking.canOpenURL(androidUri);
        if (canOpen) {
          await Linking.openURL(androidUri);
          return;
        }
      }

      if (Platform.OS === 'ios') {
        const googleMapsScheme = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
        const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsScheme);
        if (canOpenGoogleMaps) {
          await Linking.openURL(googleMapsScheme);
          return;
        }
      }

      const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        destination
      )}&travelmode=driving`;
      const supported = await Linking.canOpenURL(fallbackUrl);
      if (!supported) {
        Alert.alert('Navigation unavailable', 'Unable to open maps on this device.');
        return;
      }
      await Linking.openURL(fallbackUrl);
    } catch (error) {
      console.error('Failed to open navigation', error);
      Alert.alert('Navigation failed', 'Unable to start navigation. Please try again.');
    }
  }, []);

  const activeCustomer = useMemo(
    () => customers.find((customer) => customer.id === activeCustomerId) ?? null,
    [customers, activeCustomerId]
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {customers.map((customer) => {
          const visit = visits[customer.id];
          return (
            <View key={customer.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardText}>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  <Text style={styles.customerAddress}>{customer.addressLine}</Text>
                </View>
                {visit ? (
                  <View style={styles.statusBadgeSuccess}>
                    <Text style={styles.statusText}>Visited</Text>
                  </View>
                ) : (
                  <View style={styles.statusBadgePending}>
                    <Text style={styles.statusText}>Pending</Text>
                  </View>
                )}
              </View>

              {visit && (
                <View style={styles.visitDetails}>
                  <Image source={{ uri: visit.photoUri }} style={styles.visitImage} />
                  <View style={styles.visitMeta}>
                    <Text style={styles.visitTimestamp}>
                      {new Date(visit.timestamp).toLocaleString()}
                    </Text>
                    {visit.note ? <Text style={styles.visitNote}>{visit.note}</Text> : null}
                  </View>
                </View>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.focusButton}
                  onPress={() => handleFocus(customer.id)}
                >
                  <Text style={styles.focusButtonText}>View on Map</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => handleNavigate(customer)}
                >
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
                {!visit && (
                  <TouchableOpacity
                    style={styles.checkInButton}
                    onPress={() => startCheckIn(customer)}
                  >
                    <Text style={styles.checkInButtonText}>Check In</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={cameraVisible} animationType="slide">
        <View style={styles.cameraWrapper}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.captureButton} onPress={handleSnap}>
              <Text style={styles.captureButtonText}>Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={resetCaptureState}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(capturedPhotoUri)} animationType="slide" transparent>
        <View style={styles.reviewOverlay}>
          <View style={styles.reviewCard}>
            {capturedPhotoUri ? (
              <Image source={{ uri: capturedPhotoUri }} style={styles.reviewImage} />
            ) : null}
            <Text style={styles.reviewTitle}>Add an optional note</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Notes about the visit (optional)"
              value={note}
              onChangeText={setNote}
              multiline
            />
            <View style={styles.reviewActions}>
              <TouchableOpacity
                style={[styles.reviewButton, styles.reviewButtonCancel]}
                onPress={() => {
                  setCapturedPhotoUri(null);
                  setCameraVisible(false);
                }}
              >
                <Text style={styles.reviewButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reviewButton,
                  styles.reviewButtonConfirm,
                  isSubmitting && styles.reviewButtonDisabled,
                ]}
                onPress={completeCheckIn}
                disabled={isSubmitting}
              >
                <Text style={styles.reviewButtonText}>
                  {isSubmitting ? 'Saving...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={false}>
        <View />
      </Modal>
      {/* Dummy modal to satisfy linting about at least one child */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardText: {
    flex: 1,
    marginRight: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 14,
    color: '#475569',
  },
  statusBadgePending: {
    backgroundColor: '#fef9c3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeSuccess: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  visitDetails: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  visitImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 12,
  },
  visitMeta: {
    flex: 1,
  },
  visitTimestamp: {
    fontSize: 12,
    color: '#0f172a',
    marginBottom: 6,
  },
  visitNote: {
    fontSize: 13,
    color: '#475569',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  focusButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  focusButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  navigateButton: {
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  navigateButtonText: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
  },
  checkInButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  checkInButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  cameraWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 24,
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#ffffff',
  },
  reviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  reviewCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
  },
  reviewImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#0f172a',
  },
  noteInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 16,
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  reviewButtonCancel: {
    backgroundColor: '#e2e8f0',
    marginRight: 12,
  },
  reviewButtonConfirm: {
    backgroundColor: '#2563eb',
  },
  reviewButtonDisabled: {
    opacity: 0.6,
  },
  reviewButtonText: {
    color: '#0f172a',
    fontWeight: '600',
  },
});

export default SalesPersonRouteList;

