import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

export type PredefinedPeriod = 
  | 'today'
  | 'yesterday'
  | 'currentMonth'
  | 'previousMonth'
  | 'currentQuarter'
  | 'previousQuarter'
  | 'currentFinancialYear'
  | 'previousFinancialYear'
  | 'custom';

interface PeriodOption {
  label: string;
  value: PredefinedPeriod;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: 'Custom Date', value: 'custom' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Current Month (start to today)', value: 'currentMonth' },
  { label: 'Last Month', value: 'previousMonth' },
  { label: 'Current Quarter (Start to today)', value: 'currentQuarter' },
  { label: 'Last Quarter', value: 'previousQuarter' },
  { label: 'Current Financial Year (1-Apr to today)', value: 'currentFinancialYear' },
  { label: 'Last Financial Year', value: 'previousFinancialYear' },
];

interface SimplePeriodSelectorProps {
  selectedPeriod: PredefinedPeriod;
  onPeriodSelect: (period: PredefinedPeriod) => void;
  title?: string;
  style?: any;
  maxHeight?: number;
  onClose?: () => void;
}

export const SimplePeriodSelector: React.FC<SimplePeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodSelect,
  title = 'Select Period',
  style,
  maxHeight = 300,
  onClose,
}) => {

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
             <ScrollView 
         style={styles.periodList}
         showsVerticalScrollIndicator={true}
         nestedScrollEnabled={true}
       >
                 {PERIOD_OPTIONS.map((option) => (
           <TouchableOpacity
             key={option.value}
             style={[
               styles.periodOptionItem,
               selectedPeriod === option.value && styles.periodOptionItemSelected
             ]}
             onPress={() => {
               onPeriodSelect(option.value);
               // Don't close modal for custom date - let user input dates
               if (onClose && option.value !== 'custom') {
                 onClose();
               }
             }}
           >
             <Text style={[
               styles.periodOptionText,
               selectedPeriod === option.value && styles.periodOptionTextSelected
             ]}>
               {option.label}
             </Text>
           </TouchableOpacity>
         ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  periodList: {
    flex: 1,
  },
  periodOptionItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  periodOptionItemSelected: {
    backgroundColor: '#4DA6FF',
  },
  periodOptionText: {
    fontSize: 14,
    color: '#333',
  },
  periodOptionTextSelected: {
    color: 'white',
  },
});

export default SimplePeriodSelector;
