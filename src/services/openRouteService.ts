import { ORS_CONFIG, getOrsUrl, hasOrsApiKey } from '../config/openRouteService';
import { SampleCustomer } from '../data/sampleSalesRoutes';
import { getDistanceMeters } from '../utils/geo';

type OrsProfile = 'driving-car' | 'driving-hgv' | 'foot-walking' | 'cycling-regular';

export type OrsRouteGeometry =
  | {
      type: 'LineString';
      coordinates: [number, number][];
    }
  | {
      type: 'MultiLineString';
      coordinates: [number, number][][];
    };

export interface OrsRouteSummary {
  distance: number;
  duration: number;
}

export interface OrsRouteLeg {
  summary: OrsRouteSummary;
  steps?: unknown[];
}

export interface OrsDirectionFeature {
  type: string;
  geometry: OrsRouteGeometry;
  properties: {
    segments: OrsRouteLeg[];
    summary: OrsRouteSummary;
    way_points: [number, number];
  };
}

export interface OrsDirectionsResponse {
  type: string;
  features: OrsDirectionFeature[];
  bbox?: number[];
}

export interface SalesRouteLeg {
  customerId: string;
  arrivalIndex: number;
  summary: SalesRouteSummary;
}

export interface SalesRoutePlan {
  geometry: OrsRouteGeometry;
  summary: SalesRouteSummary;
  legs: SalesRouteLeg[];
  origin?: Coordinate | null;
}

export interface SalesRouteSummary {
  distanceKm: number;
  durationMinutes: number;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export class OpenRouteServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenRouteServiceError';
  }
}

export const buildRouteCoordinates = (
  customers: SampleCustomer[],
  startCoordinate?: Coordinate | null
) => {
  const coordinates: [number, number][] = [];
  const pushIfUnique = (coord: [number, number]) => {
    const last = coordinates[coordinates.length - 1];
    if (
      !last ||
      Math.abs(last[0] - coord[0]) > 0.00001 ||
      Math.abs(last[1] - coord[1]) > 0.00001
    ) {
      coordinates.push(coord);
    }
  };

  if (startCoordinate) {
    pushIfUnique([startCoordinate.longitude, startCoordinate.latitude]);
  }

  customers.forEach((customer) => {
    pushIfUnique([customer.longitude, customer.latitude]);
  });

  return coordinates;
};

const buildRequestBody = (coordinates: [number, number][]) => ({
  coordinates,
  elevation: false,
  instructions: false,
  units: 'km',
  geometry_simplify: true,
});

const ensureApiKey = () => {
  if (!hasOrsApiKey()) {
    throw new OpenRouteServiceError(
      'OpenRouteService API key missing. Set EXPO_PUBLIC_ORS_API_KEY to enable routing.'
    );
  }
};

const normalizeRoute = (
  customers: SampleCustomer[],
  response: OrsDirectionsResponse,
  startCoordinate?: Coordinate | null
): SalesRoutePlan => {
  const feature = response.features?.[0];

  if (!feature?.geometry?.coordinates?.length) {
    throw new OpenRouteServiceError('Received empty route geometry from OpenRouteService.');
  }

  const segments = feature.properties?.segments ?? [];
  const hasStart = Boolean(startCoordinate);

  const toSummary = (summary: OrsRouteSummary | undefined): SalesRouteSummary => {
    if (!summary) {
      return { distanceKm: 0, durationMinutes: 0 };
    }
    return {
      distanceKm: (summary.distance ?? 0) / 1000,
      durationMinutes: (summary.duration ?? 0) / 60,
    };
  };

  const lines: [number, number][][] =
    feature.geometry.type === 'MultiLineString'
      ? feature.geometry.coordinates
      : [feature.geometry.coordinates];

  let geometryDistanceKm = 0;
  lines.forEach((line) => {
    for (let i = 1; i < line.length; i += 1) {
      const prev = line[i - 1];
      const curr = line[i];
      geometryDistanceKm += getDistanceMeters(prev[1], prev[0], curr[1], curr[0]) / 1000;
    }
  });

  const segmentSummaries = segments.map((segment) => toSummary(segment.summary));
  const totalDurationMinutes = segmentSummaries.reduce(
    (total, segment) => total + segment.durationMinutes,
    0
  );
  const totalDistanceKmFromSegments = segmentSummaries.reduce(
    (total, segment) => total + segment.distanceKm,
    0
  );

  const overallSummary = (() => {
    const fallbackSummary = toSummary(feature.properties?.summary);
    let durationMinutes = fallbackSummary.durationMinutes;
    if (totalDurationMinutes > 0) {
      durationMinutes = totalDurationMinutes;
    } else {
      segments.forEach((segment) => {
        const segmentDurationSeconds = segment.summary?.duration ?? 0;
        if (segmentDurationSeconds > 0) {
          durationMinutes += segmentDurationSeconds / 60;
        }
      });
    }

    const distanceKm =
      totalDistanceKmFromSegments > 0
        ? totalDistanceKmFromSegments
        : geometryDistanceKm || fallbackSummary.distanceKm;

    return {
      distanceKm,
      durationMinutes,
    };
  })();

  let accumulatedDistance = 0;
  let accumulatedDuration = 0;

  const legs: SalesRouteLeg[] = segments.map((segment, index) => {
    const legSummary = toSummary(segment.summary ?? feature.properties.summary);
    accumulatedDistance += legSummary.distanceKm;
    accumulatedDuration += legSummary.durationMinutes;
    const distanceKm = accumulatedDistance;
    const durationMinutes = accumulatedDuration;

    return {
      customerId: hasStart
        ? customers[index]?.id ?? `leg-${index}`
        : customers[index + 1]?.id ?? customers[index]?.id ?? `leg-${index}`,
      arrivalIndex: index + 1,
      summary: {
        distanceKm,
        durationMinutes,
      },
    };
  });

  return {
    geometry: feature.geometry,
    summary: overallSummary,
    legs,
    origin: startCoordinate ?? null,
  };
};

