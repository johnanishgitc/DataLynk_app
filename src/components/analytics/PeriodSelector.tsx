import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface PeriodSelectorProps {
  visible: boolean;
  onClose: () => void;
  onApplyPeriod: (startDate: string, endDate: string) => void;
  currentStartDate: string;
  currentEndDate: string;
}

export function PeriodSelector({
  visible,
  onClose,
  onApplyPeriod,
  currentStartDate,
  currentEndDate,
}: PeriodSelectorProps) {
  const [tempStartDate, setTempStartDate] = useState(new Date(currentStartDate));
  const [tempEndDate, setTempEndDate] = useState(new Date(currentEndDate));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  };

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleApply = () => {
    onApplyPeriod(formatDateForAPI(tempStartDate), formatDateForAPI(tempEndDate));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Period</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.dateSection}>
            <Text style={styles.sectionTitle}>Date Range</Text>
            
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>From Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    📅 {formatDateForDisplay(tempStartDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>To Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    📅 {formatDateForDisplay(tempEndDate)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={tempStartDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) {
                    setTempStartDate(selectedDate);
                  }
                }}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={tempEndDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) {
                    setTempEndDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Period</Text>
            </TouchableOpacity>
          </View>
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
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6b7280',
    borderRadius: 6,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dateSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingTop: 16,
  },
  applyButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
