import { useRoles } from '../context/RolesContext';

export const useRolesPermissions = () => {
  const { currentCompanyRoles, hasPermission, hasAnyPermission } = useRoles();

  // Order Entry specific permissions
  const canCreateOrders = hasPermission('create_orders') || hasPermission('order_entry');
  const canEditOrders = hasPermission('edit_orders') || hasPermission('order_entry');
  const canDeleteOrders = hasPermission('delete_orders') || hasPermission('admin');
  const canViewOrders = hasPermission('view_orders') || hasPermission('order_entry');
  
  // Payment permissions
  const canProcessPayments = hasPermission('process_payments') || hasPermission('payment_processing');
  const canViewPaymentHistory = hasPermission('view_payment_history') || hasPermission('payment_processing');
  
  // Reports permissions
  const canViewReports = hasPermission('view_reports') || hasPermission('reports');
  const canExportReports = hasPermission('export_reports') || hasPermission('reports');
  
  // Configuration permissions
  const canModifyConfiguration = hasPermission('modify_configuration') || hasPermission('admin');
  const canViewConfiguration = hasPermission('view_configuration') || hasPermission('admin');
  
  // Master data permissions
  const canViewMasterData = hasPermission('view_master_data') || hasPermission('master_data');
  const canModifyMasterData = hasPermission('modify_master_data') || hasPermission('admin');

  return {
    // Order permissions
    canCreateOrders,
    canEditOrders,
    canDeleteOrders,
    canViewOrders,
    
    // Payment permissions
    canProcessPayments,
    canViewPaymentHistory,
    
    // Reports permissions
    canViewReports,
    canExportReports,
    
    // Configuration permissions
    canModifyConfiguration,
    canViewConfiguration,
    
    // Master data permissions
    canViewMasterData,
    canModifyMasterData,
    
    // Utility functions
    hasPermission,
    hasAnyPermission,
    
    // Current company roles info
    currentCompanyRoles,
    isOwner: currentCompanyRoles?.access_level === 'owner',
    isAdmin: currentCompanyRoles?.access_level === 'admin',
    isReadOnly: currentCompanyRoles?.access_level === 'read',
  };
};





