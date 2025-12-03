import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useBackendPermissions } from '../hooks/useBackendPermissions';
import { useEffectiveConfig } from '../hooks/useEffectiveConfig';

export const BackendPermissionsDisplay: React.FC = () => {
  const permissions = useBackendPermissions();
  const effectiveConfig = useEffectiveConfig();

  const permissionGroups = [
    {
      title: 'Order Entry Features',
      permissions: [
        { key: 'showPayTerms', label: 'Payment Terms', value: permissions.showPayTerms },
        { key: 'showDelvTerms', label: 'Delivery Terms', value: permissions.showDelvTerms },
        { key: 'showRateAmtColumn', label: 'Rate & Amount Fields', value: permissions.showRateAmtColumn },
        { key: 'editRate', label: 'Rate Modification', value: permissions.editRate },
        { key: 'showDiscColumn', label: 'Discount Field', value: permissions.showDiscColumn },
        { key: 'editDiscount', label: 'Discount Modification', value: permissions.editDiscount },
      ]
    },
    {
      title: 'Stock & Inventory',
      permissions: [
        { key: 'showClsStckColumn', label: 'Stock Availability', value: permissions.showClsStckColumn },
        { key: 'showClsStckYesno', label: 'Stock Yes/No Indicator', value: permissions.showClsStckYesno },
        { key: 'showBatches', label: 'Batch Tracking', value: permissions.showBatches },
        { key: 'showGodownBrkup', label: 'Godown-Wise Stock', value: permissions.showGodownBrkup },
        { key: 'showMultiCoBrkup', label: 'Multi-Company Stock', value: permissions.showMultiCoBrkup },
        { key: 'showItemsHasQty', label: 'Items with Stock Only', value: permissions.showItemsHasQty },
      ]
    },
    {
      title: 'Order Settings',
      permissions: [
        { key: 'saveOptional', label: 'Save as Optional', value: permissions.saveOptional },
        { key: 'allowVchtype', label: 'Voucher Type Selection', value: permissions.allowVchtype },
        { key: 'defQty', label: 'Default Quantity', value: permissions.defQty, valueText: permissions.defQty ? effectiveConfig.defaultQuantity.toString() : 'Disabled' },
        { key: 'showPricelvl', label: 'Price Levels', value: permissions.showPricelvl },
        { key: 'defOrderDueDays', label: 'Default Order Due Days', value: permissions.defOrderDueDays, valueText: permissions.defOrderDueDays ? effectiveConfig.defaultOrderDueDays.toString() : 'Disabled' },
        { key: 'showOrdDueDate', label: 'Order Due Date', value: permissions.showOrdDueDate },
        { key: 'showOrderShare', label: 'Order Share Button', value: permissions.showOrderShare },
      ]
    },
    {
      title: 'Item Settings',
      permissions: [
        { key: 'showItemDesc', label: 'Item Description', value: permissions.showItemDesc },
      ]
    }
  ];

  return (
    <View style={styles.container}>
      {permissionGroups.map((group, groupIndex) => (
        <View key={groupIndex} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.permissions.map((permission, index) => (
            <View key={index} style={styles.permissionRow}>
              <Text style={styles.permissionLabel}>{permission.label}:</Text>
              <Text style={[styles.permissionValue, permission.value ? styles.enabled : styles.disabled]}>
                {permission.value ? (permission.valueText || 'Enabled') : 'Disabled'}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 16,
  },
  group: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#bdc3c7',
    paddingBottom: 4,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 4,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  permissionLabel: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  permissionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  enabled: {
    color: '#27ae60',
  },
  disabled: {
    color: '#e74c3c',
  },
});
