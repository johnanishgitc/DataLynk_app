import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import * as Location from 'expo-location';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

type Coordinate = {
  latitude: number;
  longitude: number;
};

export interface MapAddressDetails {
  formattedAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

export interface MapSelection extends Coordinate {
  address?: MapAddressDetails;
}

export interface MapLocationPickerProps {
  value?: MapSelection | null;
  onLocationChange: (selection: MapSelection) => void;
  style?: ViewStyle;
  title?: string;
  subtitle?: string;
}

const DEFAULT_COORDINATE: Coordinate = {
  latitude: 20.5937, // Fallback: approximate center of India
  longitude: 78.9629,
};

const generateMapHtml = (
  selected: Coordinate,
  current: Coordinate,
  interactive: boolean,
  initialZoom: number
) => {
  const selectedJson = JSON.stringify(selected);
  const currentJson = JSON.stringify(current);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #f1f5f9;
            overflow: hidden;
          }
          #map {
            width: 100%;
            height: 100%;
          }
          #center-pin {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -100%);
            pointer-events: none;
            z-index: 1000;
          }
          .pin-body {
            width: 24px;
            height: 24px;
            background: #dc2626;
            border-radius: 50%;
            box-shadow: 0 4px 8px rgba(0,0,0,0.25);
            border: 2px solid #fff;
          }
          .pin-tip {
            position: absolute;
            top: 16px;
            left: 50%;
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 12px solid #dc2626;
            transform: translateX(-50%);
          }
          .pin-shadow {
            position: absolute;
            top: 28px;
            left: 50%;
            width: 18px;
            height: 6px;
            background: rgba(0,0,0,0.15);
            border-radius: 50%;
            transform: translateX(-50%);
          }
        </style>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      </head>
      <body>
        <div id="map"></div>
        <div id="center-pin">
          <div class="pin-body"></div>
          <div class="pin-tip"></div>
          <div class="pin-shadow"></div>
        </div>
        <script>
          const selected = ${selectedJson};
          const current = ${currentJson};
          const interactive = ${interactive};
          const initialZoom = ${initialZoom};

          const map = L.map('map', {
            zoomControl: interactive,
            attributionControl: false,
            dragging: interactive,
            scrollWheelZoom: interactive,
            touchZoom: interactive,
            doubleClickZoom: interactive,
          }).setView([selected.latitude, selected.longitude], initialZoom);

          if (!interactive) {
            map.dragging.disable();
            map.scrollWheelZoom.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
          }

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20,
            minZoom: 3
          }).addTo(map);

          const currentMarker = L.circleMarker([current.latitude, current.longitude], {
            radius: 9,
            weight: 2,
            color: '#1e3a8a',
            fillColor: '#60a5fa',
            fillOpacity: 0.8
          }).addTo(map);

          const postMessage = (payload) => {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify(payload));
            }
          };

          const notifyCenter = () => {
            const center = map.getCenter();
            postMessage({
              type: 'center',
              payload: {
                latitude: center.lat,
                longitude: center.lng,
                zoom: map.getZoom()
              }
            });
          };

          if (interactive) {
            map.on('moveend', notifyCenter);
            map.on('zoomend', notifyCenter);
          }

          setTimeout(() => notifyCenter(), 400);

          const handleMessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data?.type === 'current' && data.payload) {
                const { latitude, longitude } = data.payload;
                currentMarker.setLatLng([latitude, longitude]);
          } else if (data?.type === 'recenter' && data.payload) {
            const { latitude, longitude, zoom } = data.payload;
            const targetZoom = typeof zoom === 'number' ? zoom : map.getZoom();
            map.flyTo([latitude, longitude], targetZoom, { animate: true });
              }
            } catch (error) {
              console.warn('Map message handling failed', error);
            }
          };

          if (interactive) {
            document.addEventListener('message', handleMessage);
            window.addEventListener('message', handleMessage);
          }
        </script>
      </body>
    </html>
  `;
};

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  value,
  onLocationChange,
  style,
  title = 'Customer Location',
  subtitle = 'Drag map to place the red pin at the customer address',
}) => {
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    value ?? null
  );
  const [selectedLocation, setSelectedLocation] = useState<MapSelection | null>(
    value ?? null
  );
  const [isModalVisible, setModalVisible] = useState(false);
  const [isLocating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const modalWebViewRef = useRef<WebView | null>(null);
  const [modalSeedCoordinate, setModalSeedCoordinate] = useState<Coordinate>(() =>
    value
      ? { latitude: value.latitude, longitude: value.longitude }
      : DEFAULT_COORDINATE
  );
  const [interactiveHtml, setInteractiveHtml] = useState<string | null>(null);

  // Sync controlled value from parent
  useEffect(() => {
    if (!value) return;
    setSelectedLocation(value);
    if (!isModalVisible) {
      setModalSeedCoordinate({
        latitude: value.latitude,
        longitude: value.longitude,
      });
      setInteractiveHtml(null);
    }
  }, [value?.latitude, value?.longitude, isModalVisible]);

  useEffect(() => {
    let isMounted = true;

    const fetchCurrentLocation = async () => {
      setLocating(true);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!isMounted) return;
          setLocationError(
            'Location permission denied. Map centered to default; drag pin to adjust.'
          );
          setCurrentLocation(DEFAULT_COORDINATE);
          setSelectedLocation((prev) => prev ?? DEFAULT_COORDINATE);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const coords: Coordinate | null = position?.coords
          ? {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }
          : null;

        if (!isMounted) {
          return;
        }

        if (coords) {
          setCurrentLocation(coords);
          setSelectedLocation((prev) => prev ?? coords);
        } else {
          setLocationError(
            'Unable to fetch location. Map centered to default; drag pin to adjust.'
          );
          setCurrentLocation(DEFAULT_COORDINATE);
          setSelectedLocation((prev) => prev ?? DEFAULT_COORDINATE);
        }
      } catch (error) {
        if (isMounted) {
          console.warn('Failed to get current location', error);
          setLocationError(
            'Unable to fetch location. Map centered to default; drag pin to adjust.'
          );
          setCurrentLocation(DEFAULT_COORDINATE);
          setSelectedLocation((prev) => prev ?? DEFAULT_COORDINATE);
        }
      } finally {
        if (isMounted) {
          setLocating(false);
        }
      }
    };

    fetchCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const previewCoordinate = selectedLocation ?? currentLocation ?? DEFAULT_COORDINATE;
  const currentCoordinate = currentLocation ?? previewCoordinate;
  const modalCurrentCoordinate = currentLocation ?? modalSeedCoordinate;

  const previewHtml = useMemo(
    () => generateMapHtml(previewCoordinate, currentCoordinate, false, 15),
    [
      previewCoordinate.latitude,
      previewCoordinate.longitude,
      currentCoordinate.latitude,
      currentCoordinate.longitude,
    ]
  );

  const handleModalMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data?.type === 'center' && data.payload) {
          const { latitude, longitude } = data.payload;
          if (
            !selectedLocation ||
            Math.abs(selectedLocation.latitude - latitude) > 0.00001 ||
            Math.abs(selectedLocation.longitude - longitude) > 0.00001
          ) {
            setSelectedLocation((prev) => ({
              ...prev,
              latitude,
              longitude,
              address: prev?.address,
            }));
          }
        }
      } catch (error) {
        console.warn('Failed to parse map message', error);
      }
    },
    [selectedLocation]
  );

  // Reverse geocode whenever coordinates change
  useEffect(() => {
    if (!selectedLocation) return;
    const { latitude, longitude } = selectedLocation;
    let isActive = true;

    // Immediately emit coordinates
    onLocationChange({
      latitude,
      longitude,
      address: selectedLocation.address,
    });

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          {
            headers: {
              'User-Agent':
                Platform.select({
                  ios: 'TallyCatalyst/1.0 (iOS)',
                  android: 'TallyCatalyst/1.0 (Android)',
                  default: 'TallyCatalyst/1.0 (Web)',
                }) ?? 'TallyCatalyst/1.0',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Reverse geocode failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!isActive) return;

        const address = data?.address ?? {};
        const formattedAddress: MapAddressDetails = {
          formattedAddress: data?.display_name ?? undefined,
          city:
            address.city ||
            address.town ||
            address.village ||
            address.hamlet ||
            address.county,
          state: address.state || address.state_district || address.region,
          country: address.country,
          postcode: address.postcode,
        };

        onLocationChange({
          latitude,
          longitude,
          address: formattedAddress,
        });

        setSelectedLocation((prev) =>
          prev
            ? {
                ...prev,
                address: formattedAddress,
              }
            : prev
        );
      } catch (error) {
        if (isActive) {
          console.warn('Reverse geocode error:', error);
          onLocationChange({
            latitude,
            longitude,
            address: selectedLocation.address,
          });
        }
      }
    }, 500);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [
    selectedLocation?.latitude,
    selectedLocation?.longitude,
    onLocationChange,
    selectedLocation?.address,
  ]);

  const openModal = () => {
    const seed = selectedLocation ?? currentCoordinate ?? DEFAULT_COORDINATE;
    setModalSeedCoordinate(seed);
    setInteractiveHtml(
      generateMapHtml(seed, modalCurrentCoordinate, true, 17)
    );
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setInteractiveHtml(null);
  };

  useEffect(() => {
    if (!isModalVisible || !modalWebViewRef.current || !currentLocation) {
      return;
    }

    modalWebViewRef.current.postMessage(
      JSON.stringify({
        type: 'current',
        payload: currentLocation,
      })
    );
  }, [
    isModalVisible,
    currentLocation?.latitude,
    currentLocation?.longitude,
  ]);

  const handleRecenter = () => {
    const target = currentLocation ?? DEFAULT_COORDINATE;
    if (!modalWebViewRef.current) {
      return;
    }

    modalWebViewRef.current.postMessage(
      JSON.stringify({
        type: 'recenter',
        payload: {
          latitude: target.latitude,
          longitude: target.longitude,
          zoom: 17,
        },
      })
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={openModal} style={styles.manageButton}>
          <Text style={styles.manageButtonText}>Expand Map</Text>
        </TouchableOpacity>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.mapPreviewWrapper}>
        {isLocating && !selectedLocation ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color="#0f172a" />
            <Text style={styles.loaderText}>Fetching location…</Text>
          </View>
        ) : (
          <WebView
            key={`preview-${previewCoordinate.latitude.toFixed(
              4
            )}-${previewCoordinate.longitude.toFixed(4)}`}
            originWhitelist={['*']}
            source={{ html: previewHtml }}
            style={styles.mapPreview}
            scrollEnabled={false}
          />
        )}
        <TouchableOpacity style={styles.previewOverlay} onPress={openModal} activeOpacity={0.85}>
          <Text style={styles.previewOverlayText}>Tap to adjust location</Text>
        </TouchableOpacity>
      </View>

      {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={closeModal}
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adjust Customer Location</Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Drag the map so the red pin points to the correct address.
          </Text>
          <View style={styles.modalMapWrapper}>
            <WebView
              key={`interactive-${modalSeedCoordinate.latitude.toFixed(
                5
              )}-${modalSeedCoordinate.longitude.toFixed(5)}`}
              ref={modalWebViewRef}
              originWhitelist={['*']}
              source={
                interactiveHtml
                  ? { html: interactiveHtml }
                  : { html: generateMapHtml(modalSeedCoordinate, modalCurrentCoordinate, true, 17) }
              }
              style={styles.modalMap}
              onMessage={handleModalMessage}
            />
            <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter} activeOpacity={0.85}>
              <Text style={styles.recenterButtonText}>Current Location</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  manageButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
  },
  manageButtonText: {
    color: '#0369a1',
    fontWeight: '600',
    fontSize: 13,
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
  },
  mapPreviewWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    height: 180,
    backgroundColor: '#f8fafc',
  },
  mapPreview: {
    flex: 1,
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  previewOverlayText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 8,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#b91c1c',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#475569',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modalMapWrapper: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    position: 'relative',
  },
  modalMap: {
    flex: 1,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  recenterButtonText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MapLocationPicker;

