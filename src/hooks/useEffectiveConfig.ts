import { useConfiguration } from '../context/ConfigurationContext';
import { OrderEntryPermissions } from '../services/backendConfigService';
import { useBackendPermissions, useBackendPermissionValues } from './useBackendPermissions';

export interface EffectiveOrderConfig {
  // Core configuration
  voucherTypeName: string;
  defaultVoucherTypeId: string;
  allowVoucherTypeSelection: boolean;
  defaultOrderDueDays: number;
  showOrderDueDate: boolean;
  usePriceLevels: boolean;
  showOrderPdfShareOption: boolean;
  showCustomerAddresses: boolean;
  enableBatchTracking: boolean;
  saveAsOptional: boolean;
  showCreditDaysLimit: boolean;
  defaultQuantity: number;
  showAvailableStock: boolean;
  showStockAsYesNo: boolean;
  showDiscount: boolean;
  
  // Razorpay Payment Configuration
  enableRazorpayPayment: boolean;
  promptForOnlinePayment: boolean;
  razorpayKeyId: string;
  razorpayCompanyName: string;
  razorpayDescription: string;
  razorpayLedgerName: string;
  
  // Backend-driven configuration (when useBackendConfig is true)
  showPayTerms: boolean;
  showDelvTerms: boolean;
  showRateAmtColumn: boolean;
  editRate: boolean;
  showDiscColumn: boolean;
  editDiscount: boolean;
  showClsStckColumn: boolean;
  showGodownBrkup: boolean;
  showMultiCoBrkup: boolean;
  
  // Configuration source info
  isUsingBackendConfig: boolean;
  backendConfigLoaded: boolean;
}

export const useEffectiveConfig = (): EffectiveOrderConfig => {
  const { orderConfig, isBackendConfigLoaded, rolesData } = useConfiguration();
  const backendPermissions = useBackendPermissions();
  const backendPermissionValues = useBackendPermissionValues();
  
  // Determine if we should use backend configuration (check if roles data is loaded)
  const isUsingBackendConfig = !!rolesData;
  

  return {
    // Core configuration
    voucherTypeName: isUsingBackendConfig ? backendPermissionValues.defVchtypeValue : orderConfig.voucherTypeName,
    defaultVoucherTypeId: orderConfig.defaultVoucherTypeId,
    allowVoucherTypeSelection: isUsingBackendConfig ? backendPermissions.allowVchtype : orderConfig.allowVoucherTypeSelection,
    defaultOrderDueDays: isUsingBackendConfig ? backendPermissionValues.defOrderDueDaysValue : orderConfig.defaultOrderDueDays,
    showOrderDueDate: isUsingBackendConfig ? backendPermissions.showOrdDueDate : orderConfig.showOrderDueDate,
    usePriceLevels: isUsingBackendConfig ? backendPermissions.showPricelvl : orderConfig.usePriceLevels,
    showOrderPdfShareOption: orderConfig.showOrderPdfShareOption,
    showCustomerAddresses: orderConfig.showCustomerAddresses,
    enableBatchTracking: isUsingBackendConfig ? backendPermissions.showBatches : orderConfig.enableBatchTracking,
    saveAsOptional: isUsingBackendConfig ? backendPermissions.saveOptional : orderConfig.saveAsOptional,
    showCreditDaysLimit: backendPermissions.showCreditDaysLimit, // Always use backend permission (no local config equivalent)
    defaultQuantity: isUsingBackendConfig ? backendPermissionValues.defQtyValue : orderConfig.defaultQuantity,
    showAvailableStock: orderConfig.showAvailableStock,
    showStockAsYesNo: orderConfig.showStockAsYesNo,
    showDiscount: orderConfig.showDiscount,
    
    // Razorpay Payment Configuration (always from local config)
    enableRazorpayPayment: orderConfig.enableRazorpayPayment,
    promptForOnlinePayment: orderConfig.promptForOnlinePayment,
    razorpayKeyId: orderConfig.razorpayKeyId,
    razorpayCompanyName: orderConfig.razorpayCompanyName,
    razorpayDescription: orderConfig.razorpayDescription,
    razorpayLedgerName: orderConfig.razorpayLedgerName,
    
    // Backend-driven configuration
    showPayTerms: isUsingBackendConfig ? backendPermissions.showPayTerms : false,
    showDelvTerms: isUsingBackendConfig ? backendPermissions.showDelvTerms : false,
    showRateAmtColumn: isUsingBackendConfig ? backendPermissions.showRateAmtColumn : true,
    editRate: isUsingBackendConfig ? backendPermissions.editRate : true,
    showDiscColumn: isUsingBackendConfig ? backendPermissions.showDiscColumn : true,
    editDiscount: isUsingBackendConfig ? backendPermissions.editDiscount : true,
    showClsStckColumn: isUsingBackendConfig ? backendPermissions.showClsStckColumn : false,
    showGodownBrkup: isUsingBackendConfig ? backendPermissions.showGodownBrkup : false,
    showMultiCoBrkup: isUsingBackendConfig ? backendPermissions.showMultiCoBrkup : false,
    
    // Configuration source info
    isUsingBackendConfig,
    backendConfigLoaded: isBackendConfigLoaded,
  };
};
