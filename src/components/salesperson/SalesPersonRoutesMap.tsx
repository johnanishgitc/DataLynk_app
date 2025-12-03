import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { OrsRouteGeometry } from '../../services/openRouteService';
import { SampleCustomer } from '../../data/sampleSalesRoutes';

export interface SalesPersonRoutesMapProps {
  geometry?: OrsRouteGeometry | null;
  customers: SampleCustomer[];
  currentLocation?: { latitude: number; longitude: number } | null;
  focusedCustomerId?: string | null;
  style?: ViewStyle;
}

const DEFAULT_CENTER = {
  latitude: 12.9716,
  longitude: 77.5946,
};

const generateHtml = (
  geometry: OrsRouteGeometry | null | undefined,
  customers: SampleCustomer[],
  currentLocation: { latitude: number; longitude: number } | null | undefined
) => {
  const customerMarkers = customers.map((customer, index) => ({
    id: customer.id,
    name: customer.name,
    latitude: customer.latitude,
    longitude: customer.longitude,
    order: index + 1,
  }));

  const routePolylines = (() => {
    if (!geometry) return [];
    if (geometry.type === 'MultiLineString') {
      return geometry.coordinates.map((line) => line.map(([lng, lat]) => [lat, lng]));
    }
    return [geometry.coordinates.map(([lng, lat]) => [lat, lng])];
  })();

  const hasRoute = routePolylines.length > 0;

  const centerCoordinate =
    customers[0] ??
    (routePolylines[0]?.[0]
      ? {
          latitude: routePolylines[0][0][0],
          longitude: routePolylines[0][0][1],
        }
      : DEFAULT_CENTER);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #0f172a;
          }
          #map {
            width: 100%;
            height: 100%;
          }
          .marker-label {
            font-size: 12px;
            font-weight: bold;
            color: #0f172a;
          }
        </style>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const routePolylines = ${JSON.stringify(routePolylines)};
          const customers = ${JSON.stringify(customerMarkers)};
          const currentLocation = ${JSON.stringify(currentLocation ?? null)};
          const center = ${JSON.stringify(centerCoordinate)};

          const map = L.map('map', {
            zoomControl: true,
            attributionControl: false
          }).setView([center.latitude, center.longitude], 13);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20,
            minZoom: 3
          }).addTo(map);

          const customerMarkers = new Map();

          const addCustomerMarkers = () => {
            customers.forEach((customer) => {
              const marker = L.marker([customer.latitude, customer.longitude], {
                title: customer.name
              }).addTo(map);

              marker.bindTooltip(
                '<div class="marker-label">' + customer.order + '. ' + customer.name + '</div>',
                { permanent: true, direction: 'top', offset: [0, -4] }
              );

              customerMarkers.set(customer.id, marker);
            });
          };

          const drawRoute = () => {
            if (!routePolylines || !routePolylines.length) {
              return;
            }

            const layerGroup = L.layerGroup().addTo(map);
            const bounds = [];

            routePolylines.forEach((latLngs) => {
              if (!latLngs.length) return;
              const polyline = L.polyline(latLngs, { color: '#2563eb', weight: 5, opacity: 0.8 }).addTo(layerGroup);
              bounds.push(...latLngs);
            });

            if (bounds.length) {
              map.fitBounds(bounds, { padding: [40, 40] });
            }
          };

          const addCurrentLocation = () => {
            if (!currentLocation) return;
            const marker = L.circleMarker([currentLocation.latitude, currentLocation.longitude], {
              radius: 10,
              color: '#22c55e',
              fillColor: '#4ade80',
              fillOpacity: 0.9,
              weight: 2
            }).addTo(map);
            marker.bindTooltip('You are here', {
              permanent: false,
              direction: 'top'
            });
          };

          const focusCustomer = (customerId) => {
            if (!customerMarkers.has(customerId)) return;
            const marker = customerMarkers.get(customerId);
            marker.openTooltip();
            map.flyTo(marker.getLatLng(), 16, { animate: true, duration: 0.8 });
            marker.setZIndexOffset(999);
            setTimeout(() => marker.setZIndexOffset(0), 1500);
          };

          addCustomerMarkers();
          drawRoute();
          addCurrentLocation();

          window.document.addEventListener('message', (event) => {
            try {
              const { type, payload } = JSON.parse(event.data);
              if (type === 'focus' && payload?.customerId) {
                focusCustomer(payload.customerId);
              } else if (type === 'currentLocation' && payload?.latitude && payload?.longitude) {
                L.circleMarker([payload.latitude, payload.longitude], {
                  radius: 7,
                  color: '#22c55e',
                  fillColor: '#4ade80',
                  fillOpacity: 0.9,
                  weight: 2
                }).addTo(map);
              }
            } catch (error) {
              console.error('Failed to handle map message', error);
            }
          });
        </script>
      </body>
    </html>
  `;
};

export const SalesPersonRoutesMap: React.FC<SalesPersonRoutesMapProps> = ({
  geometry,
  customers,
  currentLocation,
  focusedCustomerId,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);

  const html = useMemo(() => generateHtml(geometry, customers, currentLocation), [
    geometry,
    customers,
    currentLocation,
  ]);

  useEffect(() => {
    if (!focusedCustomerId || !webViewRef.current) return;
    const message = JSON.stringify({ type: 'focus', payload: { customerId: focusedCustomerId } });
    webViewRef.current.postMessage(message);
  }, [focusedCustomerId]);

  useEffect(() => {
    if (!currentLocation || !webViewRef.current) return;
    const message = JSON.stringify({ type: 'currentLocation', payload: currentLocation });
    const timeout = setTimeout(() => {
      webViewRef.current?.postMessage(message);
    }, 800);
    return () => clearTimeout(timeout);
  }, [currentLocation]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webView}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  webView: {
    flex: 1,
  },
});

export default SalesPersonRoutesMap;

