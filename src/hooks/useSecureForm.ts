import { useState, useCallback, useMemo, useEffect } from 'react';
import { InputValidator, ValidationRule, ValidationResult } from '../utils/validation';

export interface SecureFormField {
  value: string;
  error: string;
  touched: boolean;
  isValidating: boolean;
}

export interface SecureFormConfig<T extends Record<string, string>> {
  initialValues: T;
  validationRules?: Partial<Record<keyof T, ValidationRule[]>>;
  sanitizeFields?: Partial<Record<keyof T, boolean>>;
  onSubmit: (values: T, sanitizedValues: T) => void | Promise<void>;
  onValidationChange?: (isValid: boolean, errors: Record<keyof T, string[]>) => void;
}

export const useSecureForm = <T extends Record<string, string>>({
  initialValues,
  validationRules = {},
  sanitizeFields = {},
  onSubmit,
  onValidationChange,
}: SecureFormConfig<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string[]>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isValidating, setIsValidating] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastValidationTime, setLastValidationTime] = useState<number>(0);

  // Debounced validation to avoid excessive validation calls
  const validationDelay = 300; // ms

  // Update field value with sanitization
  const setValue = useCallback((field: keyof T, value: string) => {
    const shouldSanitize = sanitizeFields[field] !== false; // Default to true
    const processedValue = shouldSanitize ? InputValidator.sanitizeInput(value) : value;
    
    setValues(prev => ({ ...prev, [field]: processedValue }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: [] }));
    }
  }, [errors, sanitizeFields]);

  // Mark field as touched
  const setTouchedField = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  // Validate a single field
  const validateField = useCallback(async (field: keyof T, value: string): Promise<string[]> => {
    const rules = validationRules[field];
    if (!rules) return [];

    setIsValidating(prev => ({ ...prev, [field]: true }));
    
    try {
      const errors: string[] = [];
      
      for (const rule of rules) {
        if (!rule.test(value)) {
          errors.push(rule.message);
        }
      }
      
      return errors;
    } finally {
      setIsValidating(prev => ({ ...prev, [field]: false }));
    }
  }, [validationRules]);

  // Debounced validation for real-time feedback
  const debouncedValidation = useCallback(async () => {
    const now = Date.now();
    if (now - lastValidationTime < validationDelay) return;
    
    setLastValidationTime(now);
    
    const newErrors: Partial<Record<keyof T, string[]>> = {};
    let hasErrors = false;

    for (const [key, value] of Object.entries(values)) {
      const fieldKey = key as keyof T;
      const fieldErrors = await validateField(fieldKey, value);
      
      if (fieldErrors.length > 0) {
        newErrors[fieldKey] = fieldErrors;
        hasErrors = true;
      }
    }

    setErrors(newErrors);
    
    // Notify parent component of validation state
    if (onValidationChange) {
      const allErrors: Record<keyof T, string[]> = {} as Record<keyof T, string[]>;
      Object.keys(values).forEach(key => {
        allErrors[key as keyof T] = newErrors[key as keyof T] || [];
      });
      onValidationChange(!hasErrors, allErrors);
    }
  }, [values, validateField, lastValidationTime, onValidationChange]);

  // Trigger validation when values change
  useEffect(() => {
    const timer = setTimeout(debouncedValidation, validationDelay);
    return () => clearTimeout(timer);
  }, [debouncedValidation]);

  // Validate all fields immediately
  const validateAll = useCallback(async (): Promise<boolean> => {
    const newErrors: Partial<Record<keyof T, string[]>> = {};
    let isValid = true;

    for (const [key, value] of Object.entries(values)) {
      const fieldKey = key as keyof T;
      const fieldErrors = await validateField(fieldKey, value);
      
      if (fieldErrors.length > 0) {
        newErrors[fieldKey] = fieldErrors;
        isValid = false;
      }
    }

    setErrors(newErrors);
    
    // Notify parent component of validation state
    if (onValidationChange) {
      const allErrors: Record<keyof T, string[]> = {} as Record<keyof T, string[]>;
      Object.keys(values).forEach(key => {
        allErrors[key as keyof T] = newErrors[key as keyof T] || [];
      });
      onValidationChange(isValid, allErrors);
    }

    return isValid;
  }, [values, validateField, onValidationChange]);

  // Handle form submission with security checks
  const handleSubmit = useCallback(async () => {
    if (!(await validateAll())) {
      // Mark all fields as touched to show errors
      const allTouched: Partial<Record<keyof T, boolean>> = {};
      Object.keys(values).forEach((key) => {
        allTouched[key as keyof T] = true;
      });
      setTouched(allTouched);
      return;
    }

    setIsSubmitting(true);
    try {
      // Create sanitized version of values for submission
      const sanitizedValues: T = {} as T;
      Object.keys(values).forEach((key) => {
        const fieldKey = key as keyof T;
        const shouldSanitize = sanitizeFields[fieldKey] !== false;
        sanitizedValues[fieldKey] = shouldSanitize 
          ? InputValidator.sanitizeInput(values[fieldKey])
          : values[fieldKey];
      });

      await onSubmit(values, sanitizedValues);
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateAll, onSubmit, sanitizeFields]);

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsValidating({});
    setIsSubmitting(false);
    setLastValidationTime(0);
  }, [initialValues]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0 || Object.values(errors).every(error => !error || error.length === 0);
  }, [errors]);

  // Check if form has been modified
  const isDirty = useMemo(() => {
    return Object.keys(values).some(key => values[key as keyof T] !== initialValues[key as keyof T]);
  }, [values, initialValues]);

  // Get field validation state
  const getFieldState = useCallback((field: keyof T): SecureFormField => ({
    value: values[field] || '',
    error: (errors[field] && errors[field]!.length > 0) ? errors[field]!.join(', ') : '',
    touched: touched[field] || false,
    isValidating: isValidating[field] || false,
  }), [values, errors, touched, isValidating]);

  // Validate specific field on demand
  const validateSpecificField = useCallback(async (field: keyof T) => {
    const fieldErrors = await validateField(field, values[field] || '');
    setErrors(prev => ({ ...prev, [field]: fieldErrors }));
    return fieldErrors.length === 0;
  }, [validateField, values]);

  return {
    values,
    errors,
    touched,
    isValidating,
    isSubmitting,
    isValid,
    isDirty,
    setValue,
    setTouchedField,
    validateField,
    validateSpecificField,
    validateAll,
    handleSubmit,
    reset,
    getFieldState,
  };
};


