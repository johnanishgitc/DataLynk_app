import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { StandardHeader } from '../src/components/common';
import { DashboardMenu } from '../src/components/dashboard';
import { Colors } from '../src/constants/colors';
import { useDashboard } from '../src/hooks/useDashboard';
import { sampleSalesRoutes, SampleRoute, SampleCustomer } from '../src/data/sampleSalesRoutes';
import {
  SalesPersonRouteList,
  RouteVisitRecord,
} from '../src/components/salesperson/SalesPersonRouteList';
import { SalesPersonRoutesMap } from '../src/components/salesperson/SalesPersonRoutesMap';
import {
  getSalesRoutePlan,
  simulateSalesRoutePlan,
  SalesRoutePlan,
  Coordinate,
} from '../src/services/openRouteService';
import { getDistanceMeters } from '../src/utils/geo';

const optimizeCustomersByDistance = (
  customers: SampleCustomer[],
  startCoordinate?: Coordinate | null
): SampleCustomer[] => {
  if (!customers.length) {
    return [];
  }

  if (!startCoordinate) {
    return [...customers];
  }

  const remaining = [...customers];
  const ordered: SampleCustomer[] = [];
  let currentLatitude = startCoordinate.latitude;
  let currentLongitude = startCoordinate.longitude;

  while (remaining.length) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const customer = remaining[index];
      const distance = getDistanceMeters(
        currentLatitude,
        currentLongitude,
        customer.latitude,
        customer.longitude
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const [nextCustomer] = remaining.splice(nearestIndex, 1);
    ordered.push(nextCustomer);
    currentLatitude = nextCustomer.latitude;
    currentLongitude = nextCustomer.longitude;
  }

  return ordered;
};

export default function SalesPersonRoutesPage() {
  const {
    showMenu,
    handleMenuPress,
    handleNavigation,
    closeMenu,
  } = useDashboard();

  const [selectedRoute] = useState<SampleRoute | null>(sampleSalesRoutes[0] ?? null);
  const [routePlan, setRoutePlan] = useState<SalesRoutePlan | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [visits, setVisits] = useState<Record<string, RouteVisitRecord>>({});
  const [focusedCustomerId, setFocusedCustomerId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const optimizedCustomers = useMemo(() => {
    if (!selectedRoute) {
      return [];
    }
    return optimizeCustomersByDistance(selectedRoute.customers, currentLocation);
  }, [selectedRoute, currentLocation?.latitude, currentLocation?.longitude]);

  useEffect(() => {
    let isMounted = true;
    const requestLocation = async () => {
      try {
        setIsLocating(true);
        setLocationError(null);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            setLocationError(
              'Location permission is required to plot the route from your current position.'
            );
            setIsLocating(false);
            setCurrentLocation(null);
            setRoutePlan(null);
            setLoadingRoute(false);
          }
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (isMounted) {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsLocating(false);
        }
      } catch (error) {
        console.warn('Failed to retrieve user location', error);
        if (isMounted) {
          setLocationError('Unable to determine your current location. Move to an open area and try again.');
          setIsLocating(false);
          setCurrentLocation(null);
          setRoutePlan(null);
          setLoadingRoute(false);
        }
      }
    };

    requestLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedRoute || !currentLocation || !optimizedCustomers.length) {
      return;
    }

    let cancelled = false;

    const loadRoute = async () => {
      setLoadingRoute(true);
      setRouteError(null);
      try {
        const plan = await getSalesRoutePlan(
          optimizedCustomers,
          'driving-car',
          currentLocation
        );
        if (!cancelled) {
          setRoutePlan(plan);
        }
      } catch (error: any) {
        console.warn('OpenRouteService failed, falling back to simulated route', error);
        if (!cancelled) {
          setRouteError(error?.message ?? 'Unable to load optimized route. Using fallback path.');
          setRoutePlan(simulateSalesRoutePlan(optimizedCustomers, currentLocation));
        }
      } finally {
        if (!cancelled) {
          setLoadingRoute(false);
        }
      }
    };

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [
    selectedRoute,
    currentLocation?.latitude,
    currentLocation?.longitude,
    optimizedCustomers,
  ]);

  const handleVisitRecorded = useCallback((customerId: string, visit: RouteVisitRecord) => {
    setVisits((prev) => ({
      ...prev,
      [customerId]: visit,
    }));
  }, []);

  const summary = useMemo(() => {
    if (!routePlan) return null;
    const distanceKm = routePlan.summary.distanceKm;
    const durationMinutes = routePlan.summary.durationMinutes;
    return {
      distanceKm,
      durationMinutes,
    };
  }, [routePlan]);

  const plannedScheduleLabel = useMemo(() => {
    if (!selectedRoute) return '';
    if (selectedRoute.plannedDayOfWeek) {
      return selectedRoute.plannedDayOfWeek;
    }
    if (selectedRoute.plannedDate) {
      try {
        const day = new Date(selectedRoute.plannedDate).toLocaleDateString(undefined, {
          weekday: 'long',
        });
        if (day && day !== 'Invalid Date') {
          return day;
        }
      } catch {
        return '';
      }
    }
    return '';
  }, [selectedRoute]);

  if (!selectedRoute) {
    return (
      <SafeAreaView style={styles.container}>
        <StandardHeader
          title="Sales Person Routes"
          onMenuPress={handleMenuPress}
          showMenuButton
        />
        <DashboardMenu showMenu={showMenu} onClose={closeMenu} onNavigation={handleNavigation} />
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No routes available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StandardHeader
        title="Sales Person Routes"
        onMenuPress={handleMenuPress}
        showMenuButton
      />

      <DashboardMenu showMenu={showMenu} onClose={closeMenu} onNavigation={handleNavigation} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.routeHeader}>
          <View>
            <Text style={styles.routeTitle}>{selectedRoute.name}</Text>
            <Text style={styles.routeSubtitle}>
              {optimizedCustomers.length} stops
              {plannedScheduleLabel ? ` · Planned for ${plannedScheduleLabel}` : ''}
            </Text>
            {summary ? (
              <Text style={styles.routeSummary}>
                {summary.distanceKm.toFixed(2)} km · {summary.durationMinutes.toFixed(0)} min (est.)
              </Text>
            ) : null}
          </View>
          {loadingRoute ? <ActivityIndicator color="#2563eb" /> : null}
        </View>
        {isLocating ? (
          <View style={styles.infoBanner}>
            <ActivityIndicator color="#2563eb" size="small" />
            <Text style={styles.infoBannerText}>Determining your current location…</Text>
          </View>
        ) : null}
        {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
        {routeError ? <Text style={styles.errorText}>{routeError}</Text> : null}

        <SalesPersonRoutesMap
          geometry={routePlan?.geometry}
          customers={optimizedCustomers}
          currentLocation={currentLocation}
          focusedCustomerId={focusedCustomerId}
          style={styles.map}
        />

        <SalesPersonRouteList
          customers={optimizedCustomers}
          visits={visits}
          onVisitRecorded={handleVisitRecorded}
          onFocusCustomer={setFocusedCustomerId}
        />

        {!routePlan && !loadingRoute && !isLocating ? (
          <Text style={styles.unavailableText}>
            Route details are not available. Ensure location services are enabled and try again.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#475569',
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  routeSummary: {
    fontSize: 13,
    color: '#2563eb',
    marginTop: 6,
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 8,
  },
  map: {
    marginVertical: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  infoBannerText: {
    marginLeft: 8,
    color: '#0f172a',
    fontSize: 13,
    flex: 1,
  },
  unavailableText: {
    marginTop: 16,
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
  },
});

