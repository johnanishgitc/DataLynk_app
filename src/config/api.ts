// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://itcatalystindia.com/Development/CustomerPortal_API',
  ENDPOINTS: {
    SIGNUP: '/api/signup',
    LOGIN: '/api/login',
    FORGOT_PASSWORD: '/api/forgot-password',
    CHANGE_PASSWORD: '/api/change-password',
    USER_CONNECTIONS: '/api/tally/user-connections',
    TALLY_DATA: '/api/tally/tallydata',
    LEDGER_LIST_WITH_ADDRESSES: '/api/tally/ledgerlist-w-addrs',
    STOCK_ITEMS: '/api/tally/stockitem',
    LEDGER_RECEIVABLES: '/api/tally/led_statbillrep',
    CREATE_CUSTOMER: '/api/tally/create-customer',
  },
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  // Use local proxy for web development to avoid CORS issues
  const isWeb = typeof window !== 'undefined';
  const isLocalhost = isWeb && (window?.location?.hostname === 'localhost' || window?.location?.hostname === '127.0.0.1');
  
  if (isWeb && isLocalhost) {
    // Use local proxy for web development - proxy is running on port 3000
    return `http://localhost:3000${endpoint}`;
  }
  
  // For mobile apps and remote web, always use direct connection
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// For debugging: Check if proxy server is accessible
export const checkProxyHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3000/health');
    return response.ok;
  } catch (error) {
    return false;
  }
};

// API Response Types
export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Login Response Type
export interface LoginResponse {
  name: string;
  email: string;
  token: string;
  is_first_login: number;
}

// Signup Request Type
export interface SignupRequest {
  name: string;
  email: string;
  mobile: string;
}

// Login Request Type
export interface LoginRequest {
  username: string;
  password: string;
}

// Change Password Request Type
export interface ChangePasswordRequest {
  email: string;
  oldPassword: string;
  newPassword: string;
}

// User Connection Type
export interface UserConnection {
  tallyloc_id: number;
  conn_name: string;
  company: string;
  guid: string;
  address: string;
  pincode: string;
  statename: string;
  countryname: string;
  email: string;
  phonenumber: string;
  mobilenumbers: string;
  gstinno: string;
  startingfrom: string;
  booksfrom: string;
  shared_email: string;
  status: string;
  access_type: string;
  createdAt: string;
}

// User Connections Response Type
export interface UserConnectionsResponse {
  createdByMe: UserConnection[];
  sharedWithMe: UserConnection[];
}
