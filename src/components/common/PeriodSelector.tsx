import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Alert,
  BackHandler,
} from 'react-native';

import { SimplePeriodSelector } from './SimplePeriodSelector';



export interface PeriodSelectorProps {
  onPeriodChange: (startDate: Date, endDate: Date) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  containerStyle?: any;
}

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

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  onPeriodChange,
  initialStartDate,
  initialEndDate,
  containerStyle,
}) => {

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PredefinedPeriod>('previousMonth');
  const [startDate, setStartDate] = useState<Date>(initialStartDate || new Date());
  const [endDate, setEndDate] = useState<Date>(initialEndDate || new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Ref for year picker scroll view
  const yearPickerScrollRef = useRef<ScrollView>(null);

  
  // Track the currently applied period (what's actually being used)
  const [appliedStartDate, setAppliedStartDate] = useState<Date>(initialStartDate || new Date());
  const [appliedEndDate, setAppliedEndDate] = useState<Date>(initialEndDate || new Date());

  // Month names array - moved to component level for reuse
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper functions to get current month and year
  const getCurrentMonth = useCallback(() => {
    const currentDate = showStartDatePicker ? startDate : endDate;
    return currentDate.getMonth();
  }, [showStartDatePicker, startDate, endDate]);

  const getCurrentYear = useCallback(() => {
    const currentDate = showStartDatePicker ? startDate : endDate;
    return currentDate.getFullYear();
  }, [showStartDatePicker, startDate, endDate]);

  // Handle Android back button when calendar is open
  useEffect(() => {
    const onBackPress = () => {
      if (showMonthPicker) {
        // If month picker is open, close it first
        setShowMonthPicker(false);
        return true; // Prevent default back behavior
      }
      if (showYearPicker) {
        // If year picker is open, close it first
        setShowYearPicker(false);
        return true; // Prevent default back behavior
      }
      if (showStartDatePicker || showEndDatePicker) {
        // If calendar is open, close it first
        setShowStartDatePicker(false);
        setShowEndDatePicker(false);
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [showStartDatePicker, showEndDatePicker, showMonthPicker, showYearPicker]);

  // Also handle back button when modal is open
  useEffect(() => {
    const onBackPress = () => {
      if (isModalVisible) {
        // If modal is open, close it
        setIsModalVisible(false);
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [isModalVisible]);

  // Auto-scroll to current year when year picker opens
  useEffect(() => {
    if (showYearPicker && yearPickerScrollRef.current) {
      const currentYear = new Date().getFullYear();
      const yearIndex = currentYear - 1990; // Calculate index based on 1990 start
      const scrollToY = yearIndex * 44; // 44 is approximate height of each year option
      
      setTimeout(() => {
        yearPickerScrollRef.current?.scrollTo({
          y: scrollToY,
          animated: true
        });
      }, 100); // Small delay to ensure modal is fully rendered
    }
  }, [showYearPicker]);

  // Initialize with previous month
  useEffect(() => {
    if (!initialStartDate && !initialEndDate) {
      const { start, end } = getPeriodDates('previousMonth');
      setStartDate(start);
      setEndDate(end);
      setAppliedStartDate(start);
      setAppliedEndDate(end);
      onPeriodChange(start, end);
    } else if (initialStartDate && initialEndDate) {
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
      setAppliedStartDate(initialStartDate);
      setAppliedEndDate(initialEndDate);
    }
  }, []);

  const getPeriodDates = (period: PredefinedPeriod): { start: Date; end: Date } => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    switch (period) {
      case 'today':
        return {
          start: new Date(currentYear, currentMonth, currentDate),
          end: new Date(currentYear, currentMonth, currentDate),
        };

      case 'yesterday':
        const yesterday = new Date(currentYear, currentMonth, currentDate - 1);
        return {
          start: yesterday,
          end: yesterday,
        };

      case 'currentMonth':
        return {
          start: new Date(currentYear, currentMonth, 1),
          end: new Date(currentYear, currentMonth, currentDate),
        };

      case 'previousMonth':
        return {
          start: new Date(currentYear, currentMonth - 1, 1),
          end: new Date(currentYear, currentMonth, 0),
        };

      case 'currentQuarter':
        const currentQuarter = Math.floor(currentMonth / 3);
        const quarterStartMonth = currentQuarter * 3;
        return {
          start: new Date(currentYear, quarterStartMonth, 1),
          end: new Date(currentYear, quarterStartMonth + 3, 0),
        };

      case 'previousQuarter':
        const prevQuarter = Math.floor(currentMonth / 3) - 1;
        const prevQuarterStartMonth = prevQuarter * 3;
        return {
          start: new Date(currentYear, prevQuarterStartMonth, 1),
          end: new Date(currentYear, prevQuarterStartMonth + 3, 0),
        };

      case 'currentFinancialYear':
        const financialYearStart = currentMonth >= 3 ? currentYear : currentYear - 1;
        return {
          start: new Date(financialYearStart, 3, 1), // April 1st
          end: new Date(financialYearStart + 1, 2, 31), // March 31st
        };

      case 'previousFinancialYear':
        const prevFinancialYearStart = currentMonth >= 3 ? currentYear - 1 : currentYear - 2;
        return {
          start: new Date(prevFinancialYearStart, 3, 1), // April 1st
          end: new Date(prevFinancialYearStart + 1, 2, 31), // March 31st
        };

      default:
        return { start: startDate, end: endDate };
    }
  };

  const handlePeriodSelect = useCallback((period: PredefinedPeriod) => {
    setSelectedPeriod(period);
    
    if (period === 'custom') {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
      const { start, end } = getPeriodDates(period);
      setStartDate(start);
      setEndDate(end);
      // Immediately apply the period change
      setAppliedStartDate(start);
      setAppliedEndDate(end);
      onPeriodChange(start, end);
    }
  }, [onPeriodChange]);

  const handleStartDateChange = useCallback((date: Date) => {
    setStartDate(date);
    setShowStartDatePicker(false);
  }, []);

  const handleEndDateChange = useCallback((date: Date) => {
    setEndDate(date);
    setShowEndDatePicker(false);
  }, []);

  const handleApply = useCallback(() => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    onPeriodChange(startDate, endDate);
    setIsModalVisible(false);
  }, [startDate, endDate, onPeriodChange]);

  const handleCancel = useCallback(() => {
    // Reset to applied values
    setStartDate(appliedStartDate);
    setEndDate(appliedEndDate);
    setIsModalVisible(false);
  }, [appliedStartDate, appliedEndDate]);

  const formatDate = (date: Date): string => {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };



  const generateYearOptions = useCallback(() => {
    const years = [];
    // Generate years from 1990 to 2040
    for (let year = 1990; year <= 2040; year++) {
      years.push(year);
    }
    return years;
  }, []);

  const renderDatePickerGrid = useCallback(() => {
    const currentDate = showStartDatePicker ? startDate : endDate;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Generate dates for the current month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const dates = [];
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      dates.push(null);
    }
    
    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      dates.push(date);
    }

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => {
              const newDate = new Date(year, month - 1, 1);
              if (showStartDatePicker) {
                setStartDate(newDate);
              } else {
                setEndDate(newDate);
              }
            }}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.monthYearContainer}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => setShowMonthPicker(true)}
            >
              <Text style={styles.monthButtonText}>{monthNames[getCurrentMonth()]}</Text>
              <Text style={styles.monthButtonArrow}>▼</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.yearButton}
              onPress={() => setShowYearPicker(true)}
            >
              <Text style={styles.yearButtonText}>{getCurrentYear()}</Text>
              <Text style={styles.yearButtonArrow}>▼</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.calendarHeaderRight}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                const newDate = new Date(year, month + 1, 1);
                if (showStartDatePicker) {
                  setStartDate(newDate);
                } else {
                  setEndDate(newDate);
                }
              }}
            >
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowStartDatePicker(false);
                setShowEndDatePicker(false);
              }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        


        <View style={styles.weekDaysContainer}>
          {weekDays.map((day, index) => (
            <Text key={index} style={styles.weekDayText}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.datesGrid}>
          {dates.map((date, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dateCell,
                !date && styles.emptyCell,
                date && showStartDatePicker && date.getTime() === startDate.getTime() && styles.selectedDate,
                date && showEndDatePicker && date.getTime() === endDate.getTime() && styles.selectedDate,
              ]}
              onPress={() => {
                if (date) {
                  if (showStartDatePicker) {
                    handleStartDateChange(date);
                  } else if (showEndDatePicker) {
                    handleEndDateChange(date);
                  }
                }
              }}
              disabled={!date}
            >
              {date && (
                <Text style={[
                  styles.dateText,
                  date.getTime() === startDate.getTime() && showStartDatePicker && styles.selectedDateText,
                  date.getTime() === endDate.getTime() && showEndDatePicker && styles.selectedDateText,
                ]}>
                  {date.getDate()}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [startDate, endDate, showStartDatePicker, showEndDatePicker, handleStartDateChange, handleEndDateChange]);

  return (
    <>
      {/* Period Display Button */}
      <TouchableOpacity
        style={[styles.periodDisplay, containerStyle]}
        onPress={() => {
          setIsModalVisible(true);
        }}
      >
        <Text style={styles.periodDisplayIcon}>📅</Text>
        <Text style={styles.periodDisplayText}>
          {formatDate(appliedStartDate)} to {formatDate(appliedEndDate)}
        </Text>
      </TouchableOpacity>

      {/* Full Screen Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Period</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Period Selection */}
            <SimplePeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodSelect={handlePeriodSelect}
              title="Select Period"
              style={styles.periodSelectionContainer}
              onClose={() => setIsModalVisible(false)}
            />

            {/* Custom Date Selection - Only show if custom mode */}
            {isCustomMode && (
              <View style={styles.customDateContainer}>
                <View style={styles.dateInputRow}>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateInputLabel}>FROM</Text>
                    <TouchableOpacity
                      style={[styles.dateInput, showStartDatePicker && styles.dateInputActive]}
                      onPress={() => {
                        setShowStartDatePicker(true);
                        setShowEndDatePicker(false);
                      }}
                    >
                      <Text style={styles.dateInputText}>
                        {formatDate(startDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateInputLabel}>TO</Text>
                    <TouchableOpacity
                      style={[styles.dateInput, showEndDatePicker && styles.dateInputActive]}
                      onPress={() => {
                        setShowEndDatePicker(true);
                        setShowStartDatePicker(false);
                      }}
                    >
                      <Text style={styles.dateInputText}>
                        {formatDate(endDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Calendar */}
                {(showStartDatePicker || showEndDatePicker) && (
                  <View style={styles.calendarWrapper}>
                    {renderDatePickerGrid()}
                  </View>
                )}

                {/* Year Picker */}
                {showYearPicker && (
                  <View style={styles.yearPickerOverlay}>
                    <View style={styles.yearPickerContainer}>
                      <View style={styles.yearPickerHeader}>
                        <Text style={styles.yearPickerTitle}>Select Year</Text>
                        <TouchableOpacity
                          style={styles.yearPickerCloseButton}
                          onPress={() => setShowYearPicker(false)}
                        >
                          <Text style={styles.yearPickerCloseButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* Current Year Button */}
                      <TouchableOpacity
                        style={styles.currentYearButton}
                        onPress={() => {
                          const currentYear = new Date().getFullYear();
                          const newDate = new Date(currentYear, getCurrentMonth(), 1);
                          if (showStartDatePicker) {
                            setStartDate(newDate);
                          } else {
                            setEndDate(newDate);
                          }
                          setShowYearPicker(false);
                        }}
                      >
                        <Text style={styles.currentYearButtonText}>Go to Current Year ({new Date().getFullYear()})</Text>
                      </TouchableOpacity>
                      
                      <ScrollView 
                        ref={yearPickerScrollRef}
                        style={styles.yearPickerScroll} 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.yearPickerScrollContent}
                      >
                        {generateYearOptions().map((yearOption) => (
                          <TouchableOpacity
                            key={yearOption}
                            style={[
                              styles.yearOption,
                              yearOption === getCurrentYear() && styles.yearOptionSelected
                            ]}
                            onPress={() => {
                              const newDate = new Date(yearOption, getCurrentMonth(), 1);
                              if (showStartDatePicker) {
                                setStartDate(newDate);
                              } else {
                                setEndDate(newDate);
                              }
                              setShowYearPicker(false);
                            }}
                          >
                            <Text style={[
                              styles.yearOptionText,
                              yearOption === getCurrentYear() && styles.yearOptionTextSelected
                            ]}>
                              {yearOption}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* Month Picker */}
                {showMonthPicker && (
                  <View style={styles.monthPickerOverlay}>
                    <View style={styles.monthPickerContainer}>
                      <View style={styles.monthPickerHeader}>
                        <Text style={styles.monthPickerTitle}>Select Month</Text>
                        <TouchableOpacity
                          style={styles.monthPickerCloseButton}
                          onPress={() => setShowMonthPicker(false)}
                        >
                          <Text style={styles.monthPickerCloseButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.monthPickerGrid}>
                        {monthNames.map((monthName, monthIndex) => (
                          <TouchableOpacity
                            key={monthIndex}
                            style={[
                              styles.monthOption,
                              monthIndex === getCurrentMonth() && styles.monthOptionSelected
                            ]}
                            onPress={() => {
                              const newDate = new Date(getCurrentYear(), monthIndex, 1);
                              if (showStartDatePicker) {
                                setStartDate(newDate);
                              } else {
                                setEndDate(newDate);
                              }
                              setShowMonthPicker(false);
                            }}
                          >
                            <Text style={[
                              styles.monthOptionText,
                              monthIndex === getCurrentMonth() && styles.monthOptionTextSelected
                            ]}>
                              {monthName}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApply}
              >
                <Text style={styles.applyButtonText}>APPLY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  periodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  periodDisplayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    marginLeft: 10,
  },
  periodDisplayIcon: {
    fontSize: 14,
    marginRight: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '100%',
    height: '60%',
    padding: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#ff6b6b',
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  periodSelectionContainer: {
    marginBottom: 20,
    flex: 1,
  },
  customDateContainer: {
    marginBottom: 20,
  },
  dateInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  dateInputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  dateInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInputActive: {
    borderColor: '#4DA6FF',
    backgroundColor: '#fff',
  },
  dateInputText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  calendarWrapper: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  navButtonText: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#ff6b6b',
  },
  closeButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  monthYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    minWidth: 80,
    justifyContent: 'center',
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 6,
  },
  monthButtonArrow: {
    fontSize: 10,
    color: '#666',
  },
  yearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    minWidth: 60,
    justifyContent: 'center',
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 6,
  },
  yearButtonArrow: {
    fontSize: 10,
    color: '#666',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCell: {
    width: '14.28%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  selectedDate: {
    backgroundColor: '#4DA6FF',
    borderRadius: 20,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  selectedDateText: {
    color: 'white',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#4DA6FF',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#4DA6FF',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#4DA6FF',
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  yearPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  yearPickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: 400,
    width: '80%',
    maxWidth: 300,
  },
  yearPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  currentYearButton: {
    backgroundColor: '#4DA6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  currentYearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  yearPickerCloseButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#ff6b6b',
  },
  yearPickerCloseButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  yearPickerScroll: {
    maxHeight: 300,
  },
  yearPickerScrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  yearOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  yearOptionSelected: {
    backgroundColor: '#4DA6FF',
    borderRadius: 8,
  },
  yearOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  yearOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  monthPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  monthPickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: 500,
    width: '90%',
    maxWidth: 350,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  monthPickerCloseButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#ff6b6b',
  },
  monthPickerCloseButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  monthPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthOption: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  monthOptionSelected: {
    backgroundColor: '#4DA6FF',
    borderColor: '#4DA6FF',
  },
  monthOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  monthOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
});

export default PeriodSelector;
