import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapLocationPicker, {
  MapAddressDetails,
  MapSelection,
} from './MapLocationPicker';

const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

type GstKeyboardType = 'default' | 'number-pad';
type PanKeyboardType = 'default' | 'number-pad';

const isDigitPosition = (index: number) =>
  index <= 1 || (index >= 7 && index <= 10);

const isLetterPosition = (index: number) =>
  (index >= 2 && index <= 6) || index === 11;

const sanitizeGstInput = (rawText: string): string => {
  const upperAlphanum = rawText.toUpperCase().replace(/[^0-9A-Z]/g, '');
  let result = '';

  for (let i = 0; i < upperAlphanum.length && result.length < 15; i += 1) {
    const nextIndex = result.length;
    const char = upperAlphanum[i];

    if (isDigitPosition(nextIndex)) {
      if (/\d/.test(char)) {
        result += char;
      }
      continue;
    }

    if (isLetterPosition(nextIndex)) {
      if (/[A-Z]/.test(char)) {
        result += char;
      }
      continue;
    }

    if (nextIndex === 13) {
      if (char === 'Z') {
        result += char;
      }
      continue;
    }

    if (/[0-9A-Z]/.test(char)) {
      result += char;
    }
  }

  return result;
};

const getGstKeyboardType = (currentLength: number): GstKeyboardType => {
  if (currentLength <= 1 || (currentLength >= 7 && currentLength <= 10)) {
    return 'number-pad';
  }
  return 'default';
};

const sanitizePanInput = (rawText: string): string => {
  const upperAlphanum = rawText.toUpperCase().replace(/[^0-9A-Z]/g, '');
  let result = '';

  for (let i = 0; i < upperAlphanum.length && result.length < 10; i += 1) {
    const nextIndex = result.length;
    const char = upperAlphanum[i];

    if (nextIndex <= 4 || nextIndex === 9) {
      if (/[A-Z]/.test(char)) {
        result += char;
      }
      continue;
    }

    if (nextIndex >= 5 && nextIndex <= 8) {
      if (/\d/.test(char)) {
        result += char;
      }
      continue;
    }
  }

  return result;
};

const getPanKeyboardType = (currentLength: number): PanKeyboardType => {
  if (currentLength >= 5 && currentLength <= 8) {
    return 'number-pad';
  }
  return 'default';
};

export interface CreateCustomerFormValues {
  name: string;
  contactPerson: string;
  mobileNumber: string;
  gstNumber: string;
  panNumber: string;
  address: string;
  state: string;
  country: string;
  pincode: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateCustomerSubmitResult {
  success: boolean;
  message?: string;
}

export interface CreateCustomerFormProps {
  initialValues?: Partial<CreateCustomerFormValues>;
  onSubmit?: (
    values: CreateCustomerFormValues
  ) =>
    | Promise<CreateCustomerSubmitResult | void>
    | CreateCustomerSubmitResult
    | void;
}

type FormErrors = Partial<Record<keyof CreateCustomerFormValues, string>>;

export const CreateCustomerForm: React.FC<CreateCustomerFormProps> = ({
  initialValues,
  onSubmit,
}) => {
  const computeInitialValues = useCallback((): CreateCustomerFormValues => ({
    name: initialValues?.name ?? '',
    contactPerson: initialValues?.contactPerson ?? '',
    mobileNumber: initialValues?.mobileNumber ?? '',
    gstNumber: initialValues?.gstNumber ?? '',
    panNumber: initialValues?.panNumber ?? '',
    address: initialValues?.address ?? '',
    state: initialValues?.state ?? '',
    country: initialValues?.country ?? '',
    pincode: initialValues?.pincode ?? '',
    bankName: initialValues?.bankName ?? '',
    bankAccountNumber: initialValues?.bankAccountNumber ?? '',
    ifscCode: initialValues?.ifscCode ?? '',
    latitude: initialValues?.latitude,
    longitude: initialValues?.longitude,
  }), [
    initialValues?.address,
    initialValues?.bankAccountNumber,
    initialValues?.bankName,
    initialValues?.contactPerson,
    initialValues?.country,
    initialValues?.gstNumber,
    initialValues?.ifscCode,
    initialValues?.latitude,
    initialValues?.longitude,
    initialValues?.mobileNumber,
    initialValues?.name,
    initialValues?.panNumber,
    initialValues?.pincode,
    initialValues?.state,
  ]);

  const deriveManualOverrides = useCallback(
    () => ({
      address: Boolean(initialValues?.address),
      state: Boolean(initialValues?.state),
      country: Boolean(initialValues?.country),
      pincode: Boolean(initialValues?.pincode),
    }),
    [initialValues?.address, initialValues?.country, initialValues?.pincode, initialValues?.state]
  );

  const [values, setValues] = useState<CreateCustomerFormValues>(() => computeInitialValues());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setSubmitting] = useState(false);
  const [manualOverrides, setManualOverrides] = useState(deriveManualOverrides);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
  const [isPanManuallyEdited, setPanManuallyEdited] = useState<boolean>(
    Boolean(initialValues?.panNumber && !initialValues?.gstNumber)
  );
  const [gstKeyboardType, setGstKeyboardType] = useState<GstKeyboardType>(() =>
    getGstKeyboardType(initialValues?.gstNumber?.length ?? 0)
  );
  const [panKeyboardType, setPanKeyboardType] = useState<PanKeyboardType>(() =>
    getPanKeyboardType(initialValues?.panNumber?.length ?? 0)
  );

