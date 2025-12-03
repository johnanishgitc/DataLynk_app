/**
 * Simple Summary Report Component
 * 
 * A simplified summary report without external dependencies.
 * Uses only React Native built-in components and basic JavaScript.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, FlatList } from 'react-native';

export type Txn = {
  date: string; // ISO
  customer: string;
  stockitem: string;
  qty: number;
  rate: number;
  amount: number;
};

type GroupBy = 'customer' | 'stockitem' | 'date';
type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

// Simple date utilities without external dependencies
function formatDate(dateString: string, granularity: Granularity): string {
  const date = new Date(dateString);
  
  switch (granularity) {
    case 'day':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'week':
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday start
      return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    case 'year':
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString();
  }
}

function toBucket(dateString: string, granularity: Granularity): string {
  const date = new Date(dateString);
  
  switch (granularity) {
    case 'day':
      return date.toISOString().split('T')[0];
    case 'week':
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      return weekStart.toISOString().split('T')[0];
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `${date.getFullYear()}-Q${quarter}`;
    case 'year':
      return date.getFullYear().toString();
    default:
      return date.toISOString().split('T')[0];
  }
}

function formatNumber(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(n)) return '';
  return Number(n).toFixed(digits);
}

function formatCurrency(amount: number): string {
  return `₹${formatNumber(amount)}`;
}

export function SimpleSummaryReport({ data }: { data: Txn[] }) {
  const [groupBy, setGroupBy] = useState<GroupBy>('customer');
  const [secondGroup, setSecondGroup] = useState<Exclude<GroupBy, 'date'> | 'date' | ''>('stockitem');
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [textFilter, setTextFilter] = useState('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  // Transform and filter data
  const transformed = useMemo(() => {
    let rows = data.map(txn => ({
      ...txn,
      dateBucket: toBucket(txn.date, granularity),
    }));

    // Date range filter
    if (from) rows = rows.filter(r => r.date >= from);
    if (to) rows = rows.filter(r => r.date <= to);

    // Text filter
    if (textFilter) {
      const filter = textFilter.toLowerCase();
      rows = rows.filter(r => 
        r.customer.toLowerCase().includes(filter) || 
        r.stockitem.toLowerCase().includes(filter)
      );
    }

    return rows;
  }, [data, from, to, textFilter, granularity]);

  // Group data
  const groupedData = useMemo(() => {
    const groups: Record<string, Txn[]> = {};
    
    transformed.forEach(txn => {
      let groupKey = '';
      
      if (groupBy === 'date') {
        groupKey = txn.dateBucket;
      } else {
        groupKey = txn[groupBy];
      }
      
      if (secondGroup && secondGroup !== groupBy) {
        let secondKey = '';
        if (secondGroup === 'date') {
          secondKey = txn.dateBucket;
        } else {
          secondKey = txn[secondGroup];
        }
        groupKey = `${groupKey}|${secondKey}`;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(txn);
    });
    
    return groups;
  }, [transformed, groupBy, secondGroup]);

  // Calculate totals for each group
  const groupTotals = useMemo(() => {
    const totals: Record<string, { qty: number; amount: number; rate: number }> = {};
    
    Object.entries(groupedData).forEach(([key, items]) => {
      const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const weightedRate = totalQty > 0 ? totalAmount / totalQty : 0;
      
      totals[key] = { qty: totalQty, amount: totalAmount, rate: weightedRate };
    });
    
    return totals;
  }, [groupedData]);

  // Export to CSV
  const exportToCSV = () => {
    const csvRows: string[] = [];
    csvRows.push('Group,Qty,Rate,Amount');
    
    Object.entries(groupTotals).forEach(([group, totals]) => {
      const [primary, secondary] = group.split('|');
      const displayGroup = secondary ? `${primary} - ${secondary}` : primary;
      csvRows.push(`${displayGroup},${totals.qty},${formatNumber(totals.rate)},${formatNumber(totals.amount)}`);
    });
    
    const csvContent = csvRows.join('\n');
    Alert.alert('CSV Export', `Exported ${Object.keys(groupTotals).length} groups to CSV`);
    console.log('CSV Content:', csvContent);
  };

  const renderGroupItem = ({ item }: { item: [string, Txn[]] }) => {
    const [groupKey, items] = item;
    const totals = groupTotals[groupKey];
    const [primary, secondary] = groupKey.split('|');
    
    return (
      <View style={styles.groupItem}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>
            {groupBy === 'date' ? formatDate(primary, granularity) : primary}
            {secondary && (
              <Text style={styles.secondaryGroup}>
                {' - '}{secondGroup === 'date' ? formatDate(secondary, granularity) : secondary}
              </Text>
            )}
          </Text>
          <Text style={styles.groupCount}>{items.length} transactions</Text>
        </View>
        
        <View style={styles.totalsRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalQty}>{formatNumber(totals.qty)}</Text>
          <Text style={styles.totalRate}>{formatCurrency(totals.rate)}</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totals.amount)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Control Bar */}
      <View style={styles.controlBar}>
        <Text style={styles.sectionTitle}>Grouping & Filters</Text>
        
        <View style={styles.controlRow}>
          <Text style={styles.label}>Group By:</Text>
          <View style={styles.buttonGroup}>
            {(['customer', 'stockitem', 'date'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.optionButton, groupBy === option && styles.optionButtonActive]}
                onPress={() => setGroupBy(option)}
              >
                <Text style={[styles.optionButtonText, groupBy === option && styles.optionButtonTextActive]}>
                  {option === 'stockitem' ? 'Stock Item' : option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {groupBy === 'date' && (
          <View style={styles.controlRow}>
            <Text style={styles.label}>Granularity:</Text>
            <View style={styles.buttonGroup}>
              {(['day', 'week', 'month', 'quarter', 'year'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionButton, granularity === option && styles.optionButtonActive]}
                  onPress={() => setGranularity(option)}
                >
                  <Text style={[styles.optionButtonText, granularity === option && styles.optionButtonTextActive]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.controlRow}>
          <Text style={styles.label}>Second Group:</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.optionButton, secondGroup === '' && styles.optionButtonActive]}
              onPress={() => setSecondGroup('')}
            >
              <Text style={[styles.optionButtonText, secondGroup === '' && styles.optionButtonTextActive]}>
                None
              </Text>
            </TouchableOpacity>
            {(['customer', 'stockitem', 'date'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.optionButton, secondGroup === option && styles.optionButtonActive]}
                onPress={() => setSecondGroup(option)}
              >
                <Text style={[styles.optionButtonText, secondGroup === option && styles.optionButtonTextActive]}>
                  {option === 'stockitem' ? 'Stock Item' : option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.label}>From:</Text>
          <TextInput
            style={styles.input}
            value={from}
            onChangeText={setFrom}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.label}>To:</Text>
          <TextInput
            style={styles.input}
            value={to}
            onChangeText={setTo}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.label}>Filter:</Text>
          <TextInput
            style={styles.input}
            value={textFilter}
            onChangeText={setTextFilter}
            placeholder="Search customer/item"
          />
        </View>

        <TouchableOpacity style={styles.exportButton} onPress={exportToCSV}>
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          {Object.keys(groupedData).length} groups found
        </Text>
        
        <FlatList
          data={Object.entries(groupedData)}
          renderItem={renderGroupItem}
          keyExtractor={([groupKey]) => groupKey}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  controlBar: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#495057',
  },
  controlRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#495057',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: 12,
    color: '#495057',
  },
  optionButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  exportButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#495057',
  },
  list: {
    flex: 1,
  },
  groupItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    flex: 1,
  },
  secondaryGroup: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: 'normal',
  },
  groupCount: {
    fontSize: 12,
    color: '#6c757d',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
  },
  totalQty: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
    minWidth: 60,
  },
  totalRate: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
    minWidth: 80,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'right',
    minWidth: 80,
  },
});





