import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { StockItem, Customer, VoucherType } from '../../types/order';
import { useBackendPermissions } from '../../hooks/useBackendPermissions';
import { useEffectiveConfig } from '../../hooks/useEffectiveConfig';

interface OrderFormProps {
  selectedCustomer: Customer | null;
  selectedItemIndex: number | null;
  itemQuantity: string;
  itemRate: string;
  itemDiscountPercent: string;
  itemTaxPercent: string;
  itemValue: string;
  itemBatch: string;
  orderItems: any[];
  orderConfig: any;
  itemList: StockItem[];
  customers: Customer[];
  voucherTypes: VoucherType[];
  selectedVoucherType: VoucherType | null;
  isLoadingVoucherTypes: boolean;
  showVoucherTypeDropdown: boolean;
  onItemQuantityChange: (text: string) => void;
  onItemRateChange: (text: string) => void;
  onItemDiscountPercentChange: (text: string) => void;
  onItemValueChange: (text: string) => void;
  onItemBatchChange: (text: string) => void;
  onAddItemToOrder: () => void;
  onAddItemDetails: (itemId?: string) => void;
  onRemoveItemFromOrder: (itemId: string) => void;
  onEditItemInOrder: (itemId: string) => void;
  onCheckItemStock: (itemId: string) => void;
  onOpenItemDropdown: () => void;
  onOpenCustomerDropdown: () => void;
  onOpenVoucherTypeDropdown: () => void;
  onVoucherTypeSelect: (voucherType: VoucherType) => void;
  quantityInputRef: any;
  amountInputRef: any;
  setIsScannerVisible: (visible: boolean) => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  selectedCustomer,
  selectedItemIndex,
  itemQuantity,
  itemRate,
  itemDiscountPercent,
  itemTaxPercent,
  itemValue,
  itemBatch,
  orderItems,
  orderConfig,
  itemList,
  customers,
  voucherTypes,
  selectedVoucherType,
  isLoadingVoucherTypes,
  showVoucherTypeDropdown,
  onItemQuantityChange,
  onItemRateChange,
  onItemDiscountPercentChange,
  onItemValueChange,
  onItemBatchChange,
  onAddItemToOrder,
  onAddItemDetails,
  onRemoveItemFromOrder,
  onEditItemInOrder,
  onCheckItemStock,
  onOpenItemDropdown,
  onOpenCustomerDropdown,
  onOpenVoucherTypeDropdown,
  onVoucherTypeSelect,
  quantityInputRef,
  amountInputRef,
  setIsScannerVisible,
}) => {
  // Get backend permissions and effective config
  const permissions = useBackendPermissions();
  const effectiveConfig = useEffectiveConfig();
  
  // State for item menu
  const [selectedItemMenuId, setSelectedItemMenuId] = useState<string | null>(null);
  
  // Get selected item details
  const selectedItem = selectedItemIndex !== null ? itemList[selectedItemIndex] : null;
  
  // Menu handlers
  const handleMenuPress = (itemId: string) => {
    setSelectedItemMenuId(selectedItemMenuId === itemId ? null : itemId);
  };
  
  const handleMenuAction = (action: 'edit' | 'delete' | 'addDetails' | 'checkStock', itemId: string) => {
    if (!itemId) {
      console.error('handleMenuAction: itemId is null or undefined');
      return;
    }
    setSelectedItemMenuId(null);
    if (action === 'edit') {
      onEditItemInOrder(itemId);
    } else if (action === 'delete') {
      onRemoveItemFromOrder(itemId);
    } else if (action === 'addDetails') {
      onAddItemDetails(itemId);
    } else if (action === 'checkStock') {
      onCheckItemStock(itemId);
    }
  };
  
  // Determine display price for selected item
  const getDisplayPrice = (item: StockItem) => {
    let price = item.rate;
    
    if (effectiveConfig.usePriceLevels && selectedCustomer?.priceLevel && item.priceLevels) {
      const matchingPriceLevel = item.priceLevels.find(pl => 
        pl.levelName.toLowerCase() === selectedCustomer.priceLevel?.toLowerCase()
      );
      if (matchingPriceLevel && matchingPriceLevel.rate > 0) {
        price = matchingPriceLevel.rate;
      }
    }
    
    return price;
  };



  return (
    <View style={styles.container}>
      {/* Voucher Type Selection - Only show if allowed by backend permissions */}
      {permissions.allowVchtype && (
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={onOpenVoucherTypeDropdown}
          disabled={isLoadingVoucherTypes || voucherTypes.length === 0}
        >
          <Text style={styles.dropdownButtonText}>
            {isLoadingVoucherTypes 
              ? 'Loading voucher types...' 
              : selectedVoucherType 
                ? selectedVoucherType.name 
                : 'Select voucher type...'
            }
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
      )}

      {/* Customer Selection */}
      <TouchableOpacity 
        style={[
          styles.dropdownButton,
          effectiveConfig.usePriceLevels && orderItems.length > 0 && styles.customerDropdownDisabled
        ]}
        onPress={onOpenCustomerDropdown}
        disabled={effectiveConfig.usePriceLevels && orderItems.length > 0}
      >
        <Text style={styles.dropdownButtonText}>
          {selectedCustomer ? selectedCustomer.name : 'Select a customer...'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>
      

      
      {effectiveConfig.usePriceLevels && orderItems.length > 0 && (
        <View style={styles.customerChangeNote}>
          <Text style={styles.customerChangeNoteText}>
            ⚠️ Customer cannot be changed while items are in cart (Price Levels Enabled)
          </Text>
        </View>
      )}

      {/* Item Selection */}
      {effectiveConfig.usePriceLevels && !selectedCustomer && (
        <View style={styles.priceLevelNote}>
          <Text style={styles.priceLevelNoteText}>
            ⚠️ Please select a customer first to view item prices
          </Text>
        </View>
      )}
      
      {effectiveConfig.usePriceLevels && selectedCustomer && (
        <View style={styles.priceLevelInfo}>
          <Text style={styles.priceLevelInfoText}>
            💡 Showing prices for customer: {selectedCustomer.name} (Price Level: {selectedCustomer.priceLevel || 'Standard'})
          </Text>
        </View>
      )}
      
      <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
        <TouchableOpacity 
          style={[
            styles.dropdownButton,
            {width: '85%'},
            effectiveConfig.usePriceLevels && !selectedCustomer && styles.dropdownButtonDisabled
          ]}
          onPress={onOpenItemDropdown}
          disabled={effectiveConfig.usePriceLevels && !selectedCustomer}
        >
          <Text style={styles.dropdownButtonText}>
            {selectedItemIndex !== null && selectedItem
              ? `${selectedItem.name} (${selectedItem.availableQty}/Rs.${getDisplayPrice(selectedItem)})`
              : 'Select an item...'
            }
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scanButton, {width: '10%'}]}
          onPress={() => setIsScannerVisible(true)}
        >
          <Image source={require('./../../../assets/qrButtonImage.png')} style={{width: 25, height: 25}} />
        </TouchableOpacity>
      </View>

      {/* Batch Field - Only show if batch tracking is enabled */}
      {permissions.showBatches && (
        <View style={styles.batchRow}>
          <Text style={styles.batchLabel}>Batch:</Text>
          <TextInput
            style={styles.batchInput}
            value={itemBatch}
            onChangeText={onItemBatchChange}
            placeholder="Enter batch number"
            placeholderTextColor="#999"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="characters"
          />
        </View>
      )}

        {/* First Row: Qty, Rate, Discount% */}
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Qty:</Text>
            <TextInput
              ref={quantityInputRef}
              style={styles.input}
              value={itemQuantity}
              onChangeText={onItemQuantityChange}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="numeric"
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="none"
              textContentType="none"
              spellCheck={false}
              {...(Platform.OS === 'web' ? { name: 'item-quantity' } : {})}
            />
          </View>
          
          {permissions.showRateAmtColumn && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rate:</Text>
              <TextInput
                style={styles.input}
                value={itemRate}
                onChangeText={onItemRateChange}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="numeric"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="none"
                editable={permissions.editRate}
              />
            </View>
          )}
          
          {permissions.showDiscColumn && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Discount%:</Text>
              <TextInput
                style={styles.input}
                value={itemDiscountPercent}
                onChangeText={onItemDiscountPercentChange}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="none"
                editable={permissions.editDiscount}
              />
            </View>
          )}
        </View>

        {/* Second Row: Stock (if enabled), Tax%, Value */}
        <View style={styles.inputRow}>
          {permissions.showClsStckColumn && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Stock avlb:</Text>
              <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value={
                  permissions.showClsStckYesno 
                    ? (selectedItem?.closingStock && selectedItem.closingStock > 0 ? 'Yes' : 'No')
                    : (selectedItem?.closingStock?.toString() || '0')
                }
                editable={false}
                placeholder={permissions.showClsStckYesno ? 'No' : '0'}
                placeholderTextColor="#999"
                keyboardType="numeric"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          )}
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tax%:</Text>
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={itemTaxPercent}
              editable={false}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="numeric"
              autoComplete="off"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          
          {permissions.showRateAmtColumn && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Value:</Text>
              <TextInput
                ref={amountInputRef}
                style={styles.input}
                value={itemValue}
                onChangeText={onItemValueChange}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="numeric"
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="none"
                editable={permissions.editRate}
              />
            </View>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          {permissions.showItemDesc && (
            <TouchableOpacity 
              style={[styles.addButton, styles.addDetailsButton]} 
              onPress={() => onAddItemDetails()}
              disabled={selectedItemIndex === null}
            >
              <Text style={styles.addButtonText}>Add Item Details</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.addButton, styles.addToOrderButton]} 
            onPress={onAddItemToOrder}
            disabled={selectedItemIndex === null}
          >
            <Text style={styles.addButtonText}>Add to Order</Text>
          </TouchableOpacity>
        </View>

      {/* Total Amount Display - Only show if rate/amount column is enabled */}
      {orderItems.length > 0 && permissions.showRateAmtColumn && (
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>
            Total Amount (Items: {orderItems.length}):
          </Text>
          <Text style={styles.totalAmount}>
            ₹{orderItems.reduce((total, item) => total + item.value, 0).toFixed(2)}
          </Text>
        </View>
      )}

      {/* Order Items List */}
      {orderItems.length > 0 && (
        <View style={styles.orderItemsContainer}>
          {orderItems.map((item, index) => (
            <View 
              key={item.id} 
              style={[
                styles.orderItem,
                index === orderItems.length - 1 && styles.lastOrderItem
              ]}
            >
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName}>{item.name}</Text>
                {permissions.showRateAmtColumn ? (
                  <Text style={styles.orderItemDetails}>
                    Qty: {item.quantity} × ₹{item.rate}{orderConfig && orderConfig.showDiscount !== false ? ` × (1-${item.discountPercent}%)` : ''} = ₹{item.value.toFixed(2)}
                  </Text>
                ) : (
                  <Text style={styles.orderItemDetails}>
                    Qty: {item.quantity}
                  </Text>
                )}
                <View style={styles.taxInfoRow}>
                  <Text style={styles.taxInfo}>
                    Tax%: {item.taxPercent}%
                  </Text>
                  {permissions.showClsStckColumn && (permissions.showGodownBrkup || permissions.showMultiCoBrkup) && (
                    <>
                      <Text style={styles.taxInfo}> | </Text>
                      <TouchableOpacity onPress={() => onCheckItemStock(item.id)} activeOpacity={0.7}>
                        <Text style={styles.stockLinkText}>
                          Stock: {permissions.showClsStckYesno ? (item.availableQty > 0 ? 'Yes' : 'No') : item.availableQty}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {permissions.showClsStckColumn && !(permissions.showGodownBrkup || permissions.showMultiCoBrkup) && (
                    <Text style={styles.taxInfo}>
                      {` | Stock avlb: ${permissions.showClsStckYesno ? (item.availableQty > 0 ? 'Yes' : 'No') : item.availableQty}`}
                    </Text>
                  )}
                </View>
                {permissions.showBatches && item.batch && (
                  <Text style={styles.batchInfo}>Batch: {item.batch}</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => handleMenuPress(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuButtonText}>⋮</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Item Menu Modal */}
      <Modal
        visible={selectedItemMenuId !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedItemMenuId(null)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setSelectedItemMenuId(null)}
        >
          <View style={styles.menuPositioner}>
            <View style={styles.menuContainer}>
              <TouchableOpacity 
                style={styles.menuOption}
                onPress={() => selectedItemMenuId && handleMenuAction('edit', selectedItemMenuId)}
              >
                <Text style={styles.menuOptionText}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuOption}
                onPress={() => selectedItemMenuId && handleMenuAction('addDetails', selectedItemMenuId)}
              >
                <Text style={styles.menuOptionText}>📝 Add Details</Text>
              </TouchableOpacity>
              {(permissions.showGodownBrkup || permissions.showMultiCoBrkup) && (
                <TouchableOpacity 
                  style={styles.menuOption}
                  onPress={() => selectedItemMenuId && handleMenuAction('checkStock', selectedItemMenuId)}
                >
                  <Text style={styles.menuOptionText}>📦 Check Stock</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.menuOption, styles.deleteOption]}
                onPress={() => selectedItemMenuId && handleMenuAction('delete', selectedItemMenuId)}
              >
                <Text style={[styles.menuOptionText, styles.deleteOptionText]}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 0,
  },
  dropdownButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 0,
    padding: 8,
    backgroundColor: 'white',
    marginBottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dropdownButtonDisabled: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    opacity: 0.6,
  },
  customerDropdownDisabled: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
    opacity: 0.6,
  },
  customerChangeNote: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  customerChangeNoteText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  priceLevelNote: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  priceLevelNoteText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  priceLevelInfo: {
    backgroundColor: '#d1ecf1',
    borderWidth: 1,
    borderColor: '#bee5eb',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  priceLevelInfoText: {
    fontSize: 12,
    color: '#0c5460',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#666',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  batchLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginRight: 8,
    minWidth: 50,
  },
  batchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    fontSize: 13,
    backgroundColor: 'white',
    color: '#333',
    textAlign: 'left',
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 6,
    fontSize: 13,
    backgroundColor: 'white',
    color: '#333',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#5D8277',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addDetailsButton: {
    backgroundColor: '#5D8277',
    flex: 1,
  },
  addToOrderButton: {
    backgroundColor: '#5D8277',
    flex: 1,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 4,
    borderRadius: 8,
    marginBottom: 12, // Increased margin between items
    borderWidth: 1,
    borderColor: '#eee',
  },
  orderItemInfo: {
    flex: 1,
    paddingRight: 4,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  orderItemDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 1,
  },
  batchInfo: {
    fontSize: 13,
    color: '#28a745',
    fontWeight: '500',
    marginBottom: 1,
  },
  taxInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  taxInfo: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 1,
  },
  stockLinkText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginBottom: 1,
  },
  menuButton: {
    backgroundColor: '#f8f9fa',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  menuButtonText: {
    color: '#6c757d',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  menuPositioner: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -50 }],
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 160,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  menuOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deleteOption: {
    borderBottomWidth: 0,
  },
  menuOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  deleteOptionText: {
    color: '#dc3545',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  scanButton: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
    width: 100,
    height: 40,
  },
  scanButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  readOnlyInput: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
    borderColor: '#e9ecef',
  },
  orderItemsContainer: {
    marginBottom: 60, // Increased margin at the bottom of items list for better clearance
  },
  lastOrderItem: {
    marginBottom: 20, // Extra margin for the last item
  },
});