  useEffect(() => {
    setValues(computeInitialValues());
    setManualOverrides(deriveManualOverrides());
    setPanManuallyEdited(Boolean(initialValues?.panNumber && !initialValues?.gstNumber));
    setPanKeyboardType(getPanKeyboardType(initialValues?.panNumber?.length ?? 0));
  }, [computeInitialValues, deriveManualOverrides]);

  useEffect(() => {
    setGstKeyboardType(getGstKeyboardType(values.gstNumber.length));
  }, [values.gstNumber.length]);

  useEffect(() => {
    setPanKeyboardType(getPanKeyboardType(values.panNumber.length));
  }, [values.panNumber.length]);

  const resetForm = useCallback(() => {
    setValues(computeInitialValues());
    setErrors({});
    setManualOverrides(deriveManualOverrides());
    setMapInstanceKey((key) => key + 1);
    setPanManuallyEdited(Boolean(initialValues?.panNumber && !initialValues?.gstNumber));
    setGstKeyboardType(getGstKeyboardType(initialValues?.gstNumber?.length ?? 0));
    setPanKeyboardType(getPanKeyboardType(initialValues?.panNumber?.length ?? 0));
  }, [computeInitialValues, deriveManualOverrides]);

  const updateValue = useCallback(
    <K extends keyof CreateCustomerFormValues>(field: K, value: CreateCustomerFormValues[K]) => {
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    },
    []
  );

  const handleManualFieldChange = useCallback(
    <K extends keyof CreateCustomerFormValues>(
      field: K,
      value: CreateCustomerFormValues[K],
      overrideKey?: keyof typeof manualOverrides
    ) => {
      updateValue(field, value);
      if (overrideKey) {
        setManualOverrides((prev) => ({
          ...prev,
          [overrideKey]: true,
        }));
      }
    },
    [updateValue]
  );

  const derivePanFromGst = useCallback(
    (gst: string) => {
      if (isPanManuallyEdited) {
        return;
      }

      if (GST_REGEX.test(gst)) {
        const derivedPan = gst.substring(2, 12);
        if (PAN_REGEX.test(derivedPan)) {
          updateValue('panNumber', derivedPan);
          return;
        }
      }

      if (!isPanManuallyEdited) {
        updateValue('panNumber', '');
      }
    },
    [isPanManuallyEdited, updateValue]
  );