export const getSalesRoutePlan = async (
  customers: SampleCustomer[],
  profile: OrsProfile = 'driving-car',
  startCoordinate?: Coordinate | null
): Promise<SalesRoutePlan> => {
  const requiredCustomers = startCoordinate ? 1 : 2;
  if (customers.length < requiredCustomers) {
    throw new OpenRouteServiceError(
      startCoordinate
        ? 'At least one customer is required to build a route from the current location.'
        : 'At least two customers are required to build a route.'
    );
  }

  ensureApiKey();

  const coordinates = buildRouteCoordinates(customers, startCoordinate);

  if (coordinates.length < 2) {
    throw new OpenRouteServiceError('Unable to build a route with fewer than two waypoints.');
  }

  const response = await fetch(getOrsUrl(`/directions/${profile}/geojson`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: ORS_CONFIG.API_KEY,
    },
    body: JSON.stringify(buildRequestBody(coordinates)),
  });

  if (!response.ok) {
    let details = '';
    try {
      const payload = await response.json();
      details = payload?.error?.message ?? payload?.message ?? JSON.stringify(payload);
    } catch {
      details = await response.text();
    }
    throw new OpenRouteServiceError(
      `OpenRouteService request failed with status ${response.status}: ${details}`
    );
  }

  const data: OrsDirectionsResponse = await response.json();

  return normalizeRoute(customers, data, startCoordinate);
};

export const simulateSalesRoutePlan = (
  customers: SampleCustomer[],
  startCoordinate?: Coordinate | null
): SalesRoutePlan => {
  const requiredCustomers = startCoordinate ? 1 : 2;
  if (customers.length < requiredCustomers) {
    throw new OpenRouteServiceError(
      startCoordinate
        ? 'At least one customer is required to simulate a route from the current location.'
        : 'At least two customers are required to simulate a route.'
    );
  }

  const coordinates = buildRouteCoordinates(customers, startCoordinate);

  const segmentSummaries: SalesRouteSummary[] = coordinates.reduce(
    (acc, coord, index) => {
      if (index === 0) return acc;
      const prev = coordinates[index - 1];
      const segmentDistanceKm = getDistanceMeters(prev[1], prev[0], coord[1], coord[0]) / 1000;
      const segmentDurationMinutes = (segmentDistanceKm / 30) * 60; // assume 30 km/h average
      acc.push({
        distanceKm: segmentDistanceKm,
        durationMinutes: segmentDurationMinutes,
      });
      return acc;
    },
    [] as SalesRouteSummary[]
  );

  const totalDistanceKm = segmentSummaries.reduce((acc, segment) => acc + segment.distanceKm, 0);
  const totalDurationMinutes = segmentSummaries.reduce(
    (acc, segment) => acc + segment.durationMinutes,
    0
  );
  const hasStart = Boolean(startCoordinate);

  const legs: SalesRouteLeg[] = segmentSummaries.map((segmentSummary, index) => {
    const customerIndex = hasStart ? index : index + 1;
    const customer = customers[customerIndex];
    return {
      customerId: customer?.id ?? `leg-${index}`,
      arrivalIndex: index + 1,
      summary: segmentSummary,
    };
  });

  return {
    geometry: {
      type: 'LineString',
      coordinates,
    },
    summary: {
      distanceKm: totalDistanceKm,
      durationMinutes: totalDurationMinutes,
    },
    legs,
    origin: startCoordinate ?? null,
  };
};

