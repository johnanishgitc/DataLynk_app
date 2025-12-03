import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Switch } from 'react-native';

export type Periodicity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface FilterState {
  selectedStockGroup: string;
  selectedPinCode: string;
  selectedCustomer: string;
  selectedItem: string;
  periodicity: Periodicity;
  scaleFactor: number;
  avgSalesDays: number;
  metricType: 'sales' | 'profit';
  enabledCards: {
    stockGroupChart: boolean;
    pinCodeChart: boolean;
    customersChart: boolean;
    monthlySales: boolean;
    topItems: boolean;
  };
}

interface AnalyticsFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterState) => void;
  currentFilters: FilterState;
  allStockGroups: string[];
  allPinCodes: string[];
  allItems: string[];
  allCustomers: string[];
}

export function AnalyticsFilters({
  visible,
  onClose,
  onApplyFilters,
  currentFilters,
  allStockGroups,
  allPinCodes,
  allItems,
  allCustomers,
}: AnalyticsFiltersProps) {
  const [tempFilters, setTempFilters] = useState<FilterState>(currentFilters);
  const [showStockGroupPicker, setShowStockGroupPicker] = useState(false);
  const [showPinCodePicker, setShowPinCodePicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showPeriodicityPicker, setShowPeriodicityPicker] = useState(false);
  const [showScaleFactorPicker, setShowScaleFactorPicker] = useState(false);
  const [showMetricTypePicker, setShowMetricTypePicker] = useState(false);
  
  // Search states for each dropdown
  const [stockGroupSearch, setStockGroupSearch] = useState('');
  const [pinCodeSearch, setPinCodeSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const handleApply = () => {
    onApplyFilters(tempFilters);
    onClose();
  };

  const handleReset = () => {
    // Get default date range: start of current month to today
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const resetFilters: FilterState = {
      dateRange: {
        start: formatDate(startOfMonth),
        end: formatDate(today),
      },
      selectedStockGroup: 'all',
      selectedPinCode: 'all',
      selectedCustomer: 'all',
      selectedItem: 'all',
      periodicity: 'monthly',
      scaleFactor: 1,
      avgSalesDays: 30,
      metricType: 'sales',
      enabledCards: {
        stockGroupChart: true,
        pinCodeChart: false,
        customersChart: true,
        monthlySales: true,
        topItems: true,
      },
    };
    setTempFilters(resetFilters);
    onApplyFilters(resetFilters);
  };


  const hasChanges = JSON.stringify(tempFilters) !== JSON.stringify(currentFilters);

  // Filter functions for search
  const filteredStockGroups = ['all', ...allStockGroups].filter(group => 
    group.toLowerCase().includes(stockGroupSearch.toLowerCase())
  );
  const filteredPinCodes = ['all', ...allPinCodes].filter(code => 
    code.toLowerCase().includes(pinCodeSearch.toLowerCase())
  );
  const filteredItems = ['all', ...allItems].filter(item => 
    item.toLowerCase().includes(itemSearch.toLowerCase())
  );
  const filteredCustomers = ['all', ...allCustomers].filter(customer => 
    customer.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Config</Text>
          <TouchableOpacity 
            onPress={handleApply} 
            style={[styles.headerButton, hasChanges && styles.applyButton]}
            disabled={!hasChanges}
          >
            <Text style={[styles.headerButtonText, hasChanges && styles.applyButtonText]}>
              Apply
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>

          <View style={[styles.section, showPeriodicityPicker && { zIndex: 1000 }]}>
            <Text style={styles.sectionTitle}>Periodicity</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowPeriodicityPicker(!showPeriodicityPicker)}
            >
              <Text style={styles.dropdownButtonText}>
                {tempFilters.periodicity.charAt(0).toUpperCase() + tempFilters.periodicity.slice(1)}
              </Text>
              <Text style={styles.dropdownArrow}>{showPeriodicityPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showPeriodicityPicker && (
              <View style={styles.dropdownList}>
                {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as Periodicity[]).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.dropdownOption,
                      tempFilters.periodicity === period && styles.dropdownOptionSelected
                    ]}
                    onPress={() => {
                      setTempFilters({ ...tempFilters, periodicity: period });
                      setShowPeriodicityPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      tempFilters.periodicity === period && styles.dropdownOptionTextSelected
                    ]}>
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={[styles.section, showMetricTypePicker && { zIndex: 1000 }]}>
            <Text style={styles.sectionTitle}>Metric Type</Text>
            <Text style={styles.sectionDescription}>Choose whether to display sales or profit data</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowMetricTypePicker(!showMetricTypePicker)}
            >
              <Text style={styles.dropdownButtonText}>
                {tempFilters.metricType === 'sales' ? 'Sales' : 'Profit'}
              </Text>
              <Text style={styles.dropdownArrow}>{showMetricTypePicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showMetricTypePicker && (
              <View style={styles.dropdownList}>
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    tempFilters.metricType === 'sales' && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    setTempFilters({ ...tempFilters, metricType: 'sales' });
                    setShowMetricTypePicker(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    tempFilters.metricType === 'sales' && styles.dropdownItemTextSelected
                  ]}>
                    Sales
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    tempFilters.metricType === 'profit' && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    setTempFilters({ ...tempFilters, metricType: 'profit' });
                    setShowMetricTypePicker(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    tempFilters.metricType === 'profit' && styles.dropdownItemTextSelected
                  ]}>
                    Profit
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={[styles.section, showScaleFactorPicker && { zIndex: 1000 }]}>
            <Text style={styles.sectionTitle}>Scale Factor</Text>
            <Text style={styles.sectionDescription}>Divide all values by this factor for better readability</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowScaleFactorPicker(!showScaleFactorPicker)}
            >
              <Text style={styles.dropdownButtonText}>
                {(() => {
                  const scaleOptions = {
                    1: '1 (Ones)',
                    10: '10 (Tens)',
                    100: '100 (Hundreds)',
                    1000: '1,000 (Thousands)',
                    100000: '1,00,000 (Lakhs)',
                    10000000: '1,00,00,000 (Crores)',
                  };
                  return scaleOptions[tempFilters.scaleFactor as keyof typeof scaleOptions] || '1 (Ones)';
                })()}
              </Text>
              <Text style={styles.dropdownArrow}>{showScaleFactorPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showScaleFactorPicker && (
              <View style={styles.dropdownList}>
                {[
                  { value: 1, label: '1 (Ones)' },
                  { value: 10, label: '10 (Tens)' },
                  { value: 100, label: '100 (Hundreds)' },
                  { value: 1000, label: '1,000 (Thousands)' },
                  { value: 100000, label: '1,00,000 (Lakhs)' },
                  { value: 10000000, label: '1,00,00,000 (Crores)' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownOption,
                      tempFilters.scaleFactor === option.value && styles.dropdownOptionSelected
                    ]}
                    onPress={() => {
                      setTempFilters({ ...tempFilters, scaleFactor: option.value });
                      setShowScaleFactorPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      tempFilters.scaleFactor === option.value && styles.dropdownOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Average Sales Days</Text>
            <Text style={styles.sectionDescription}>Days to calculate average daily sales for stock analysis</Text>
            <TextInput
              style={styles.textInput}
              value={tempFilters.avgSalesDays.toString()}
              onChangeText={(text) => {
                // Allow empty string while typing
                if (text === '') {
                  setTempFilters({ ...tempFilters, avgSalesDays: 0 });
                  return;
                }
                const value = parseInt(text);
                if (!isNaN(value)) {
                  setTempFilters({ ...tempFilters, avgSalesDays: Math.max(1, Math.min(365, value)) });
                }
              }}
              onBlur={() => {
                // Reset to 30 if empty or 0 when user leaves the field
                if (tempFilters.avgSalesDays === 0) {
                  setTempFilters({ ...tempFilters, avgSalesDays: 30 });
                }
              }}
              keyboardType="numeric"
              placeholder="Enter days (1-365)"
            />
          </View>

          <View style={[styles.section, showStockGroupPicker && { zIndex: 1000 }]}>
            <Text style={styles.sectionTitle}>Stock Group</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setShowStockGroupPicker(!showStockGroupPicker);
                if (!showStockGroupPicker) setStockGroupSearch('');
              }}
            >
              <Text style={styles.dropdownButtonText}>
                {tempFilters.selectedStockGroup === 'all' ? 'All Stock Groups' : tempFilters.selectedStockGroup}
              </Text>
              <Text style={styles.dropdownArrow}>{showStockGroupPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showStockGroupPicker && (
              <View style={styles.dropdownListContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search stock groups..."
                  value={stockGroupSearch}
                  onChangeText={setStockGroupSearch}
                />
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {filteredStockGroups.map((group) => (
                    <TouchableOpacity
                      key={group}
                      style={[
                        styles.dropdownOption,
                        tempFilters.selectedStockGroup === group && styles.dropdownOptionSelected
                      ]}
                      onPress={() => {
                        setTempFilters({ ...tempFilters, selectedStockGroup: group });
                        setShowStockGroupPicker(false);
                        setStockGroupSearch('');
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        tempFilters.selectedStockGroup === group && styles.dropdownOptionTextSelected
                      ]}>
                        {group === 'all' ? 'All Stock Groups' : group}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={[styles.section, showPinCodePicker && { zIndex: 1000 }]}>
            <Text style={styles.sectionTitle}>Pin Code</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setShowPinCodePicker(!showPinCodePicker);
                if (!showPinCodePicker) setPinCodeSearch('');
              }}
            >
              <Text style={styles.dropdownButtonText}>
                {tempFilters.selectedPinCode === 'all' ? 'All Pin Codes' : tempFilters.selectedPinCode}
              </Text>
              <Text style={styles.dropdownArrow}>{showPinCodePicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showPinCodePicker && (
              <View style={styles.dropdownListContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search pin codes..."
                  value={pinCodeSearch}
                  onChangeText={setPinCodeSearch}
                  keyboardType="numeric"
                />
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {filteredPinCodes.map((pinCode) => (
                    <TouchableOpacity
                      key={pinCode}
                      style={[
                        styles.dropdownOption,
                        tempFilters.selectedPinCode === pinCode && styles.dropdownOptionSelected
                      ]}
                      onPress={() => {
                        setTempFilters({ ...tempFilters, selectedPinCode: pinCode });
                        setShowPinCodePicker(false);
                        setPinCodeSearch('');
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        tempFilters.selectedPinCode === pinCode && styles.dropdownOptionTextSelected
                      ]}>
                        {pinCode === 'all' ? 'All Pin Codes' : pinCode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={[styles.section, showItemPicker && { zIndex: 1000 }]}>
            <Text style={styles.sectionTitle}>Item</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setShowItemPicker(!showItemPicker);
                if (!showItemPicker) setItemSearch('');
              }}
            >
              <Text style={styles.dropdownButtonText}>
                {tempFilters.selectedItem === 'all' ? 'All Items' : tempFilters.selectedItem}
              </Text>
              <Text style={styles.dropdownArrow}>{showItemPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showItemPicker && (
              <View style={styles.dropdownListContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search items..."
                  value={itemSearch}
                  onChangeText={setItemSearch}
                />
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {filteredItems.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.dropdownOption,
                        tempFilters.selectedItem === item && styles.dropdownOptionSelected
                      ]}
                      onPress={() => {
                        setTempFilters({ ...tempFilters, selectedItem: item });
                        setShowItemPicker(false);
                        setItemSearch('');
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        tempFilters.selectedItem === item && styles.dropdownOptionTextSelected
                      ]}>
                        {item === 'all' ? 'All Items' : item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={[styles.section, showCustomerPicker && { zIndex: 1000 }]}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setShowCustomerPicker(!showCustomerPicker);
                if (!showCustomerPicker) setCustomerSearch('');
              }}
            >
              <Text style={styles.dropdownButtonText}>
                {tempFilters.selectedCustomer === 'all' ? 'All Customers' : tempFilters.selectedCustomer}
              </Text>
              <Text style={styles.dropdownArrow}>{showCustomerPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showCustomerPicker && (
              <View style={styles.dropdownListContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                />
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {filteredCustomers.map((customer) => (
                    <TouchableOpacity
                      key={customer}
                      style={[
                        styles.dropdownOption,
                        tempFilters.selectedCustomer === customer && styles.dropdownOptionSelected
                      ]}
                      onPress={() => {
                        setTempFilters({ ...tempFilters, selectedCustomer: customer });
                        setShowCustomerPicker(false);
                        setCustomerSearch('');
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        tempFilters.selectedCustomer === customer && styles.dropdownOptionTextSelected
                      ]}>
                        {customer === 'all' ? 'All Customers' : customer}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chart Visibility</Text>
            <View style={styles.toggleContainer}>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Stock Group Chart</Text>
                <Switch
                  value={tempFilters.enabledCards.stockGroupChart}
                  onValueChange={(value) => setTempFilters({
                    ...tempFilters,
                    enabledCards: { ...tempFilters.enabledCards, stockGroupChart: value }
                  })}
                />
              </View>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Pin Code Chart</Text>
                <Switch
                  value={tempFilters.enabledCards.pinCodeChart}
                  onValueChange={(value) => setTempFilters({
                    ...tempFilters,
                    enabledCards: { ...tempFilters.enabledCards, pinCodeChart: value }
                  })}
                />
              </View>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Top Customers Chart</Text>
                <Switch
                  value={tempFilters.enabledCards.customersChart}
                  onValueChange={(value) => setTempFilters({
                    ...tempFilters,
                    enabledCards: { ...tempFilters.enabledCards, customersChart: value }
                  })}
                />
              </View>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Monthly Sales</Text>
                <Switch
                  value={tempFilters.enabledCards.monthlySales}
                  onValueChange={(value) => setTempFilters({
                    ...tempFilters,
                    enabledCards: { ...tempFilters.enabledCards, monthlySales: value }
                  })}
                />
              </View>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Top 10 Items</Text>
                <Switch
                  value={tempFilters.enabledCards.topItems}
                  onValueChange={(value) => setTempFilters({
                    ...tempFilters,
                    enabledCards: { ...tempFilters.enabledCards, topItems: value }
                  })}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Reset All Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
    fontSize: 16,
    color: '#374151',
  },
  dateContainer: {
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: '#374151',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6b7280',
  },
  dropdownListContainer: {
    position: 'relative',
    zIndex: 1000,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: 'white',
    maxHeight: 250,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9fafb',
  },
  dropdownList: {
    maxHeight: 200,
    zIndex: 1001,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownOptionSelected: {
    backgroundColor: '#dbeafe',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  dropdownOptionTextSelected: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  resetButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  toggleContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
});
