import { useRoles } from '../context/RolesContext';

export interface BackendPermissions {
  showPayTerms: boolean;
  showDelvTerms: boolean;
  showRateAmtColumn: boolean;
  editRate: boolean;
  showDiscColumn: boolean;
  editDiscount: boolean;
  // Additional permissions from the API
  saveOptional: boolean;
  showClsStckColumn: boolean;
  showClsStckYesno: boolean;
  showGodownBrkup: boolean;
  showMultiCoBrkup: boolean;
  showItemDesc: boolean;
  showItemsHasQty: boolean;
  defVchtype: boolean;
  allowVchtype: boolean;
  defQty: boolean;
  showBatches: boolean;
  showPricelvl: boolean;
  defOrderDueDays: boolean;
  showOrdDueDate: boolean;
  showOrderShare: boolean;
  showCreditDaysLimit: boolean;
  ctrlCreditDaysLimit: boolean;
}

export interface BackendPermissionValues {
  defVchtypeValue: string;
  defQtyValue: number;
  defOrderDueDaysValue: number;
}

export const useBackendPermissions = (): BackendPermissions => {
  const { currentCompanyRoles } = useRoles();

  // Default permissions (all false if no roles loaded)
  const defaultPermissions: BackendPermissions = {
    showPayTerms: false,
    showDelvTerms: false,
    showRateAmtColumn: false,
    editRate: false,
    showDiscColumn: false,
    editDiscount: false,
    saveOptional: false,
    showClsStckColumn: false,
    showClsStckYesno: false,
    showGodownBrkup: false,
    showMultiCoBrkup: false,
    showItemDesc: false,
    showItemsHasQty: false,
    defVchtype: false,
    allowVchtype: false,
    defQty: false,
    showBatches: false,
    showPricelvl: false,
    defOrderDueDays: false,
    showOrdDueDate: false,
    showOrderShare: false,
    showCreditDaysLimit: false,
    ctrlCreditDaysLimit: false,
  };

  if (!currentCompanyRoles?.user_roles?.length) {
    return defaultPermissions;
  }

  const permissions: BackendPermissions = { ...defaultPermissions };

  // Process each role to set permissions
  currentCompanyRoles.user_roles.forEach((role: any) => {
    if (role.is_active) {
      switch (role.role_id) {
        case 'show_payterms':
          permissions.showPayTerms = true;
          break;
        case 'show_delvterms':
          permissions.showDelvTerms = true;
          break;
        case 'show_rateamt_Column':
          permissions.showRateAmtColumn = true;
          break;
        case 'edit_rate':
          permissions.editRate = true;
          break;
        case 'show_disc_Column':
          permissions.showDiscColumn = true;
          break;
        case 'edit_discount':
          permissions.editDiscount = true;
          break;
        case 'save_optional':
          permissions.saveOptional = true;
          break;
        case 'show_ClsStck_Column':
          permissions.showClsStckColumn = true;
          break;
        case 'show_ClsStck_yesno':
          permissions.showClsStckYesno = true;
          break;
        case 'show_godownbrkup':
          permissions.showGodownBrkup = true;
          break;
        case 'show_multicobrkup':
          permissions.showMultiCoBrkup = true;
          break;
        case 'show_itemdesc':
          permissions.showItemDesc = true;
          break;
        case 'show_itemshasqty':
          permissions.showItemsHasQty = true;
          break;
        case 'def_vchtype':
          permissions.defVchtype = true;
          break;
        case 'allow_vchtype':
          permissions.allowVchtype = true;
          break;
        case 'def_qty':
          permissions.defQty = true;
          break;
        case 'show_batches':
          permissions.showBatches = true;
          break;
        case 'show_pricelvl':
          permissions.showPricelvl = true;
          break;
        case 'def_orderduedays':
          permissions.defOrderDueDays = true;
          break;
        case 'show_ordduedate':
          permissions.showOrdDueDate = true;
          break;
        case 'show_ordershare':
          permissions.showOrderShare = true;
          break;
        case 'show_creditdayslimit':
          permissions.showCreditDaysLimit = true;
          break;
        case 'ctrl_creditdayslimit':
          permissions.ctrlCreditDaysLimit = true;
          break;
      }
    }
  });

  return permissions;
};

export const useBackendPermissionValues = (): BackendPermissionValues => {
  const { currentCompanyRoles } = useRoles();

  // Default values
  const defaultValues: BackendPermissionValues = {
    defVchtypeValue: '',
    defQtyValue: 0,
    defOrderDueDaysValue: 0,
  };

  if (!currentCompanyRoles?.user_roles?.length) {
    return defaultValues;
  }

  const values: BackendPermissionValues = { ...defaultValues };

  // Process each role to extract permission values
  currentCompanyRoles.user_roles.forEach((role: any) => {
    if (role.is_active) {
      switch (role.role_id) {
        case 'def_vchtype':
          values.defVchtypeValue = role.permission_value || '';
          break;
        case 'def_qty':
          values.defQtyValue = parseInt(role.permission_value) || 0;
          break;
        case 'def_orderduedays':
          values.defOrderDueDaysValue = parseInt(role.permission_value) || 0;
          break;
      }
    }
  });

  return values;
};