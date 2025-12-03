import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiService } from './api';

// Task name for background fetch
const BACKGROUND_FETCH_TASK = 'background-fetch-vouchers';

// Storage keys
const STORAGE_KEYS = {
  LAST_CHECK_MASTER_ID: 'last_check_master_id',
  BACKGROUND_CHECK_ENABLED: 'background_check_enabled',
  CHECK_FREQUENCY: 'check_frequency_minutes',
  LAST_CHECK_TIME: 'last_check_time',
};

// Default configuration
const DEFAULT_CONFIG = {
  enabled: false,
  frequencyMinutes: 5,
  lastMasterId: 0,
};

// Configure notification behavior (only for local notifications)
// Note: Expo Go doesn't support remote push notifications in SDK 53+
// This is fine - we only use local notifications for background checks
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface BackgroundCheckConfig {
  enabled: boolean;
  frequencyMinutes: number;
  lastMasterId: number;
  lastCheckTime?: Date;
}

export class BackgroundCheckService {
  private static instance: BackgroundCheckService;
  private isInitialized = false;
  private currentConfig: BackgroundCheckConfig = DEFAULT_CONFIG;

  static getInstance(): BackgroundCheckService {
    if (!BackgroundCheckService.instance) {
      BackgroundCheckService.instance = new BackgroundCheckService();
    }
    return BackgroundCheckService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load saved configuration
      await this.loadConfiguration();

      // Register background task
      this.registerBackgroundTask();

      // Request notification permissions
      await this.requestNotificationPermissions();

      this.isInitialized = true;
      console.log('✅ [BackgroundService] Initialized successfully');
    } catch (error) {
      console.error('❌ [BackgroundService] Initialization failed:', error);
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const [enabled, frequency, lastMasterId, lastCheckTime] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.BACKGROUND_CHECK_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.CHECK_FREQUENCY),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_CHECK_MASTER_ID),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_CHECK_TIME),
      ]);

      this.currentConfig = {
        enabled: enabled === 'true',
        frequencyMinutes: frequency ? parseInt(frequency) : DEFAULT_CONFIG.frequencyMinutes,
        lastMasterId: lastMasterId ? parseInt(lastMasterId) : DEFAULT_CONFIG.lastMasterId,
        lastCheckTime: lastCheckTime ? new Date(lastCheckTime) : undefined,
      };

      console.log('📋 [BackgroundService] Configuration loaded:', this.currentConfig);
    } catch (error) {
      console.error('❌ [BackgroundService] Failed to load configuration:', error);
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.BACKGROUND_CHECK_ENABLED, this.currentConfig.enabled.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.CHECK_FREQUENCY, this.currentConfig.frequencyMinutes.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_CHECK_MASTER_ID, this.currentConfig.lastMasterId.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_CHECK_TIME, this.currentConfig.lastCheckTime?.toISOString() || ''),
      ]);
      console.log('💾 [BackgroundService] Configuration saved');
    } catch (error) {
      console.error('❌ [BackgroundService] Failed to save configuration:', error);
    }
  }

  private async requestNotificationPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ [BackgroundService] Notification permission not granted');
        return false;
      }

      console.log('✅ [BackgroundService] Notification permissions granted');
      return true;
    } catch (error) {
      console.error('❌ [BackgroundService] Failed to request notification permissions:', error);
      return false;
    }
  }

  private registerBackgroundTask(): void {
    TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
      try {
        console.log('🔄 [BackgroundService] Background task started');
        
        const result = await this.checkForNewVouchers();
        
        if (result.newVouchersFound > 0) {
          await this.showNotification(result.newVouchersFound);
        }

        console.log(`✅ [BackgroundService] Background task completed. New vouchers: ${result.newVouchersFound}`);
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('❌ [BackgroundService] Background task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  async startBackgroundChecking(): Promise<void> {
    if (!this.currentConfig.enabled) {
      console.log('⏸️ [BackgroundService] Background checking is disabled');
      return;
    }

    try {
      const status = await BackgroundFetch.getStatusAsync();
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        console.warn('⚠️ [BackgroundService] Background fetch is denied by system');
        return;
      }

      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
        console.warn('⚠️ [BackgroundService] Background fetch is restricted by system');
        return;
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: this.currentConfig.frequencyMinutes * 60, // Convert minutes to seconds
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log(`🚀 [BackgroundService] Background checking started (${this.currentConfig.frequencyMinutes} min intervals)`);
    } catch (error) {
      console.error('❌ [BackgroundService] Failed to start background checking:', error);
    }
  }

  async stopBackgroundChecking(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('⏹️ [BackgroundService] Background checking stopped');
    } catch (error) {
      console.error('❌ [BackgroundService] Failed to stop background checking:', error);
    }
  }

  async updateConfiguration(config: Partial<BackgroundCheckConfig>, companyData?: any): Promise<void> {
    const oldConfig = { ...this.currentConfig };
    this.currentConfig = { ...this.currentConfig, ...config };

    try {
      await this.saveConfiguration();

      // Save company data for background tasks if provided
      if (companyData) {
        await AsyncStorage.setItem('bg_company_data', JSON.stringify(companyData));
        console.log('💾 [BackgroundService] Saved company data for background tasks');
      }

      // Restart background checking if configuration changed
      if (oldConfig.enabled !== this.currentConfig.enabled || 
          oldConfig.frequencyMinutes !== this.currentConfig.frequencyMinutes) {
        
        if (this.currentConfig.enabled) {
          await this.startBackgroundChecking();
        } else {
          await this.stopBackgroundChecking();
        }
      }

      console.log('✅ [BackgroundService] Configuration updated:', this.currentConfig);
    } catch (error) {
      console.error('❌ [BackgroundService] Failed to update configuration:', error);
    }
  }

  getConfiguration(): BackgroundCheckConfig {
    return { ...this.currentConfig };
  }

  private async checkForNewVouchers(companyData?: any, currentHighestMasterId?: number): Promise<{ newVouchersFound: number; latestMasterId: number }> {
    try {
      // Get current user and company data
      let company = companyData;
      
      if (!company) {
        company = await this.getCompanyData();
      }

      if (!company) {
        console.warn('⚠️ [BackgroundService] Company data not available');
        return { newVouchersFound: 0, latestMasterId: this.currentConfig.lastMasterId };
      }

      // Use the current highest MasterID from the list, or fall back to stored config
      const lastMasterId = currentHighestMasterId || this.currentConfig.lastMasterId;

      // Create XML request to check for new vouchers
      const xmlRequest = this.createVoucherCheckXML(lastMasterId);

      console.log('🔍 [BackgroundService] Checking for new vouchers since MasterID:', lastMasterId);
      console.log('📋 [BackgroundService] XML Request preview:', xmlRequest.substring(0, 500));

      // Call API with custom XML that filters by MasterID
      const response = await apiService.getOptionalVouchersWithXML(
        company.tallylocId || company.tallyloc_id,
        company.company,
        company.GUID || company.guid,
        xmlRequest
      );

      if (!response.success || !response.data) {
        console.warn('⚠️ [BackgroundService] Failed to fetch vouchers:', response.message);
        return { newVouchersFound: 0, latestMasterId: lastMasterId };
      }

      // Parse the response to get all vouchers
      const vouchers = this.parseVoucherXML(response.data);
      
      // Filter for NEW vouchers (MasterID > lastMasterId)
      const newVouchers = vouchers.filter(v => v.MasterID > lastMasterId);
      
      // Get the highest MasterID from all vouchers
      const latestMasterId = vouchers.length > 0 ? Math.max(...vouchers.map(v => v.MasterID)) : lastMasterId;

      // Update last check time and master ID only if we found vouchers
      if (vouchers.length > 0) {
        this.currentConfig.lastCheckTime = new Date();
        this.currentConfig.lastMasterId = latestMasterId;
        await this.saveConfiguration();
      }

      console.log(`📊 [BackgroundService] Check complete:`, {
        totalVouchers: vouchers.length,
        newVouchers: newVouchers.length,
        previousHighest: lastMasterId,
        currentHighest: latestMasterId,
      });

      return { newVouchersFound: newVouchers.length, latestMasterId };
    } catch (error) {
      console.error('❌ [BackgroundService] Error checking for new vouchers:', error);
      return { newVouchersFound: 0, latestMasterId: this.currentConfig.lastMasterId };
    }
  }

  private createVoucherCheckXML(lastMasterId: number): string {
    const today = new Date();
    
    // Format date as DD-Mmm-YY (e.g., 16-Oct-25) to match Tally's format
    const formatTallyDate = (date: Date): string => {
      const day = date.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear().toString().slice(-2);
      return `${day}-${month}-${year}`;
    };
    
    const todayStr = formatTallyDate(today);

    return `<ENVELOPE>
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
            <Set>SVFromdate : "1-01-2025"</Set>
            <Set>SVTodate : "${todayStr}"</Set>
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
          $Amount as Amount ,
          $Narration as Narration
        from ITC_VchColl where $IsOptional AND $MasterID>${lastMasterId}
      </SQLREQUEST>
      
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
  }

  private parseVoucherXML(xmlData: string): any[] {
    try {
      const vouchers: any[] = [];
      
      // Parse ODBC ResultSet format: <ROW><COL>MasterID</COL><COL>Date</COL>...</ROW>
      const rowRegex = /<ROW>([\s\S]*?)<\/ROW>/gi;
      let rowMatch;
      
      while ((rowMatch = rowRegex.exec(xmlData)) !== null) {
        const rowXml = rowMatch[1];
        
        // Extract COL values in order: MasterID, Date, VoucherNumber, VoucherType, Customer, Amount, Narration
        const colValues: string[] = [];
        const colRegex = /<COL>([\s\S]*?)<\/COL>/gi;
        let colMatch;
        
        while ((colMatch = colRegex.exec(rowXml)) !== null) {
          colValues.push(colMatch[1].trim());
        }
        
        // First COL is MasterID
        if (colValues.length > 0 && colValues[0]) {
          const masterId = parseInt(colValues[0]);
          if (!isNaN(masterId)) {
            vouchers.push({
              MasterID: masterId,
              Date: colValues[1] || '',
              VoucherNumber: colValues[2] || '',
              VoucherType: colValues[3] || '',
              Customer: colValues[4] || '',
              Amount: parseFloat(colValues[5]) || 0,
              Narration: colValues[6] || '',
            });
          }
        }
      }

      console.log(`📊 [BackgroundService] Parsed ${vouchers.length} vouchers from XML`);
      if (vouchers.length > 0) {
        console.log('📋 [BackgroundService] Sample voucher:', vouchers[0]);
      }

      return vouchers;
    } catch (error) {
      console.error('❌ [BackgroundService] Error parsing voucher XML:', error);
      return [];
    }
  }

  private async showNotification(newVoucherCount: number): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "New Vouchers Available",
          body: `${newVoucherCount} new voucher(s) require authorization`,
          data: { 
            screen: 'authorize-vouchers',
            count: newVoucherCount 
          },
        },
        trigger: null, // Show immediately
      });

      console.log(`🔔 [BackgroundService] Notification sent for ${newVoucherCount} new vouchers`);
    } catch (error) {
      console.error('❌ [BackgroundService] Failed to show notification:', error);
    }
  }

  private async getUserData(): Promise<any> {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      return userDataStr ? JSON.parse(userDataStr) : null;
    } catch (error) {
      console.error('❌ [BackgroundService] Failed to get user data:', error);
      return null;
    }
  }

  private async getCompanyData(): Promise<any> {
    try {
      // Try multiple storage keys that might contain company data
      const keys = [
        'selectedCompany',
        'selected_company', 
        'currentCompany',
        'bg_company_data', // New key we'll use specifically for background tasks
      ];
      
      for (const key of keys) {
        const companyDataStr = await AsyncStorage.getItem(key);
        if (companyDataStr) {
          try {
            const data = JSON.parse(companyDataStr);
            if (data && (data.company || data.COMPANY)) {
              console.log(`✅ [BackgroundService] Found company data in key: ${key}`);
              return data;
            }
          } catch (e) {
            console.warn(`⚠️ [BackgroundService] Failed to parse data from ${key}`);
          }
        }
      }
      
      console.warn('⚠️ [BackgroundService] No company data found in any storage key');
      return null;
    } catch (error) {
      console.error('❌ [BackgroundService] Failed to get company data:', error);
      return null;
    }
  }

  // Manual check method for testing
  async manualCheck(companyData?: any, currentHighestMasterId?: number): Promise<{ newVouchersFound: number; latestMasterId: number }> {
    console.log('🔍 [BackgroundService] Manual check triggered', {
      hasCompanyData: !!companyData,
      currentHighestMasterId,
    });
    return await this.checkForNewVouchers(companyData, currentHighestMasterId);
  }
}

// Export singleton instance
export const backgroundCheckService = BackgroundCheckService.getInstance();
