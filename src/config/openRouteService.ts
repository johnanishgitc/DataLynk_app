export const ORS_CONFIG = {
  BASE_URL: 'https://api.openrouteservice.org/v2',
  API_KEY: process.env.EXPO_PUBLIC_ORS_API_KEY ?? '',
};

export const getOrsUrl = (endpoint: string) => `${ORS_CONFIG.BASE_URL}${endpoint}`;

export const hasOrsApiKey = () => Boolean(ORS_CONFIG.API_KEY && ORS_CONFIG.API_KEY.trim());