  const handleGstChange = useCallback(
    (text: string) => {
      const sanitized = sanitizeGstInput(text);
      updateValue('gstNumber', sanitized);
      derivePanFromGst(sanitized);
      setGstKeyboardType(getGstKeyboardType(sanitized.length));
    },
    [updateValue, derivePanFromGst]
  );

  const handlePanChange = useCallback(
    (text: string) => {
      const sanitized = sanitizePanInput(text);
      setPanManuallyEdited(sanitized.length > 0);
      updateValue('panNumber', sanitized);
      setPanKeyboardType(getPanKeyboardType(sanitized.length));
    },
    [updateValue]
  );

  const handleLocationChange = useCallback(
    (selection: MapSelection) => {
      updateValue('latitude', selection.latitude);
      updateValue('longitude', selection.longitude);

      const addressDetails: MapAddressDetails | undefined = selection.address;
      if (addressDetails) {
        if (addressDetails.formattedAddress && !manualOverrides.address) {
          updateValue('address', addressDetails.formattedAddress);
        }
        if (addressDetails.state && !manualOverrides.state) {
          updateValue('state', addressDetails.state);
        }
        if (addressDetails.country && !manualOverrides.country) {
          updateValue('country', addressDetails.country);
        }
        if (addressDetails.postcode && !manualOverrides.pincode) {
          updateValue('pincode', addressDetails.postcode);
        }
      }
    },
    [manualOverrides.address, manualOverrides.country, manualOverrides.pincode, manualOverrides.state, updateValue]
  );

