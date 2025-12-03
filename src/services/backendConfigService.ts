import { API_CONFIG } from '../config/api';

export interface BackendPermission {
  permission_key: string;
  display_name: string;
  sort_order: number;
  granted: boolean;
}

export interface BackendModule {
  module_name: string;
  module_display_name: string;
  module_sort_order: number;
  is_enabled: number;
  permissions: BackendPermission[];
}

export interface BackendConfigResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      email: string;
    };
    tally_location: {
      id: string;
      name: string;
      is_owner: boolean;
    };
    company: {
      co_guid: string;
    };
    access_summary: {
      is_owner: boolean;
      total_modules: number;
      total_permissions: number;
    };
    modules: BackendModule[];
  };
}

export interface OrderEntryPermissions {
  showPayTerms: boolean;
  showDelvTerms: boolean;
  showRateAmtColumn: boolean;
  editRate: boolean;
  showDiscColumn: boolean;
  editDiscount: boolean;
  showClsStckColumn: boolean;
  showGodownBrkup: boolean;
  showMultiCoBrkup: boolean;
  saveOptional: boolean;
}

class BackendConfigService {
  private configCache: BackendConfigResponse | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async fetchUserAccess(tallylocId: string, coGuid: string, authToken: string): Promise<BackendConfigResponse> {
    // Check cache first
    const now = Date.now();
    if (this.configCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.configCache;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/access-control/user-access?tallylocId=${tallylocId}&co_guid=${coGuid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BackendConfigResponse = await response.json();
      
      // Cache the response
      this.configCache = data;
      this.cacheTimestamp = now;
      
      return data;
    } catch (error) {
      console.error('Error fetching backend configuration:', error);
      throw error;
    }
  }

  getOrderEntryPermissions(config: BackendConfigResponse): OrderEntryPermissions {
    const placeOrderModule = config.data.modules.find(module => module.module_name === 'place_order');
    
    if (!placeOrderModule) {
      // Return default permissions if module not found
      return {
        showPayTerms: false,
        showDelvTerms: false,
        showRateAmtColumn: false,
        editRate: false,
        showDiscColumn: false,
        editDiscount: false,
        showClsStckColumn: false,
        showGodownBrkup: false,
        showMultiCoBrkup: false,
        saveOptional: false,
      };
    }

    const permissions = placeOrderModule.permissions;
    
    const saveOptionalValue = this.getPermissionValue(permissions, 'save_optional');

    return {
      showPayTerms: this.getPermissionValue(permissions, 'show_payterms'),
      showDelvTerms: this.getPermissionValue(permissions, 'show_delvterms'),
      showRateAmtColumn: this.getPermissionValue(permissions, 'show_rateamt_Column'),
      editRate: this.getPermissionValue(permissions, 'edit_rate'),
      showDiscColumn: this.getPermissionValue(permissions, 'show_disc_Column'),
      editDiscount: this.getPermissionValue(permissions, 'edit_discount'),
      showClsStckColumn: this.getPermissionValue(permissions, 'show_ClsStck_Column'),
      showGodownBrkup: this.getPermissionValue(permissions, 'show_godownbrkup'),
      showMultiCoBrkup: this.getPermissionValue(permissions, 'show_multicobrkup'),
      saveOptional: saveOptionalValue,
    };
  }

  private getPermissionValue(permissions: BackendPermission[], key: string): boolean {
    const permission = permissions.find(p => p.permission_key === key);
    return permission ? permission.granted : false;
  }

  // Check if a module is enabled
  hasModule(config: BackendConfigResponse | null, moduleName: string): boolean {
    if (!config) return false;
    const module = config.data.modules.find(m => m.module_name === moduleName);
    return module ? module.is_enabled === 1 : false;
  }

  // Get all enabled modules
  getEnabledModules(config: BackendConfigResponse | null): string[] {
    if (!config) return [];
    return config.data.modules
      .filter(m => m.is_enabled === 1)
      .map(m => m.module_name);
  }

  clearCache(): void {
    this.configCache = null;
    this.cacheTimestamp = 0;
  }
}

export const backendConfigService = new BackendConfigService();
