import {
  API_CONFIG,
  getApiUrl,
  ApiResponse,
  SignupRequest,
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  UserConnection,
  UserConnectionsResponse,
} from '../config/api';
import {
  getItemsXmlRequest,
  getItemsWithPriceLevelsXmlRequest,
  getCustomersXmlRequest,
  getOrderListXmlRequest,
  getVoucherTypesXmlRequest,
} from '../utils/tallyXmlRequests';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { salesDataService } from './salesDataService';
import { voucherDataService } from './voucherDataService';
import { companyDataService } from './companyDataService';

export interface CreateCustomerRequest {
  tallyloc_id: string | number;
  company: string;
  guid: string;
  customer_name: string;
  contact_person: string;
  mobile_number: string;
  gst_number?: string;
  pan_number?: string;
  address?: string;
  state?: string;
  country?: string;
  pincode?: string;
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  latitude?: number;
  longitude?: number;
}

// Token storage
let authToken: string | null = null;

// API Service class
class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  // Set auth token
  setAuthToken(token: string) {
    authToken = token;
  }

  // Get auth token
  getAuthToken(): string | null {
    return authToken;
  }

  // Clear auth token
  clearAuthToken() {
    authToken = null;
  }

  // Test API connectivity
  async testConnection(): Promise<boolean> {
    try {
      console.log('🌐 Testing API connectivity to:', `${API_CONFIG.BASE_URL}/api/login`);
      
      // Test the actual API endpoint we'll be using
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for test
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'test', password: 'test' }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('🌐 API connectivity test response status:', response.status);
      
      // Even if login fails, if we get a response, the endpoint is reachable
      return response.status !== 0; // 0 means network error
    } catch (error) {
      console.error('API Connection Test Failed:', error);
      return false;
    }
  }

  // Generic GET request
  private async get<T>(endpoint: string, requireAuth: boolean = false): Promise<ApiResponse> {
    try {
      let url = getApiUrl(endpoint);
      
      // Add cache-busting query parameter for mobile to always get fresh data
      if (typeof window === 'undefined') {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}_t=${Date.now()}`;
      }
      
      // Check if this is a web request to localhost and proxy might be down
      const isWeb = typeof window !== 'undefined';
      const isLocalhost = isWeb && (window?.location?.hostname === 'localhost' || window?.location?.hostname === '127.0.0.1');
      
      if (isWeb && isLocalhost && url.includes('localhost:3000')) {
        try {
          // Try to check if proxy is accessible
          const proxyResponse = await fetch('http://localhost:3000/health');
          if (!proxyResponse.ok) {
            console.log('🌐 Proxy server not responding, falling back to direct connection');
            url = `${API_CONFIG.BASE_URL}${endpoint}`;
          }
        } catch (proxyError) {
          console.log('🌐 Proxy server not accessible, falling back to direct connection');
          url = `${API_CONFIG.BASE_URL}${endpoint}`;
        }
      }
      
      const headers: Record<string, string> = {};

      // Add User-Agent header to distinguish mobile from web
      if (typeof window !== 'undefined' && window.navigator && window.navigator.userAgent) {
        headers['User-Agent'] = window.navigator.userAgent;
      } else {
        headers['User-Agent'] = 'TallyCatalyst-Mobile/1.0';
      }

      // Add cache-busting headers for mobile to always get fresh data
      if (typeof window === 'undefined' || (typeof window !== 'undefined' && !window.navigator?.userAgent)) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
        // Add timestamp to prevent any caching
        headers['X-Timestamp'] = Date.now().toString();
      }

      // Add authorization header if required
      if (requireAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }



      console.log('🌐 Making GET request to:', url);
      console.log('📋 Request headers:', headers);
      
      // Add timeout to prevent hanging - reduced to 15 seconds for faster failure
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ API call timeout after 15 seconds');
        controller.abort();
      }, 15000); // 15 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log('📡 HTTP response status:', response.status, response.statusText);
      console.log('📡 HTTP response headers:', Object.fromEntries(response.headers.entries()));

      const result = await response.json();
      console.log('📄 Raw JSON response:', JSON.stringify(result, null, 2));
      
      // Handle specific error cases
      let errorMessage = 'Request failed';
      
      if (response.status === 401) {
        errorMessage = 'Incorrect username or password. Please try again.';
      } else if (result.message) {
        errorMessage = result.message;
      } else if (result.error) {
        // Handle nested error object
        if (typeof result.error === 'string') {
          errorMessage = result.error;
        } else if (result.error.message) {
          errorMessage = result.error.message;
        }
      }
      
      return {
        success: response.ok,
        message: errorMessage,
        data: result, // Use the full result, not result.data
      };
    } catch (error) {
      console.error('API Error:', error);
      
      // Handle timeout error
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timeout. Please check your connection and try again.',
        };
      }
      
      return {
        success: false,
        message: 'Network error. Please check your connection.',
      };
    }
  }

  // Generic POST request
  private async post<T>(endpoint: string, data: any, requireAuth: boolean = false): Promise<ApiResponse> {
    const methodStartTime = Date.now();
    try {
      let url = getApiUrl(endpoint);
      console.log(`⏱️ [POST] Starting request to ${endpoint}`);
      console.log(`🌐 [POST] Initial URL: ${url}`);
      
      // Check if this is a web request to localhost and proxy might be down
      const isWeb = typeof window !== 'undefined';
      const isLocalhost = isWeb && (window?.location?.hostname === 'localhost' || window?.location?.hostname === '127.0.0.1');
      console.log(`📱 [POST] Platform: ${isWeb ? 'Web' : 'Mobile'}, Localhost: ${isLocalhost}`);
      
      if (isWeb && isLocalhost && url.includes('localhost:3000')) {
        try {
          // Try to check if proxy is accessible
          const proxyResponse = await fetch('http://localhost:3000/health');
          if (!proxyResponse.ok) {
            console.log('🌐 Proxy server not responding, falling back to direct connection');
            url = `${API_CONFIG.BASE_URL}${endpoint}`;
          }
        } catch (proxyError) {
          console.log('🌐 Proxy server not accessible, falling back to direct connection');
          url = `${API_CONFIG.BASE_URL}${endpoint}`;
        }
      }
      
      console.log(`🌐 [POST] Final URL: ${url}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if required
      if (requireAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const beforeFetch = Date.now();
      console.log(`⏱️ [POST] Starting fetch at ${beforeFetch - methodStartTime}ms`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const afterFetch = Date.now();
      console.log(`⏱️ [POST] Fetch completed in ${afterFetch - beforeFetch}ms`);

      const beforeJson = Date.now();
      const result = await response.json();
      const afterJson = Date.now();
      console.log(`⏱️ [POST] JSON parsing took ${afterJson - beforeJson}ms`);
      
      // Handle specific error cases
      let errorMessage = 'Request failed';
      
      if (response.status === 401) {
        errorMessage = 'Incorrect username or password. Please try again.';
      } else if (result.message) {
        errorMessage = result.message;
      } else if (result.error) {
        // Handle nested error object
        if (typeof result.error === 'string') {
          errorMessage = result.error;
        } else if (result.error.message) {
          errorMessage = result.error.message;
        }
      }
      
      return {
        success: response.ok,
        message: errorMessage,
        data: result.data || result,
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
      };
    }
  }

  // Signup API
  async signup(userData: SignupRequest): Promise<ApiResponse> {
    return this.post(API_CONFIG.ENDPOINTS.SIGNUP, userData);
  }

  // Login API
  async login(credentials: LoginRequest): Promise<ApiResponse> {
    const response = await this.post(API_CONFIG.ENDPOINTS.LOGIN, {
      email: credentials.username, // Changed from username to email
      password: credentials.password,
    });
    
    // If login successful, store the token
    if (response.success && response.data) {
      const loginData = response.data as LoginResponse;
      this.setAuthToken(loginData.token);
    }
    
    return response;
  }

  // Change Password API
  async changePassword(passwordData: ChangePasswordRequest): Promise<ApiResponse> {
    return this.post(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, passwordData, true);
  }

  // Forgot Password API (for future use)
  async forgotPassword(email: string): Promise<ApiResponse> {
    return this.post(API_CONFIG.ENDPOINTS.FORGOT_PASSWORD, { email });
  }

  // Get User Connections API
  async getUserConnections(): Promise<ApiResponse> {
    try {
      console.log('🔗 Calling getUserConnections API endpoint:', API_CONFIG.ENDPOINTS.USER_CONNECTIONS);
      console.log('🔑 Auth token for API call:', !!this.getAuthToken());
      
      // First, try a simple connectivity test
      console.log('🌐 Testing API connectivity...');
      const connectivityTest = await this.testConnection();
      console.log('🌐 API connectivity test result:', connectivityTest);
      
      if (!connectivityTest) {
        console.log('❌ API connectivity test failed, returning error');
        return {
          success: false,
          message: 'Unable to connect to server. Please check your internet connection.',
          data: null
        };
      }
      
      // Try the main API call
      console.log('📡 Attempting main API call...');
      const response = await this.get(API_CONFIG.ENDPOINTS.USER_CONNECTIONS, true);
      console.log('📡 getUserConnections raw response:', JSON.stringify(response, null, 2));
      
      // The API response structure has changed - the data is directly in the response
      if (response.success && response.data) {
        // Check if the response has the expected structure
        if (response.data.createdByMe || response.data.sharedWithMe) {
          // Response is already in the correct format
          return response;
        } else if (response.data.data && (response.data.data.createdByMe || response.data.data.sharedWithMe)) {
          // Response is nested one level deeper
          return {
            success: response.success,
            message: response.message,
            data: response.data.data
          };
        }
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching user connections:', error);
      
      // If the main API fails, try a fallback approach
      if (error.name === 'AbortError') {
        console.log('🔄 Main API timed out, trying fallback approach...');
        return await this.getUserConnectionsFallback();
      }
      
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
        data: null
      };
    }
  }

  // Fallback method for getting user connections
  async getUserConnectionsFallback(): Promise<ApiResponse> {
    try {
      console.log('🔄 Trying fallback approach for user connections...');
      
      // Try a direct fetch with minimal headers
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USER_CONNECTIONS}`;
      const authToken = this.getAuthToken();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🔄 Fallback response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔄 Fallback response data:', JSON.stringify(data, null, 2));
        
        return {
          success: true,
          message: 'User connections retrieved successfully',
          data: data
        };
      } else {
        return {
          success: false,
          message: `Server error: ${response.status}`,
          data: null
        };
      }
    } catch (error) {
      console.error('❌ Fallback approach also failed:', error);
      return {
        success: false,
        message: 'All connection attempts failed. Please check your internet connection.',
        data: null
      };
    }
  }

  // Get Items from Tally API (XML format as per instructions)
  async getVoucherTypes(tallylocId: string, company: string, guid: string): Promise<ApiResponse> {
    try {
      const startTime = Date.now();
      console.log(`⏱️ [${Date.now() - startTime}ms] Starting voucher types request`);
      
      const requestBody = {
        tallyloc_id: parseInt(tallylocId),
        company: company,
        guid: guid
      };
      
      // Use the optimized post method with proxy server fallback
      const response = await this.post('/api/tally/vouchertype', requestBody, true);
      
      console.log(`⏱️ [${Date.now() - startTime}ms] Voucher types request completed`);
      
      return response;
    } catch (error) {
      console.error('Error fetching voucher types:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Check credit days limit and overdue bills for customer
  async getCreditDaysLimit(tallylocId: string, company: string, guid: string, ledgerName: string): Promise<ApiResponse> {
    const startTime = Date.now();
    console.log(`⏱️ [Credit] Starting credit check request`);
    
    try {
      const requestBody = {
        tallyloc_id: parseInt(tallylocId),
        company: company,
        guid: guid,
        ledgername: ledgerName
      };
      
      console.log('📦 [Credit] Request body:', requestBody);
      console.log('🌐 [Credit] Endpoint: /api/tally/creditdayslimit');
      console.log('🌐 [Credit] Base URL:', this.baseUrl);
      
      const beforePost = Date.now();
      console.log(`⏱️ [Credit] Calling this.post at ${beforePost - startTime}ms`);
      
      // Use the optimized post method
      const response = await this.post('/api/tally/creditdayslimit', requestBody, true);
      
      const afterPost = Date.now();
      console.log(`⏱️ [Credit] this.post completed in ${afterPost - beforePost}ms (total: ${afterPost - startTime}ms)`);
      console.log('📊 [Credit] Response success:', response.success);
      
      return response;
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`⏱️ [Credit] Error after ${errorTime}ms:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getItemsFromTally(tallylocId: string, company: string, guid: string, usePriceLevels: boolean = false): Promise<ApiResponse> {
    const xmlRequest = usePriceLevels 
      ? getItemsWithPriceLevelsXmlRequest(company)
      : getItemsXmlRequest(company);

    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/xml',
          'x-tallyloc-id': tallylocId,
          'x-company': company,
          'x-guid': guid,
        },
        body: xmlRequest,
      });

      const result = await response.text();

      if (response.ok) {
        return {
          success: true,
          message: 'Items retrieved successfully',
          data: result,
        };
      } else {
        let errorMessage = 'Failed to get items from Tally';
        if (result) {
          try {
            const errorData = JSON.parse(result);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = result;
          }
        }
        return {
          success: false,
          message: errorMessage,
          data: null,
        };
      }
    } catch (error) {
      console.error('Error getting items from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Customers from Tally API (XML format as per instructions)
  async getCustomersFromTally(tallylocId: string, company: string, guid: string): Promise<ApiResponse> {
    const xmlRequest = getCustomersXmlRequest(company);

    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/xml',
          'x-tallyloc-id': tallylocId,
          'x-company': company,
          'x-guid': guid,
        },
        body: xmlRequest,
      });

      const result = await response.text();

      if (response.ok) {
        return {
          success: true,
          message: 'Customers retrieved successfully',
          data: result,
        };
      } else {
        let errorMessage = 'Failed to get customers from Tally';
        if (result) {
          try {
            const errorData = JSON.parse(result);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = result;
          }
        }
        return {
          success: false,
          message: errorMessage,
          data: null,
        };
      }
    } catch (error) {
      console.error('Error getting customers from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Order List from Tally API (XML format as per instructions)
  async getOrderListFromTally(tallylocId: string, company: string, guid: string, startDate?: Date, endDate?: Date): Promise<ApiResponse> {
    // Create the XML request with company name using the new template
    const xmlRequest = getOrderListXmlRequest(company, startDate, endDate);

    // Send XML request to Tally

    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();
      
      // Log the request details
      const requestHeaders = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/xml',
        'x-tallyloc-id': tallylocId,
        'x-company': company,
        'x-guid': guid,
      };
      
      // Send request to Tally

      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: xmlRequest,
      });

      const result = await response.text();

      // Process Tally response

      if (response.ok) {
        return {
          success: true,
          message: 'Order list retrieved successfully',
          data: result,
        };
      } else {
        let errorMessage = 'Failed to get order list from Tally';
        if (result) {
          try {
            const errorData = JSON.parse(result);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = result;
          }
        }
        return {
          success: false,
          message: errorMessage,
          data: null,
        };
      }
    } catch (error) {
      console.error('Error getting order list from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Order Details from Tally API for drill-down (legacy method)
  async getOrderDetailsFromTally(masterId: number, tallylocId: string, company: string, guid: string): Promise<ApiResponse> {
    // Create the XML request for order details
    const xmlRequest = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>ODBC Report</ID>
  </HEADER>
  <BODY>
    <DESC>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="ITC_OL_Details" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
            <Type>Vouchers : VoucherType</Type>
            <ChildOf>$$VchTypeSalesOrder</ChildOf>
            <Filter>$$MasterID = ${masterId}</Filter>
            <NativeMethod>*.*</NativeMethod>
          </COLLECTION>
          <COLLECTION NAME="ITC_OL_DetailsItems" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
            <SourceCollection>ITC_OL_Details</SourceCollection>
            <Walk>Inventory Entries</Walk>
            <NativeMethod>*.*</NativeMethod>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
      <SQLREQUEST TYPE="Prepare" METHOD="SQLPrepare">select $StockItemName, $ActualQty, $Rate, $Amount, $BaseUnits from ITC_OL_DetailsItems</SQLREQUEST>
      <STATICVARIABLES>
        <EXPLODEFLAG>Yes</EXPLODEFLAG>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    // Send order details request to Tally

    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();
      
      const requestHeaders = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/xml',
        'x-tallyloc-id': tallylocId,
        'x-company': company,
        'x-guid': guid,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: xmlRequest,
      });

      const result = await response.text();

      // Process Tally response

      if (response.ok) {
        return {
          success: true,
          message: 'Order details retrieved successfully',
          data: result,
        };
      } else {
        let errorMessage = 'Failed to get order details from Tally';
        if (result) {
          try {
            const errorData = JSON.parse(result);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = result;
          }
        }
        return {
          success: false,
          message: errorMessage,
          data: null,
        };
      }
    } catch (error) {
      console.error('Error getting order details from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Order Details from Tally API using custom XML request
  async getOrderDetailsFromTallyWithXml(tallylocId: string, company: string, guid: string, xmlRequest: string): Promise<ApiResponse> {
    // Send order details request to Tally

    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();
      
      const requestHeaders = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/xml',
        'x-tallyloc-id': tallylocId,
        'x-company': company,
        'x-guid': guid,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: xmlRequest,
      });

      const result = await response.text();

      // Process Tally response

      if (response.ok) {
        return {
          success: true,
          message: 'Order details retrieved successfully',
          data: result,
        };
      } else {
        let errorMessage = 'Failed to get order details from Tally';
        if (result) {
          try {
            const errorData = JSON.parse(result);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = result;
          }
        }
        return {
          success: false,
          message: errorMessage,
          data: null,
        };
      }
    } catch (error) {
      console.error('Error getting order details from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Ledgers from Tally API
  async getLedgersFromTally(tallylocId: string, company: string, guid: string): Promise<ApiResponse> {
    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.LEDGER_LIST_WITH_ADDRESSES);
      const authToken = this.getAuthToken();
      
      const requestBody = {
        tallyloc_id: parseInt(tallylocId),
        company: company,
        guid: guid,
      };


      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.text();

      // Process ledger list response

      if (response.ok) {
        return {
          success: true,
          message: 'Ledgers retrieved successfully',
          data: result,
        };
      } else {
        let errorMessage = 'Failed to get ledgers from Tally';
        if (result) {
          try {
            const errorData = JSON.parse(result);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = result;
          }
        }
        return {
          success: false,
          message: errorMessage,
          data: null,
        };
      }
    } catch (error) {
      console.error('Error getting ledgers from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Ledger Item Sales Report from Tally API
  async getLedgerItemSalesReport(
    tallylocId: string, 
    company: string, 
    guid: string, 
    ledgerName: string,
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse> {
    try {
      const url = getApiUrl('/api/tally/led_statbillrep');
      const authToken = this.getAuthToken();
      
      // Format dates as YYYYMMDD
      const fromDate = startDate.getFullYear().toString() + 
                      (startDate.getMonth() + 1).toString().padStart(2, '0') + 
                      startDate.getDate().toString().padStart(2, '0');
      
      const toDate = endDate.getFullYear().toString() + 
                    (endDate.getMonth() + 1).toString().padStart(2, '0') + 
                    endDate.getDate().toString().padStart(2, '0');
      
      const requestBody = {
        tallyloc_id: parseInt(tallylocId),
        company: company,
        guid: guid,
        reporttype: 'Ledger Vouchers',
        ledgername: ledgerName,
        fromdate: parseInt(fromDate),
        todate: parseInt(toDate),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.text();

      if (response.ok) {
        return {
          success: true,
          message: 'Ledger item sales report retrieved successfully',
          data: result,
        };
      } else {
        let errorMessage = 'Failed to get ledger item sales report from Tally';
        if (result) {
          try {
            const errorData = JSON.parse(result);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = result;
          }
        }
        return {
          success: false,
          message: errorMessage,
          data: null,
        };
      }
    } catch (error) {
      console.error('Error getting ledger item sales report from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Ledger Voucher Report from Tally API
  async getLedgerVoucherReport(
    tallylocId: string, 
    company: string, 
    guid: string, 
    ledgerName: string,
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse> {
    try {
      const url = getApiUrl('/api/tally/led_statbillrep');
      const authToken = this.getAuthToken();
      
      // Format dates as YYYYMMDD
      const fromDate = startDate.getFullYear().toString() + 
                      (startDate.getMonth() + 1).toString().padStart(2, '0') + 
                      startDate.getDate().toString().padStart(2, '0');
      
      const toDate = endDate.getFullYear().toString() + 
                    (endDate.getMonth() + 1).toString().padStart(2, '0') + 
                    endDate.getDate().toString().padStart(2, '0');
      
      const requestBody = {
        tallyloc_id: parseInt(tallylocId),
        company: company,
        guid: guid,
        reporttype: 'Ledger Vouchers',
        ledgername: ledgerName,
        fromdate: parseInt(fromDate),
        todate: parseInt(toDate),
      };

      // Send ledger voucher report request

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.text();

      // Debug logs removed for production

      if (response.ok) {
        return {
          success: true,
          message: 'Ledger voucher report retrieved successfully',
          data: result,
        };
      } else {
        let errorMessage = 'Failed to get ledger voucher report from Tally';
        if (result) {
          try {
            const errorData = JSON.parse(result);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = result;
          }
        }
        return {
          success: false,
          message: errorMessage,
          data: null,
        };
      }
    } catch (error) {
      console.error('Error getting ledger voucher report from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Customers from Tally API (JSON format with addresses)
  async getCustomersWithAddressesFromTally(tallylocId: string, company: string, guid: string): Promise<ApiResponse> {
    try {
      const startTime = Date.now();
      console.log(`⏱️ [${Date.now() - startTime}ms] Starting customers request`);
      
      const requestBody = {
        tallyloc_id: tallylocId,
        company: company,
        guid: guid,
      };
      
      // Use the optimized post method with proxy server fallback
      const response = await this.post(API_CONFIG.ENDPOINTS.LEDGER_LIST_WITH_ADDRESSES, requestBody, true);
      
      console.log(`⏱️ [${Date.now() - startTime}ms] Customers request completed`);
      
      if (response.success) {
        return {
          success: true,
          message: 'Customers with addresses retrieved successfully',
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: response.error || 'Failed to get customers with addresses from Tally',
          data: null,
        };
      }
    } catch (error) {
      console.error('Error getting customers with addresses from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  async createCustomer(payload: CreateCustomerRequest): Promise<ApiResponse> {
    try {
      console.log('🧾 Creating customer payload:', payload);
      const response = await this.post(API_CONFIG.ENDPOINTS.CREATE_CUSTOMER, payload, true);

      if (response.success) {
        return {
          success: true,
          message: response.message || 'Customer created successfully',
          data: response.data,
        };
      }

      return {
        success: false,
        message: response.message || 'Failed to create customer',
        data: response.data,
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Stock Items from Tally API (JSON format)
  async getStockItemsFromTally(tallylocId: string, company: string, guid: string): Promise<ApiResponse> {
    try {
      const startTime = Date.now();
      console.log(`⏱️ [${Date.now() - startTime}ms] Starting stock items request`);
      
      const requestBody = {
        tallyloc_id: tallylocId,
        company: company,
        guid: guid,
      };
      
      // Use the optimized post method with proxy server fallback
      const response = await this.post(API_CONFIG.ENDPOINTS.STOCK_ITEMS, requestBody, true);
      
      console.log(`⏱️ [${Date.now() - startTime}ms] Stock items request completed`);
      
      if (response.success) {
        return {
          success: true,
          message: 'Stock items retrieved successfully',
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: response.error || 'Failed to get stock items from Tally',
          data: null,
        };
      }
    } catch (error) {
      console.error('Error getting stock items from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Godown Stock for a specific item
  async getGodownStock(tallylocId: number, company: string, guid: string, itemName: string): Promise<ApiResponse> {
    try {
      const requestBody = {
        tallyloc_id: tallylocId,
        company: company,
        guid: guid,
        item: itemName,
      };
      
      console.log('📦 Godown stock request body:', requestBody);
      
      const response = await this.post('/api/tally/godownStock', requestBody, true);
      
      console.log('📦 Godown stock raw response:', response);
      
      if (response.success) {
        return {
          success: true,
          message: 'Godown stock retrieved successfully',
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: response.error || 'Failed to get godown stock from Tally',
          data: response.data || null,
        };
      }
    } catch (error) {
      console.error('Error getting godown stock from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Optional Vouchers with custom XML (for background checking with MasterID filter)
  async getOptionalVouchersWithXML(tallylocId: string, company: string, guid: string, xmlRequest: string): Promise<ApiResponse> {
    try {
      console.log('📋 [OptionalVouchersXML] Sending custom XML request');

      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();

      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/xml',
          'x-tallyloc-id': tallylocId,
          'x-company': company,
          'x-guid': guid,
        },
        body: xmlRequest,
      });

      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`);
      }

      const xmlResponse = await fetchResponse.text();
      
      return {
        success: true,
        message: 'Optional vouchers retrieved successfully',
        data: xmlResponse,
      };
    } catch (error) {
      console.error('❌ [OptionalVouchersXML] Error getting optional vouchers:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get optional vouchers',
        data: null,
      };
    }
  }

  // Get Optional Vouchers (for authorization)
  async getOptionalVouchers(tallylocId: string, company: string, guid: string, startDate?: Date, endDate?: Date): Promise<ApiResponse> {
    try {
      // Format dates as DD-Mmm-YY
      const formatDate = (date: Date) => {
        const day = date.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear().toString().slice(-2);
        return `${day.toString().padStart(2, '0')}-${month}-${year}`;
      };

      const fromDateStr = startDate ? formatDate(startDate) : '01-Apr-25';
      const toDateStr = endDate ? formatDate(endDate) : formatDate(new Date());

      const xmlRequest = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>ODBC Report</ID>
  </HEADER>
  <BODY>
    <DESC>
      <TDL>
        <TDLMESSAGE>
          <REPORT NAME="ODBC Report" ISMODIFY="Yes" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
            <Add>Variable : SVFromDate, SVToDate</Add>
            <Set>SVFromdate : "${fromDateStr}"</Set>
            <Set>SVTodate : "${toDateStr}"</Set>
          </REPORT>
          
          <COLLECTION NAME="ITC_Vch Coll" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
            <TYPE>Vouchers</TYPE>
            <BELONGSTO>Yes</BELONGSTO>
            <NATIVEMETHOD>*.*</NATIVEMETHOD>
            <METHOD>Amount : $AllLedgerEntries[1].Amount</METHOD>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
      
      <SQLREQUEST TYPE="Prepare" METHOD="SQLPrepare">
        select 
          $MasterID as MasterID, 
          $Date as Dates, 
          $voucherNumber as InvNo, 
          $VoucherTypeName as VoucherType, 
          $PartyLedgerName as Customer, 
          $Amount as Amount,
          $Narration as Narration
        from ITC_VchColl where $IsOptional
      </SQLREQUEST>
      
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

      // Send XML request directly to backend API
      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();

      const startTime = Date.now();
      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/xml',
          'x-tallyloc-id': tallylocId,
          'x-company': company,
          'x-guid': guid,
        },
        body: xmlRequest,
      });

      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`);
      }

      const xmlResponse = await fetchResponse.text();
      const elapsed = Date.now() - startTime;
      
      // Only log if it takes longer than expected (> 2 seconds)
      if (elapsed > 2000) {
        console.log(`⏱️ [OptionalVouchers] Slow response: ${elapsed}ms`);
      }

      if (xmlResponse) {
        return {
          success: true,
          message: 'Optional vouchers retrieved successfully',
          data: xmlResponse,
        };
      } else {
        return {
          success: false,
          message: 'Failed to get optional vouchers - empty response',
          data: null,
        };
      }
    } catch (error) {
      console.error('❌ [OptionalVouchers] Error getting optional vouchers:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Approve a voucher by changing ISOPTIONAL flag and updating narration
  async getVoucherDetailByMasterID(
    tallylocId: string,
    company: string,
    guid: string,
    masterID: string
  ): Promise<ApiResponse> {
    try {
       // Use the Object export format to get complete voucher details - matching the CURL format exactly
       const xmlRequest = `<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>EXPORT</TALLYREQUEST>
<TYPE>Object</TYPE>
<SUBTYPE>VOUCHER</SUBTYPE>
<ID TYPE="Name">ID:${masterID}</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
<SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
</STATICVARIABLES>
<FETCHLIST>
    <FETCH>Date</FETCH>
    <FETCH>VoucherTypeName</FETCH>
    <FETCH>VoucherNumber</FETCH>
    <FETCH>AllInventoryEntries</FETCH>
    <FETCH>LedgerEntries</FETCH>
    <FETCH>PartyLedgerName</FETCH>
    <FETCH>Narration</FETCH>
    <FETCH>Reference</FETCH>
</FETCHLIST>
</DESC>
</BODY>
</ENVELOPE>`;

      console.log('📋 [GetVoucherDetail] Request details:', {
        company,
        masterID,
        tallylocId,
        guid
      });
      console.log('📋 [GetVoucherDetail] XML Request:', xmlRequest);
      console.log('📋 [GetVoucherDetail] Sending request to backend');

      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();

      console.log('📋 [GetVoucherDetail] URL:', url);
      console.log('📋 [GetVoucherDetail] Headers:', {
        'Authorization': 'Bearer ***',
        'Content-Type': 'application/xml',
        'x-tallyloc-id': tallylocId,
        'x-company': company,
        'x-guid': guid,
      });

      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/xml',
          'x-tallyloc-id': tallylocId,
          'x-company': company,
          'x-guid': guid,
        },
        body: xmlRequest,
      });

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        const elapsed = Date.now() - startTime;
        console.error(`❌ [GetVoucherDetail] HTTP error: ${fetchResponse.status} (${elapsed}ms)`, errorText.substring(0, 200));
        throw new Error(`HTTP error! status: ${fetchResponse.status}`);
      }

      const xmlResponse = await fetchResponse.text();
      const elapsed = Date.now() - startTime;
      
      // Only log if response is slow
      if (elapsed > 2000) {
        console.log(`⏱️ [GetVoucherDetail] Slow response: ${elapsed}ms, length: ${xmlResponse.length}`);
      }

      return {
        success: true,
        message: 'Voucher details retrieved successfully',
        data: xmlResponse,
      };
    } catch (error) {
      console.error('❌ [GetVoucherDetail] Error getting voucher details:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  async approveVoucher(
    tallylocId: string,
    company: string,
    guid: string,
    masterID: string,
    voucherDate: string,
    currentNarration: string,
    username: string
  ): Promise<ApiResponse> {
    try {
      // Import escapeXmlValue helper
      const escapeXmlValue = (value: string): string => {
        if (!value) return '';
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      // Get current date and time for approval in compact format
      const now = new Date();
      const day = now.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[now.getMonth()];
      const year = now.getFullYear().toString().slice(-2); // Last 2 digits
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      
      const dateTimeStr = `${day}-${month}-${year} ${hours}:${minutes}`; // Format: 16-Oct-25 08:48
      
      // Append approval info to existing narration with compact date and time
      const approvalInfo = `Approved by: ${username} on ${dateTimeStr}`;
      const updatedNarration = currentNarration 
        ? `${currentNarration} | ${approvalInfo}`
        : approvalInfo;

      // Convert voucher date from DD-MMM-YY to YYYYMMDD format for Tally
      const convertDateToTallyFormat = (dateStr: string): string => {
        try {
          // If already in YYYYMMDD format, return as is
          if (/^\d{8}$/.test(dateStr)) {
            return dateStr;
          }
          
          // Parse DD-MMM-YY format (e.g., "16-Oct-25")
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const monthStr = parts[1];
            const yearStr = parts[2];
            
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
            
            if (monthIndex !== -1) {
              const month = (monthIndex + 1).toString().padStart(2, '0');
              // Convert 2-digit year to 4-digit (assuming 20XX for years 00-99)
              const year = yearStr.length === 2 ? `20${yearStr}` : yearStr;
              return `${year}${month}${day}`;
            }
          }
          
          // Fallback: try to parse as Date and format
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}${month}${day}`;
          }
          
          return dateStr; // Return original if parsing fails
        } catch (error) {
          console.error('Error converting date format:', error);
          return dateStr;
        }
      };

      const tallyDate = convertDateToTallyFormat(voucherDate);
      const escapedCompany = escapeXmlValue(company);
      const escapedNarration = escapeXmlValue(updatedNarration);
      const escapedMasterID = escapeXmlValue(masterID);

      const xmlRequest = `<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>IMPORT</TALLYREQUEST>
        <TYPE>DATA</TYPE>
        <ID>Vouchers</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVCurrentCompany>${escapedCompany}</SVCurrentCompany>
            </STATICVARIABLES>
        </DESC>
        <DATA>
            <TALLYMESSAGE>
                <VOUCHER DATE="${tallyDate}" TAGNAME="MASTERID" TAGVALUE="${escapedMasterID}" ACTION="Alter">
                    <ISOPTIONAL>No</ISOPTIONAL>
                    <NARRATION>${escapedNarration}</NARRATION>
                </VOUCHER>
            </TALLYMESSAGE>
        </DATA>
    </BODY>
</ENVELOPE>`;

      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();

      const startTime = Date.now();
      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/xml',
          'x-tallyloc-id': tallylocId,
          'x-company': company,
          'x-guid': guid,
        },
        body: xmlRequest,
      });

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        const elapsed = Date.now() - startTime;
        console.error(`❌ [ApproveVoucher] HTTP Error: ${fetchResponse.status} (${elapsed}ms)`, errorText.substring(0, 200));
        throw new Error(`HTTP error! status: ${fetchResponse.status}`);
      }

      const xmlResponse = await fetchResponse.text();
      const elapsed = Date.now() - startTime;
      
      // Only log full response if there's an error or it's slow
      if (elapsed > 2000) {
        console.log(`⏱️ [ApproveVoucher] Slow approval: ${elapsed}ms`);
      }

      // Check if response indicates success
      // Tally typically returns SUCCESS or CREATED in the response
      const isSuccess = xmlResponse.includes('CREATED') || 
                       xmlResponse.includes('SUCCESS') || 
                       xmlResponse.includes('ALTERED') ||
                       (!xmlResponse.includes('ERROR') && !xmlResponse.includes('Failed'));
      
      if (isSuccess) {
        return {
          success: true,
          message: 'Voucher approved successfully',
          data: xmlResponse,
        };
      } else {
        // Extract error message from XML if available
        const errorMatch = xmlResponse.match(/<ERROR[^>]*>([^<]+)<\/ERROR>/i) || 
                          xmlResponse.match(/<MESSAGE[^>]*>([^<]+)<\/MESSAGE>/i);
        const errorMessage = errorMatch ? errorMatch[1] : 'Failed to approve voucher';
        
        return {
          success: false,
          message: errorMessage,
          data: xmlResponse,
        };
      }
    } catch (error) {
      console.error('❌ [ApproveVoucher] Error approving voucher:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Company Stock for a specific item
  async getCompanyStock(tallylocId: number, company: string, guid: string, itemName: string): Promise<ApiResponse> {
    try {
      const requestBody = {
        tallyloc_id: tallylocId,
        company: company,
        guid: guid,
        item: itemName,
      };
      
      console.log('🏢 Company stock request body:', requestBody);
      
      const response = await this.post('/api/tally/companystock', requestBody, true);
      
      console.log('🏢 Company stock raw response:', response);
      
      if (response.success) {
        return {
          success: true,
          message: 'Company stock retrieved successfully',
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: response.error || 'Failed to get company stock from Tally',
          data: response.data || null,
        };
      }
    } catch (error) {
      console.error('Error getting company stock from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get Ledger Receivables from Tally API
  async getLedgerReceivablesFromTally(
    tallylocId: string, 
    company: string, 
    guid: string, 
    ledgerName: string, 
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse> {
    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.LEDGER_RECEIVABLES);
      const authToken = this.getAuthToken();
      
      // Format dates as YYYYMMDD
      const fromDate = startDate.getFullYear().toString() + 
                      (startDate.getMonth() + 1).toString().padStart(2, '0') + 
                      startDate.getDate().toString().padStart(2, '0');
      
      const toDate = endDate.getFullYear().toString() + 
                    (endDate.getMonth() + 1).toString().padStart(2, '0') + 
                    endDate.getDate().toString().padStart(2, '0');
      
      const requestBody = {
        tallyloc_id: parseInt(tallylocId),
        company: company,
        guid: guid,
        reporttype: "Bill wise O/s",
        ledgername: ledgerName,
        fromdate: parseInt(fromDate),
        todate: parseInt(toDate),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.text();

      if (response.ok) {
        return {
          success: true,
          message: 'Ledger receivables retrieved successfully',
          data: result,
        };
      } else {
        let errorMessage = 'Failed to get ledger receivables from Tally';
        if (result) {
          try {
            const errorData = JSON.parse(result);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = result;
          }
        }
        return {
          success: false,
          message: errorMessage,
          data: null,
        };
      }
    } catch (error) {
      console.error('Error getting ledger receivables from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get voucher types from Tally
  async getVoucherTypesFromTally(tallylocId: string, company: string, guid: string): Promise<ApiResponse> {
    const xmlRequest = getVoucherTypesXmlRequest();

    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/xml',
          'x-tallyloc-id': tallylocId,
          'x-company': company,
          'x-guid': guid,
        },
        body: xmlRequest,
      });

      const result = await response.text();

      if (!response.ok) {
        return {
          success: false,
          message: `HTTP error! status: ${response.status}`,
          data: null,
        };
      }

      return {
        success: true,
        message: 'Voucher types fetched successfully',
        data: result,
      };
    } catch (error) {
      console.error('Error getting voucher types from Tally:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        data: null,
      };
    }
  }

  // Get sales data from Tally using XML request
  async executeTallyXmlRequest(
    tallylocId: string,
    company: string,
    guid: string,
    xmlRequest: string
  ): Promise<ApiResponse> {
    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();
      
      if (!authToken) {
        throw new Error('No authentication token available');
      }

      console.log('📤 Executing Tally XML request to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/xml',
          'x-tallyloc-id': tallylocId,
          'x-company': company,
          'x-guid': guid,
        },
        body: xmlRequest,
      });

      const result = await response.text();

      if (response.ok) {
        return {
          success: true,
          data: result,
          message: 'Tally XML request executed successfully'
        };
      } else {
        console.error('❌ Tally XML request failed:', result);
        return {
          success: false,
          message: 'Failed to execute Tally XML request',
          error: result
        };
      }
    } catch (error) {
      console.error('❌ Error executing Tally XML request:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error
      };
    }
  }

  async getSalesDataReport(
    tallylocId: string,
    company: string,
    guid: string,
    startDate: Date,
    endDate: Date,
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<ApiResponse> {
    const operationStartTime = Date.now();
    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.TALLY_DATA);
      const authToken = this.getAuthToken();
      
      if (!authToken) {
        throw new Error('No authentication token available');
      }

      // Format dates as DD-MMM-YY (e.g., "08-Apr-25")
      const formatDateForTally = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear().toString().slice(-2);
        return `${day}-${month}-${year}`;
      };

      // Calculate date range and chunk it into 5-day periods
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      let chunkSize = 5; // default 5 days per chunk
      try {
        const v = await AsyncStorage.getItem('sync_chunk_days');
        if (v && !isNaN(Number(v))) {
          const n = Math.min(31, Math.max(1, Number(v)));
          chunkSize = n;
        }
      } catch {}
      const totalChunks = Math.ceil(totalDays / chunkSize);
      
      console.log('📅 Sales Data Report - Chunked loading:', {
        totalDays,
        chunkSize,
        totalChunks,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      let allEntries: any[] = [];
      
      // Process each chunk
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunkStartDate = new Date(startDate);
        chunkStartDate.setDate(startDate.getDate() + (chunkIndex * chunkSize));
        
        const chunkEndDate = new Date(chunkStartDate);
        chunkEndDate.setDate(chunkStartDate.getDate() + chunkSize - 1);
        
        // Don't go beyond the original end date
        if (chunkEndDate > endDate) {
          chunkEndDate.setTime(endDate.getTime());
        }
        
        const fromDateStr = formatDateForTally(chunkStartDate);
        const toDateStr = formatDateForTally(chunkEndDate);
        
        console.log(`📊 Processing chunk ${chunkIndex + 1}/${totalChunks}: ${fromDateStr} to ${toDateStr}`);
        
        // Report progress
        if (onProgress) {
          onProgress(chunkIndex + 1, totalChunks, `Processing chunk ${chunkIndex + 1}/${totalChunks}: ${fromDateStr} to ${toDateStr}`);
        }

        const chunkStartTime = Date.now();

        const xmlRequest = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>ODBC Report</ID>
  </HEADER>
  <BODY>
    <DESC>
      <TDL>
        <TDLMESSAGE>
          <REPORT NAME="ODBC Report" ISMODIFY="Yes" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
            <Add>Variable : SVFromDate, SVToDate</Add>
            <Set>SVFromdate : "${fromDateStr}"</Set>
            <Set>SVTodate : "${toDateStr}"</Set>
          </REPORT>
          
          <COLLECTION NAME="ITC_Vch Coll" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
            <TYPE>Vouchers : VoucherType</TYPE>
            <CHILDOF>$$VchTypeSales</CHILDOF>
            <BELONGSTO>Yes</BELONGSTO>
            <NATIVEMETHOD>*.*</NATIVEMETHOD>
            <METHOD>_Amount : $AllLedgerEntries[1].Amount</METHOD>
          </COLLECTION>
          
          <COLLECTION NAME="ITC_Vch CollDetails" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
            <SOURCECOLLECTION>ITC_Vch Coll</SOURCECOLLECTION>
            <WALK>Inventory Entries</WALK>
            <NATIVEMETHOD>*.*</NATIVEMETHOD>
            <METHOD>MasterID : $..MasterID</METHOD>
            <METHOD>AlterID : $..AlterID</METHOD>
            <METHOD>Date : $..Date</METHOD>
            <METHOD>Reference : $..Reference</METHOD>
            <METHOD>PartyLedgerName : $..PartyLedgerName</METHOD>
            <METHOD>Pincode : $Pincode:Ledger:$..PartyLedgerName</METHOD>
            <METHOD>StockGroup : $Parent:StockItem:$StockItemName</METHOD>
            <METHOD>GrossProfit : $$AmountSubtract:$Amount:$GrossCost</METHOD>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
      
      <SQLREQUEST TYPE="Prepare" METHOD="SQLPrepare">
        select 
          $MasterID as MasterID, 
          $AlterID as AlterID, 
          $Date as Dates, 
          $voucherNumber as InvNo, 
          $voucherTypeName as VchType, 
          $PartyLedgerName as Customer, 
          $Pincode as Pincode, 
          $StockItemName as ItemName, 
          $StockGroup as StockGroup, 
          $$Number:$ActualQty as Qty, 
          $$Number:$Rate as Rate, 
          $Amount as Amount,
          $GrossProfit as Profit
        from ITC_VchCollDetails
      </SQLREQUEST>
      
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

        // Make API call for this chunk
        const tallyStartTime = Date.now();
        const chunkResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'Authorization': `Bearer ${authToken}`,
            'x-tallyloc-id': tallylocId,
            'x-company': company,
            'x-guid': guid,
          },
          body: xmlRequest,
        });

        if (!chunkResponse.ok) {
          throw new Error(`HTTP error! status: ${chunkResponse.status}`);
        }

        const chunkResponseText = await chunkResponse.text();
        const tallyEndTime = Date.now();
        const tallyTime = tallyEndTime - tallyStartTime;
        console.log(`📊 Chunk ${chunkIndex + 1} response received (Tally API: ${tallyTime}ms)`);
        
        // Parse this chunk's data
        const parseStartTime = Date.now();
        const chunkParsedData = this.parseTallySalesDataResponse(chunkResponseText);
        const parseEndTime = Date.now();
        const parseTime = parseEndTime - parseStartTime;
        console.log(`🔍 Chunk ${chunkIndex + 1} parsing time: ${parseTime}ms`);
        if (chunkParsedData.entries && chunkParsedData.entries.length > 0) {
          allEntries = allEntries.concat(chunkParsedData.entries);
          console.log(`✅ Chunk ${chunkIndex + 1} added ${chunkParsedData.entries.length} entries (Total: ${allEntries.length})`);
        }
      }
      
      console.log(`🎉 All chunks processed. Total entries: ${allEntries.length}`);
      
      // Store data in SQLite for offline access
      const sqliteStartTime = Date.now();
      try {
        // Ensure SQLite is initialized before using it
        try {
          await salesDataService.initialize();
        } catch (initError) {
          console.log('📱 SQLite already initialized or initialization failed:', initError);
        }
        
        // Convert entries to SalesDataEntry format with timestamps
        const salesDataEntries = allEntries.map(entry => ({
          ...entry,
          createdAt: new Date().toISOString()
        }));
        
        // Clear existing data for this date range (use YYYY-MM-DD format)
        const formatDateForDatabase = (date: Date) => {
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        const startDateStr = formatDateForDatabase(startDate);
        const endDateStr = formatDateForDatabase(endDate);
        await salesDataService.clearDataForDateRange(startDateStr, endDateStr);
        
        // Insert new data
        await salesDataService.insertSalesData(salesDataEntries);
        
        const sqliteEndTime = Date.now();
        const sqliteTime = sqliteEndTime - sqliteStartTime;
        console.log(`💾 Stored ${salesDataEntries.length} entries in SQLite for offline access (SQLite: ${sqliteTime}ms)`);
      } catch (error) {
        console.error('⚠️ Failed to store data in SQLite:', error);
        // Continue with the response even if SQLite storage fails
      }
      
      const operationEndTime = Date.now();
      const totalTime = operationEndTime - operationStartTime;
      console.log(`⏱️ Total operation time: ${totalTime}ms`);
      
      return { success: true, data: { entries: allEntries } };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Get user roles for selected company (using existing access-control endpoint)
  async getUserWiseCoWiseRoles(tallylocId: string, coGuid: string): Promise<ApiResponse> {
    return this.get(`/api/access-control/user-access?tallylocId=${tallylocId}&co_guid=${coGuid}`, true);
  }

  // Get all available modules and permissions
  async getAllPermissions(): Promise<ApiResponse> {
    return this.get(`/api/access-control/permissions/all?includeHierarchy=true`, true);
  }

  // Get sales data from SQLite for offline access
  async getSalesDataFromSQLite(startDate: Date, endDate: Date): Promise<ApiResponse> {
    try {
      // Ensure SQLite is initialized before using it
      try {
        await salesDataService.initialize();
      } catch (initError) {
        console.log('📱 SQLite already initialized or initialization failed:', initError);
      }
      
      // Format dates for database query (use YYYY-MM-DD format to match stored data)
      const formatDateForDatabase = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startDateStr = formatDateForDatabase(startDate);
      const endDateStr = formatDateForDatabase(endDate);
      
      console.log(`📱 Loading sales data from SQLite for offline access...`);
      console.log(`📱 Date range: ${startDateStr} to ${endDateStr}`);
      
      // Check if data exists for this date range
      const hasData = await salesDataService.hasDataForDateRange(startDateStr, endDateStr);
      console.log(`📱 Has data for date range: ${hasData}`);
      
      if (!hasData) {
        console.log(`📱 No offline data found for ${startDateStr} to ${endDateStr}`);
        return {
          success: false,
          message: 'No offline data available for this date range'
        };
      }
      
      // Get data from SQLite
      const entries = await salesDataService.getSalesDataByDateRange(startDateStr, endDateStr);
      
      console.log(`📱 Retrieved ${entries.length} entries from SQLite`);
      
      return {
        success: true,
        data: { entries },
        message: 'Data loaded from offline storage'
      };
    } catch (error) {
      console.error('❌ Failed to load data from SQLite:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to load offline data'
      };
    }
  }

  // Parse Tally sales data XML response
  private parseTallySalesDataResponse(xmlText: string): any {
    try {
      console.log('🔍 Parsing Tally sales data response...');
      
      // Extract ROW data from the XML
      const rowMatches = xmlText.match(/<ROW>[\s\S]*?<\/ROW>/g);
      if (!rowMatches || rowMatches.length === 0) {
        console.log('❌ No ROW data found in response');
        return { entries: [] };
      }

      console.log(`📊 Found ${rowMatches.length} rows in response`);

      const entries = rowMatches.map((rowXml, index) => {
        // Extract COL values from each ROW
        const colMatches = rowXml.match(/<COL>([^<]*)<\/COL>/g);
        if (!colMatches || colMatches.length < 13) {
          console.log(`⚠️ Row ${index} has insufficient columns: ${colMatches?.length || 0}`);
          return null;
        }

        // Map columns to fields based on the structure you provided
        const cols = colMatches.map(match => match.replace(/<\/?COL>/g, ''));
        
        // Convert YYYYMMDD format to YYYY-MM-DD format
        const formatDate = (dateStr: string) => {
          if (!dateStr || dateStr.length !== 8) return dateStr;
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          return `${year}-${month}-${day}`;
        };

        return {
          id: cols[0] || '',
          masterId: cols[0] || '',
          alterId: cols[1] || '',
          date: formatDate(cols[2] || ''),
          invoiceNumber: cols[3] || '',
          vchType: cols[4] || '',
          customer: cols[5] || '',
          pinCode: cols[6] || '',
          itemName: cols[7] || '',
          stockGroup: cols[8] || '',
          quantity: parseFloat(cols[9]) || 0,
          rate: parseFloat(cols[10]) || 0,
          amount: parseFloat(cols[11]) || 0,
          profit: parseFloat(cols[12]) || 0,
        };
      }).filter(entry => entry !== null);

      console.log(`✅ Parsed ${entries.length} valid entries`);
      console.log('📊 Sample entry:', entries[0]);
      
      // Data parsed successfully

      return { entries };
    } catch (error) {
      console.error('❌ Error parsing Tally sales data response:', error);
      return { entries: [] };
    }
  }

  // Get incremental voucher data from Tally using lastaltid
  async getIncrementalVoucherDataFromTally(
    tallylocId: number,
    companyName: string,
    guid: string,
    fromDate: string,
    toDate: string,
    lastAlterId: number,
    onProgress?: (current: number, total: number, message: string) => void,
    abortSignal?: AbortSignal
  ): Promise<ApiResponse> {
    try {
      console.log(`🔄 Starting incremental voucher sync from alterid: ${lastAlterId}`);
      console.log(`🔍 INCREMENTAL SYNC - Received dates: fromDate="${fromDate}", toDate="${toDate}"`);
      console.log(`🔍 INCREMENTAL SYNC - Company: ${companyName}, GUID: ${guid}`);
      await voucherDataService.initialize();

      // Calculate date range and chunking strategy
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);

      // Strategy: If this is an incremental sync (we already have data in SQLite),
      // switch to monthly chunking to reduce number of requests.
      // For initial full sync (lastAlterId === 0), keep 5-day chunks.
      const useMonthlyChunks = lastAlterId > 0;

      type Chunk = { start: Date; end: Date };
      const chunks: Chunk[] = [];

      if (useMonthlyChunks) {
        // Build month-wise chunks from startDate to endDate
        const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        // Iterate months, push [first day, last day of month] bounded by range
        while (cursor <= endDate) {
          const chunkStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
          // last day of month: set date 0 of next month
          const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
          const chunkEnd = monthEnd > endDate ? new Date(endDate) : monthEnd;
          // Ensure we don't start before requested startDate
          const boundedStart = chunkStart < startDate ? new Date(startDate) : chunkStart;
          if (boundedStart <= chunkEnd) {
            chunks.push({ start: boundedStart, end: chunkEnd });
          }
          // Move to next month
          cursor.setMonth(cursor.getMonth() + 1);
          cursor.setDate(1);
          // Break if we advanced beyond endDate's month and year
          if (cursor > endDate) break;
        }
        console.log(`📅 Using monthly chunking (incremental). Months: ${chunks.length}`);
      } else {
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        let chunkSize = 5; // default 5 days per chunk for initial full sync
        try {
          const v = await AsyncStorage.getItem('sync_chunk_days');
          if (v && !isNaN(Number(v))) {
            const n = Math.min(31, Math.max(1, Number(v)));
            chunkSize = n;
          }
        } catch {}
        const totalChunks = Math.ceil(totalDays / chunkSize);
        for (let i = 0; i < totalChunks; i++) {
          const chunkStartDate = new Date(startDate);
          chunkStartDate.setDate(startDate.getDate() + (i * chunkSize));
          const chunkEndDate = new Date(chunkStartDate);
          chunkEndDate.setDate(chunkStartDate.getDate() + chunkSize - 1);
          if (chunkEndDate > endDate) chunkEndDate.setTime(endDate.getTime());
          chunks.push({ start: chunkStartDate, end: chunkEndDate });
        }
        console.log(`📅 Using ${chunkSize}-day chunking (initial sync). Chunks: ${chunks.length}`);
      }

      let totalWritten = 0;

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        // Check if request was cancelled
        if (abortSignal?.aborted) {
          console.log('🚫 Request cancelled, stopping chunk processing');
          throw new Error('Request cancelled');
        }

        const chunkStartDate = chunks[chunkIndex].start;
        const chunkEndDate = chunks[chunkIndex].end;

        const chunkStartStr = chunkStartDate.toISOString().split('T')[0].replace(/-/g, '');
        const chunkEndStr = chunkEndDate.toISOString().split('T')[0].replace(/-/g, '');

        console.log(`📊 Chunk ${chunkIndex + 1}/${chunks.length}: ${chunkStartStr} to ${chunkEndStr}`);

        onProgress?.(chunkIndex + 1, chunks.length, `Fetching chunk ${chunkIndex + 1}/${chunks.length}...`);

        try {
          // Check again before making the request
          if (abortSignal?.aborted) {
            console.log('🚫 Request cancelled before fetch, stopping');
            throw new Error('Request cancelled');
          }

          const authToken = this.getAuthToken();
          const response = await fetch(`${this.baseUrl}/api/reports/salesextract`, {
            method: 'POST',
            signal: abortSignal, // Pass the abort signal to fetch
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tallyloc_id: tallylocId,
              company: companyName,
              guid: guid,
              fromdate: chunkStartStr,
              todate: chunkEndStr,
              lastaltid: lastAlterId
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log(`📊 Chunk ${chunkIndex + 1} response received`);

          if (data.vouchers && Array.isArray(data.vouchers)) {
            console.log(`📊 Chunk ${chunkIndex + 1}: ${data.vouchers.length} vouchers received`);

            // Build flat arrays for this chunk only
            const chunkVouchers: any[] = [];
            const chunkSummaries: any[] = [];
            const chunkLedgers: any[] = [];
            const chunkInventories: any[] = [];

            for (const voucher of data.vouchers) {
              chunkVouchers.push(voucher);
              if (voucher.ledgers && Array.isArray(voucher.ledgers)) {
                for (const ledger of voucher.ledgers) {
                  chunkLedgers.push({
                    voucher_id: voucher.mstid,
                    ledger: ledger.ledger,
                    ledgerid: ledger.ledgerid,
                    amt: parseFloat(ledger.amt) || 0,
                    deemd: ledger.deemd,
                    isprty: ledger.isprty,
                    inventry: JSON.stringify(ledger.inventry || [])
                  });
                  if (ledger.inventry && Array.isArray(ledger.inventry)) {
                    for (const item of ledger.inventry) {
                      chunkInventories.push({
                        voucher_id: voucher.mstid,
                        ledger_id: ledger.ledgerid,
                        item: item.item,
                        itemid: item.itemid,
                        uom: item.uom,
                        qty: parseFloat(item.qty) || 0,
                        amt: parseFloat(item.amt) || 0,
                        deemd: item.deemd,
                        group: item.group,
                        groupofgroup: item.groupofgroup,
                        category: item.category
                      });
                    }
                  }
                }
              }
              chunkSummaries.push({
                voucher_id: voucher.mstid,
                alterid: voucher.alterid,
                vchno: voucher.vchno,
                date: voucher.date,
                party: voucher.party,
                amt: parseFloat(voucher.amt) || 0,
                vchtype: voucher.vchtype,
                reservedname: voucher.reservedname,
                issale: voucher.issale,
                pincode: voucher.pincode,
                isoptional: voucher.isoptional,
                iscancelled: voucher.iscancelled
              });
            }

            // Persist this chunk in small batches to keep UI responsive
            const BATCH_SIZE = 500;
            for (let i = 0; i < chunkVouchers.length; i += BATCH_SIZE) {
              if (abortSignal?.aborted) throw new Error('Request cancelled');
              const vSlice = chunkVouchers.slice(i, i + BATCH_SIZE);
              const sSlice = chunkSummaries.filter(s => vSlice.some(v => v.mstid === s.voucher_id));
              const lSlice = chunkLedgers.filter(l => vSlice.some(v => v.mstid === l.voucher_id));
              const invSlice = chunkInventories.filter(inv => vSlice.some(v => v.mstid === inv.voucher_id));
              await voucherDataService.storeVouchers(vSlice, sSlice, lSlice, invSlice, guid, tallylocId);
              totalWritten += vSlice.length;
              console.log(`💾 Stored batch ${i / BATCH_SIZE + 1} of chunk ${chunkIndex + 1}: +${vSlice.length} (total ${totalWritten})`);
              // Yield to event loop to keep UI responsive
              await new Promise(res => setTimeout(res, 0));
            }
          }
        } catch (chunkError) {
          // Handle AbortError gracefully - this is expected when request is cancelled
          if (chunkError instanceof Error && (chunkError.name === 'AbortError' || chunkError.message.includes('Aborted'))) {
            console.log(`🚫 Chunk ${chunkIndex + 1} cancelled, stopping gracefully`);
            throw new Error('Request cancelled');
          } else {
            console.error(`❌ Error in chunk ${chunkIndex + 1}:`, chunkError);
            // Continue with next chunk for other errors
          }
        }
      }

      console.log(`✅ Incremental sync persisted total vouchers: ${totalWritten}`);

      return {
        success: true,
        data: { vouchers: [] },
        message: `Successfully synced ${totalWritten} incremental vouchers`
      };
    } catch (error) {
      // Handle cancellation gracefully
      if (error instanceof Error && (error.message.includes('Request cancelled') || error.name === 'AbortError')) {
        console.log('🚫 Incremental sync cancelled gracefully');
        return {
          success: true,
          data: { vouchers: [] },
          message: 'Sync cancelled'
        };
      }
      
      console.error('❌ Failed to get incremental voucher data from Tally:', error);
      return {
        success: false,
        message: `Failed to get incremental voucher data: ${error}`
      };
    }
  }

  // Get voucher data from Tally with chunking
  async getVoucherDataFromTally(
    tallylocId: string,
    company: string,
    guid: string,
    startDate: Date,
    endDate: Date,
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<ApiResponse> {
    const operationStartTime = Date.now();
    
    try {
      console.log('📊 Starting voucher data extraction with chunking...');
      
      // Calculate total days and chunks (5-day periods)
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      let chunkSize = 5; // default 5 days per chunk
      try {
        const v = await AsyncStorage.getItem('sync_chunk_days');
        if (v && !isNaN(Number(v))) {
          const n = Math.min(31, Math.max(1, Number(v)));
          chunkSize = n;
        }
      } catch {}
      const totalChunks = Math.ceil(totalDays / chunkSize);
      
      console.log(`📅 Date range: ${totalDays} days, ${totalChunks} chunks of ${chunkSize} days each`);
      
      const allVouchers: any[] = [];
      
      // Process data in configurable chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunkStartDate = new Date(startDate);
        chunkStartDate.setDate(startDate.getDate() + (chunkIndex * chunkSize));
        
        const chunkEndDate = new Date(chunkStartDate);
        chunkEndDate.setDate(chunkStartDate.getDate() + chunkSize - 1);
        
        // Don't exceed the original end date
        if (chunkEndDate > endDate) {
          chunkEndDate.setTime(endDate.getTime());
        }
        
        // Format dates for API (YYYYMMDD)
        const formatDateForAPI = (date: Date) => {
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${year}${month}${day}`;
        };
        
        const fromDateStr = formatDateForAPI(chunkStartDate);
        const toDateStr = formatDateForAPI(chunkEndDate);
        
        if (onProgress) {
          onProgress(chunkIndex + 1, totalChunks, `Processing chunk ${chunkIndex + 1}/${totalChunks}: ${fromDateStr} to ${toDateStr}`);
        }
        
        const tallyStartTime = Date.now();
        
        // Make API call for this chunk
        const response = await fetch(`${this.baseUrl}/api/reports/salesextract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            tallyloc_id: parseInt(tallylocId),
            company: company,
            guid: guid,
            fromdate: fromDateStr,
            todate: toDateStr
          })
        });
        
        const tallyEndTime = Date.now();
        const tallyTime = tallyEndTime - tallyStartTime;
        console.log(`📊 Chunk ${chunkIndex + 1} response received (Tally API: ${tallyTime}ms)`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const chunkResponseText = await response.text();
        const parseStartTime = Date.now();
        
        let chunkData;
        try {
          chunkData = JSON.parse(chunkResponseText);
        } catch (parseError) {
          console.error('❌ Failed to parse JSON response:', parseError);
          throw new Error('Invalid JSON response from server');
        }
        
        const parseEndTime = Date.now();
        const parseTime = parseEndTime - parseStartTime;
        console.log(`🔍 Chunk ${chunkIndex + 1} parsing time: ${parseTime}ms`);
        
        if (chunkData && chunkData.vouchers && Array.isArray(chunkData.vouchers)) {
          allVouchers.push(...chunkData.vouchers);
          console.log(`📊 Chunk ${chunkIndex + 1}: ${chunkData.vouchers.length} vouchers added`);
        } else {
          console.log(`📊 Chunk ${chunkIndex + 1}: No vouchers found`);
        }
      }
      
      // Store data in SQLite for offline access
      const sqliteStartTime = Date.now();
      try {
        // Ensure SQLite is initialized before using it
        try {
          await voucherDataService.initialize();
        } catch (initError) {
          console.log('📱 SQLite already initialized or initialization failed:', initError);
        }
        
        // Clear existing data for this date range
        const formatDateForDatabase = (date: Date) => {
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        const startDateStr = formatDateForDatabase(startDate);
        const endDateStr = formatDateForDatabase(endDate);
        await voucherDataService.clearDataForDateRange(startDateStr, endDateStr);
        
        // Insert new data
        await voucherDataService.insertVoucherData(allVouchers);
        
        const sqliteEndTime = Date.now();
        const sqliteTime = sqliteEndTime - sqliteStartTime;
        console.log(`💾 Stored ${allVouchers.length} vouchers in SQLite for offline access (SQLite: ${sqliteTime}ms)`);
      } catch (error) {
        console.error('⚠️ Failed to store data in SQLite:', error);
        // Continue with the response even if SQLite storage fails
      }
      
      const operationEndTime = Date.now();
      const totalTime = operationEndTime - operationStartTime;
      console.log(`⏱️ Total voucher extraction time: ${totalTime}ms`);
      
      return { success: true, data: { vouchers: allVouchers } };
    } catch (error) {
      console.error('❌ Failed to get voucher data from Tally:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get voucher data from Tally'
      };
    }
  }

  // Get voucher data from SQLite (offline)
  async getVoucherDataFromSQLite(startDate: Date, endDate: Date): Promise<ApiResponse> {
    try {
      // Ensure SQLite is initialized before using it
      try {
        await voucherDataService.initialize();
      } catch (initError) {
        console.log('📱 SQLite already initialized or initialization failed:', initError);
      }
      
      // Format dates for database query (use YYYY-MM-DD format to match stored data)
      const formatDateForDatabase = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startDateStr = formatDateForDatabase(startDate);
      const endDateStr = formatDateForDatabase(endDate);
      
      console.log(`📱 Loading voucher data from SQLite for offline access...`);
      console.log(`📱 Date range: ${startDateStr} to ${endDateStr}`);
      
      // Check if data exists for this date range
      const hasData = await voucherDataService.hasDataForDateRange(startDateStr, endDateStr);
      console.log(`📱 Has data for date range: ${hasData}`);
      
      if (!hasData) {
        console.log(`📱 No offline data found for ${startDateStr} to ${endDateStr}`);
        return {
          success: false,
          message: 'No offline data available for this date range'
        };
      }
      
      // Get data from SQLite
      const vouchers = await voucherDataService.getVouchersByDateRange(startDateStr, endDateStr);
      
      console.log(`📱 Retrieved ${vouchers.length} vouchers from SQLite`);
      
      return {
        success: true,
        data: { vouchers },
        message: 'Data loaded from offline storage'
      };
    } catch (error) {
      console.error('❌ Failed to load data from SQLite:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to load offline data'
      };
    }
  }
  // Get companies with offline-first approach
  async getCompaniesOfflineFirst(): Promise<ApiResponse> {
    try {
      console.log('🔄 getCompaniesOfflineFirst called - STARTING OFFLINE-FIRST APPROACH');
      
      // Step 1: Try to load companies from SQLite first (offline data)
      let offlineCompanies: any[] = [];
      try {
        // Ensure SQLite is initialized with better error handling
        try {
          await companyDataService.initialize();
          console.log('✅ CompanyDataService initialized successfully');
        } catch (initError) {
          console.log('📱 CompanyDataService initialization failed:', initError);
          // Continue without offline data - will fall back to API only
        }

        // Try to load companies from SQLite
        try {
          offlineCompanies = await companyDataService.getCompanies();
          console.log('📱 Retrieved companies from SQLite:', offlineCompanies.length);
          console.log('📱 Offline companies details:', offlineCompanies.map(c => ({ company: c.company, guid: c.guid, status: c.status, tallyloc_id: c.tallyloc_id })));
        } catch (sqliteError) {
          console.log('📱 Failed to load companies from SQLite:', sqliteError);
          // Continue with empty offline companies
        }
      } catch (serviceError) {
        console.log('📱 Failed to access CompanyDataService:', serviceError);
        // Continue without offline data
      }
      
      // Step 2: Make API call to get current online companies
      console.log('🌐 Making API call to get current online companies...');
      const apiResponse = await this.getUserConnections();
      
      if (!apiResponse.success || !apiResponse.data) {
        console.log('🌐 API call failed, returning offline companies only');
        // Return offline companies if API fails
        const offlineResponse = this.convertOfflineCompaniesToResponse(offlineCompanies);
        return {
          success: true,
          message: 'Using offline data only',
          data: offlineResponse
        };
      }
      
      const allApiCompanies = [
        ...(apiResponse.data.createdByMe || []),
        ...(apiResponse.data.sharedWithMe || [])
      ];
      
      console.log('🌐 API returned companies:', allApiCompanies.length);
      
      // Step 3: Update offline companies with online status
      if (offlineCompanies.length > 0) {
        try {
          // Use all companies from API for status updates, but filter for new company additions
          const onlineCompanies = allApiCompanies;
          const validGuidCompanies = allApiCompanies.filter(company => 
            company.guid && company.guid.trim() !== ''
          );
          
          console.log('📱 Processing offline companies for status updates...');
          console.log('📱 Initial offline companies:', offlineCompanies.map(c => ({ company: c.company, guid: c.guid, status: c.status })));
          
          for (const offlineCompany of offlineCompanies) {
            // Check if this specific company is online
            let isOnline = false;
            
            // First try to match by GUID (preferred method)
            if (offlineCompany.guid && offlineCompany.guid.trim() !== '') {
              isOnline = onlineCompanies.some(onlineCompany => 
                onlineCompany.guid && onlineCompany.guid.trim() !== '' && 
                onlineCompany.guid === offlineCompany.guid
              );
            }
            
            // If no GUID match and offline company has no GUID, try tallyloc_id match
            if (!isOnline && (!offlineCompany.guid || offlineCompany.guid.trim() === '')) {
              isOnline = onlineCompanies.some(onlineCompany => 
                (!onlineCompany.guid || onlineCompany.guid.trim() === '') &&
                onlineCompany.tallyloc_id === offlineCompany.tallyloc_id
              );
            }
            
            console.log(`📱 Company ${offlineCompany.company || offlineCompany.conn_name || ''}: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
            
            if (isOnline) {
              const matchingOnlineCompany = onlineCompanies.find(onlineCompany => 
                (offlineCompany.guid && onlineCompany.guid && onlineCompany.guid === offlineCompany.guid) ||
                ((!offlineCompany.guid || offlineCompany.guid.trim() === '') && 
                 (!onlineCompany.guid || onlineCompany.guid.trim() === '') &&
                 onlineCompany.tallyloc_id === offlineCompany.tallyloc_id)
              );
              
              if (matchingOnlineCompany) {
                await companyDataService.updateCompanyData(offlineCompany.guid || offlineCompany.tallyloc_id.toString(), matchingOnlineCompany);
                console.log(`📱 Updated ${offlineCompany.company || offlineCompany.conn_name || ''} with fresh data including booksfrom: ${matchingOnlineCompany.booksfrom}`);
              } else {
                await companyDataService.updateCompanyStatus(offlineCompany.guid || offlineCompany.tallyloc_id.toString(), 'online');
                console.log(`📱 Updated ${offlineCompany.company || offlineCompany.conn_name || ''} to online (no matching data found)`);
              }
            } else {
              await companyDataService.updateCompanyStatus(offlineCompany.guid || offlineCompany.tallyloc_id.toString(), 'offline');
              console.log(`📱 Updated ${offlineCompany.company || offlineCompany.conn_name || ''} to offline`);
            }
          }
          
          // Step 4: Add new companies from API that aren't in SQLite (only companies with valid GUIDs)
          const newCompanies = validGuidCompanies.filter(onlineCompany => 
            !offlineCompanies.some(offlineCompany => 
              offlineCompany.guid === onlineCompany.guid
            )
          );
          
          console.log('📱 New companies to add:', newCompanies.length);
          
          if (newCompanies.length > 0) {
            await companyDataService.storeCompanies(newCompanies);
            console.log(`📱 Added ${newCompanies.length} new companies to offline storage`);
          }
          
          // Step 5: Reload companies from SQLite to get updated statuses
          const updatedOfflineCompanies = await companyDataService.getCompanies();
          console.log('📱 Final companies after status update:', updatedOfflineCompanies.length);
          console.log('📱 Final companies details:', updatedOfflineCompanies.map(c => ({ company: c.company, guid: c.guid, status: c.status })));
          
          const finalResponse = this.convertOfflineCompaniesToResponse(updatedOfflineCompanies);
          return {
            success: true,
            message: 'Companies loaded with offline-first approach',
            data: finalResponse
          };
          
        } catch (updateError) {
          console.log('📱 Failed to update company statuses:', updateError);
          // Fall back to API response
        }
      }
      
      // If no offline companies or update failed, return API response
      console.log('📱 No offline companies or update failed, returning API response');
      return {
        success: true,
        message: 'Companies loaded from API',
        data: apiResponse.data
      };
      
    } catch (error) {
      console.error('❌ Error in getCompaniesOfflineFirst:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to load companies'
      };
    }
  }

  private convertOfflineCompaniesToResponse(companies: any[]) {
    try {
      const mapped = (companies || []).map(c => ({
        tallyloc_id: c.tallyloc_id,
        company: c.company || c.company_name || c.conn_name || '',
        conn_name: c.conn_name || '',
        guid: c.guid || '',
        shared_email: c.shared_email || 'Own',
        access_type: c.access_type || 'read',
        status: c.status || 'offline',
        booksfrom: c.booksfrom || ''
      }));
      // Return in the same shape used by the UI loader
      return { createdByMe: mapped, sharedWithMe: [] };
    } catch (e) {
      console.log('📱 convertOfflineCompaniesToResponse failed, returning empty lists');
      return { createdByMe: [], sharedWithMe: [] };
    }
  }

  // (Removed orphaned duplicate logic that caused build-time syntax error)

  // Store a company when it's loaded/selected
  async storeCompanyOnLoad(company: any): Promise<void> {
    console.log('🚀 storeCompanyOnLoad method called!');
    try {
      console.log('📊 Storing company on load:', company.company || company.company_name || 'Unknown Company');
      console.log('📊 Company details:', {
        company: company.company,
        guid: company.guid,
        tallyloc_id: company.tallyloc_id,
        conn_name: company.conn_name
      });
      console.log('📊 Full company object:', JSON.stringify(company, null, 2));
      
      // Store companies even without GUIDs for offline access
      // For offline companies, GUID might be empty but we still need to store them
      if (!company.guid || company.guid.trim() === '') {
        console.log('📱 Storing company without GUID (for offline access):', company.company || company.company_name || company.conn_name);
        // Continue to store even without GUID
      }
      // Ensure SQLite is initialized
      try {
        await companyDataService.initialize();
      } catch (initError) {
        console.log('📱 CompanyDataService already initialized or initialization failed:', initError);
      }
      
      // Store the company
      await companyDataService.storeCompany(company);
      console.log('✅ Company stored successfully for offline access');
      
    } catch (error) {
      console.error('❌ Error storing company on load:', error);
      // Don't throw error - this shouldn't block the user
    }
  }

  // Get companies from SQLite only (offline)
  async getCompaniesFromSQLite(): Promise<ApiResponse> {
    try {
      // Ensure SQLite is initialized
      try {
        await companyDataService.initialize();
      } catch (initError) {
        console.log('📱 CompanyDataService already initialized or initialization failed:', initError);
      }

      const companies = await companyDataService.getCompanies();
      
      if (companies.length === 0) {
        return {
          success: false,
          message: 'No offline companies data available'
        };
      }

      return {
        success: true,
        data: { companies },
        message: 'Companies loaded from offline storage'
      };
    } catch (error) {
      console.error('❌ Failed to get companies from SQLite:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get companies from offline storage'
      };
    }
  }
}

export const apiService = new ApiService();