  const validate = useCallback((): boolean => {
    const validationErrors: FormErrors = {};

    if (!values.name.trim()) {
      validationErrors.name = 'Name is required.';
    }
    if (!values.contactPerson.trim()) {
      validationErrors.contactPerson = 'Contact person name is required.';
    }
    if (!values.mobileNumber.trim()) {
      validationErrors.mobileNumber = 'Mobile number is required.';
    } else if (!/^\d{10}$/.test(values.mobileNumber.trim())) {
      validationErrors.mobileNumber = 'Enter a valid 10-digit mobile number.';
    }

    if (values.gstNumber && !GST_REGEX.test(values.gstNumber)) {
      validationErrors.gstNumber = 'GST number format is invalid.';
    }

    if (values.panNumber && !PAN_REGEX.test(values.panNumber)) {
      validationErrors.panNumber = 'PAN number format is invalid.';
    }

    if (values.ifscCode && !IFSC_REGEX.test(values.ifscCode.toUpperCase())) {
      validationErrors.ifscCode = 'IFSC should be 11 characters (e.g. AAAA0BBBBBB).';
    }

    if (values.pincode && !/^\d{5,6}$/.test(values.pincode)) {
      validationErrors.pincode = 'Pincode should be 5 or 6 digits.';
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [values]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      return;
    }

    if (!onSubmit) {
      Alert.alert('Create Customer', 'Submission handler is not connected.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await onSubmit({
        ...values,
        gstNumber: values.gstNumber.trim(),
        panNumber: values.panNumber.trim(),
        mobileNumber: values.mobileNumber.trim(),
        address: values.address.trim(),
        state: values.state.trim(),
        country: values.country.trim(),
        pincode: values.pincode.trim(),
        bankName: values.bankName.trim(),
        bankAccountNumber: values.bankAccountNumber.trim(),
        ifscCode: values.ifscCode.trim().toUpperCase(),
      });

      const submitResult = result as CreateCustomerSubmitResult | void;
      if (!submitResult || submitResult.success !== false) {
        if (submitResult?.message) {
          Alert.alert('Create Customer', submitResult.message);
        }
        resetForm();
      } else if (submitResult.message) {
        Alert.alert('Create Customer', submitResult.message);
      }
    } catch (error: any) {
      console.error('Create customer submission failed:', error);
      const message =
        typeof error?.message === 'string'
          ? error.message
          : 'Unable to create customer. Please try again.';
      Alert.alert('Create Customer', message);
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, resetForm, validate, values]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContent}>
          <MapLocationPicker
            key={mapInstanceKey}
            value={
              values.latitude !== undefined && values.longitude !== undefined
                ? {
                    latitude: values.latitude,
                    longitude: values.longitude,
                    address: {
                      formattedAddress: values.address,
                      state: values.state,
                      country: values.country,
                      postcode: values.pincode,
                    },
                  }
                : undefined
            }
            onLocationChange={handleLocationChange}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Details</Text>
            <FormField
              label="Customer Name*"
              placeholder="Enter customer name"
              value={values.name}
              onChangeText={(text) => updateValue('name', text)}
              error={errors.name}
            />
            <FormField
              label="Contact Person Name*"
              placeholder="Enter contact person name"
              value={values.contactPerson}
              onChangeText={(text) => updateValue('contactPerson', text)}
              error={errors.contactPerson}
            />
            <FormField
              label="Mobile Number*"
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              value={values.mobileNumber}
              onChangeText={(text) =>
                updateValue('mobileNumber', text.replace(/[^0-9]/g, ''))
              }
              maxLength={10}
              error={errors.mobileNumber}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tax Information</Text>
            <FormField
              label="GST Number"
              placeholder="15-character GSTIN"
              value={values.gstNumber}
              onChangeText={handleGstChange}
              autoCapitalize="characters"
              maxLength={15}
              keyboardType={gstKeyboardType}
              error={errors.gstNumber}
            />
            <FormField
              label="PAN Number"
              value={values.panNumber}
              onChangeText={handlePanChange}
              autoCapitalize="characters"
              maxLength={10}
              keyboardType={panKeyboardType}
              error={errors.panNumber}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <FormField
              label="Full Address"
              placeholder="Auto-filled from map selection or enter manually"
              value={values.address}
              onChangeText={(text) => handleManualFieldChange('address', text, 'address')}
              multiline
              numberOfLines={3}
              error={errors.address}
            />
            <FormField
              label="State"
              placeholder="State"
              value={values.state}
              onChangeText={(text) => handleManualFieldChange('state', text, 'state')}
              error={errors.state}
            />
            <FormField
              label="Country"
              placeholder="Country"
              value={values.country}
              onChangeText={(text) => handleManualFieldChange('country', text, 'country')}
              error={errors.country}
            />
            <FormField
              label="Pincode"
              placeholder="Pincode"
              value={values.pincode}
              onChangeText={(text) =>
                handleManualFieldChange('pincode', text.replace(/[^0-9]/g, ''), 'pincode')
              }
              keyboardType="numeric"
              maxLength={6}
              error={errors.pincode}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            <FormField
              label="Bank Name"
              placeholder="Bank name"
              value={values.bankName}
              onChangeText={(text) => updateValue('bankName', text)}
              error={errors.bankName}
            />
            <FormField
              label="Bank Account Number"
              placeholder="Account number"
              value={values.bankAccountNumber}
              onChangeText={(text) => updateValue('bankAccountNumber', text.replace(/\s/g, ''))}
              keyboardType="number-pad"
              error={errors.bankAccountNumber}
            />
            <FormField
              label="IFSC Code"
              placeholder="11-character IFSC"
              value={values.ifscCode}
              onChangeText={(text) => updateValue('ifscCode', text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={11}
              error={errors.ifscCode}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting…' : 'Create Customer'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  editable?: boolean;
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  error?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = false,
  editable = true,
  maxLength,
  multiline = false,
  numberOfLines = 1,
  error,
}) => {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          !editable && styles.inputDisabled,
          error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        editable={editable}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formContent: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  formField: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  inputMultiline: {
    minHeight: 88,
    paddingVertical: 10,
  },
  inputDisabled: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#b91c1c',
  },
  submitButton: {
    backgroundColor: '#0f766e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#5f9ea0',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
});

export default CreateCustomerForm;

