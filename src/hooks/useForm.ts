import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

export interface FormField {
  value: string;
  error: string;
  touched: boolean;
}

export interface UseFormProps<T extends Record<string, string>> {
  initialValues: T;
  validationRules?: Partial<Record<keyof T, ValidationRule[]>>;
  onSubmit: (values: T) => void | Promise<void>;
}

export const useForm = <T extends Record<string, string>>({
  initialValues,
  validationRules = {},
  onSubmit,
}: UseFormProps<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update field value
  const setValue = useCallback((field: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Mark field as touched
  const setTouchedField = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  // Validate a single field
  const validateField = useCallback((field: keyof T, value: string): string => {
    const rules = validationRules[field];
    if (!rules) return '';

    for (const rule of rules) {
      if (!rule.test(value)) {
        return rule.message;
      }
    }
    return '';
  }, [validationRules]);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(values).forEach((key) => {
      const fieldKey = key as keyof T;
      const value = values[fieldKey];
      const error = validateField(fieldKey, value);
      
      if (error) {
        newErrors[fieldKey] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateAll()) {
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
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateAll, onSubmit]);

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0 || Object.values(errors).every(error => !error);
  }, [errors]);

  // Check if form has been modified
  const isDirty = useMemo(() => {
    return Object.keys(values).some(key => values[key as keyof T] !== initialValues[key as keyof T]);
  }, [values, initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setValue,
    setTouchedField,
    validateField,
    handleSubmit,
    reset,
  };
};


