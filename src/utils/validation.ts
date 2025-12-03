import { Platform } from 'react-native';

export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue: string;
}

export class InputValidator {
  // Common validation patterns
  private static patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\+]?[1-9][\d]{0,15}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    companyName: /^[a-zA-Z0-9\s\-_&.,()]+$/,
    numeric: /^[0-9]+$/,
    alphanumeric: /^[a-zA-Z0-9\s]+$/,
    url: /^https?:\/\/.+/,
  };

  // Sanitize input to prevent XSS and injection attacks
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      // Remove potentially dangerous characters
      .replace(/[<>]/g, '')
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove HTML entities
      .replace(/&[a-zA-Z]+;/g, '')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Limit length
      .substring(0, 1000);
  }

  // Validate email format
  static validateEmail(email: string): ValidationResult {
    const sanitized = this.sanitizeInput(email);
    const isValid = this.patterns.email.test(sanitized);
    
    return {
      isValid,
      errors: isValid ? [] : ['Please enter a valid email address'],
      sanitizedValue: sanitized,
    };
  }

  // Validate phone number
  static validatePhone(phone: string): ValidationResult {
    const sanitized = this.sanitizeInput(phone);
    const isValid = this.patterns.phone.test(sanitized);
    
    return {
      isValid,
      errors: isValid ? [] : ['Please enter a valid phone number'],
      sanitizedValue: sanitized,
    };
  }

  // Validate password strength
  static validatePassword(password: string): ValidationResult {
    const sanitized = this.sanitizeInput(password);
    const errors: string[] = [];
    
    if (sanitized.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(sanitized)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(sanitized)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(sanitized)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[@$!%*?&]/.test(sanitized)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized,
    };
  }

  // Validate company name
  static validateCompanyName(name: string): ValidationResult {
    const sanitized = this.sanitizeInput(name);
    const isValid = this.patterns.companyName.test(sanitized) && sanitized.length >= 2;
    
    return {
      isValid,
      errors: isValid ? [] : ['Company name must be at least 2 characters and contain only letters, numbers, spaces, and common punctuation'],
      sanitizedValue: sanitized,
    };
  }

  // Validate numeric input
  static validateNumeric(value: string): ValidationResult {
    const sanitized = this.sanitizeInput(value);
    const isValid = this.patterns.numeric.test(sanitized);
    
    return {
      isValid,
      errors: isValid ? [] : ['Please enter only numbers'],
      sanitizedValue: sanitized,
    };
  }

  // Validate alphanumeric input
  static validateAlphanumeric(value: string): ValidationResult {
    const sanitized = this.sanitizeInput(value);
    const isValid = this.patterns.alphanumeric.test(sanitized);
    
    return {
      isValid,
      errors: isValid ? [] : ['Please enter only letters and numbers'],
      sanitizedValue: sanitized,
    };
  }

  // Validate URL
  static validateUrl(url: string): ValidationResult {
    const sanitized = this.sanitizeInput(url);
    const isValid = this.patterns.url.test(sanitized);
    
    return {
      isValid,
      errors: isValid ? [] : ['Please enter a valid URL starting with http:// or https://'],
      sanitizedValue: sanitized,
    };
  }

  // Validate required field
  static validateRequired(value: string, fieldName: string = 'This field'): ValidationResult {
    const sanitized = this.sanitizeInput(value);
    const isValid = sanitized.length > 0;
    
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} is required`],
      sanitizedValue: sanitized,
    };
  }

  // Validate minimum length
  static validateMinLength(value: string, minLength: number, fieldName: string = 'This field'): ValidationResult {
    const sanitized = this.sanitizeInput(value);
    const isValid = sanitized.length >= minLength;
    
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} must be at least ${minLength} characters long`],
      sanitizedValue: sanitized,
    };
  }

  // Validate maximum length
  static validateMaxLength(value: string, maxLength: number, fieldName: string = 'This field'): ValidationResult {
    const sanitized = this.sanitizeInput(value);
    const isValid = sanitized.length <= maxLength;
    
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} must be no more than ${maxLength} characters long`],
      sanitizedValue: sanitized,
    };
  }

  // Validate range (for numbers)
  static validateRange(value: string, min: number, max: number, fieldName: string = 'This field'): ValidationResult {
    const sanitized = this.sanitizeInput(value);
    const numValue = parseFloat(sanitized);
    const isValid = !isNaN(numValue) && numValue >= min && numValue <= max;
    
    return {
      isValid,
      errors: isValid ? [] : [`${fieldName} must be between ${min} and ${max}`],
      sanitizedValue: sanitized,
    };
  }

  // Custom validation with multiple rules
  static validateWithRules(value: string, rules: ValidationRule[]): ValidationResult {
    const sanitized = this.sanitizeInput(value);
    const errors: string[] = [];
    
    for (const rule of rules) {
      if (!rule.test(sanitized)) {
        errors.push(rule.message);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized,
    };
  }

  // Validate XML content for Tally communication
  static validateXmlContent(content: string): ValidationResult {
    const sanitized = this.sanitizeInput(content);
    const errors: string[] = [];
    
    // Check for basic XML structure
    if (!sanitized.includes('<') || !sanitized.includes('>')) {
      errors.push('Content must be valid XML format');
    }
    
    // Check for potentially dangerous XML entities
    if (sanitized.includes('<!DOCTYPE') || sanitized.includes('<!ENTITY')) {
      errors.push('XML content contains potentially dangerous declarations');
    }
    
    // Check for script tags in XML
    if (sanitized.toLowerCase().includes('<script')) {
      errors.push('XML content cannot contain script tags');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: sanitized,
    };
  }

  // Sanitize XML content for Tally
  static sanitizeXmlContent(content: string): string {
    return content
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<!ENTITY[^>]*>/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  // Platform-specific validation
  static validateForPlatform(value: string, platform: 'web' | 'mobile'): ValidationResult {
    const sanitized = this.sanitizeInput(value);
    
    if (platform === 'web') {
      // Additional web-specific validations
      if (sanitized.includes('javascript:') || sanitized.includes('data:')) {
        return {
          isValid: false,
          errors: ['Invalid protocol detected'],
          sanitizedValue: sanitized,
        };
      }
    }
    
    return {
      isValid: true,
      errors: [],
      sanitizedValue: sanitized,
    };
  }
}

// Convenience functions for common validations
export const validateEmail = (email: string) => InputValidator.validateEmail(email);
export const validatePassword = (password: string) => InputValidator.validatePassword(password);
export const validatePhone = (phone: string) => InputValidator.validatePhone(phone);
export const validateCompanyName = (name: string) => InputValidator.validateCompanyName(name);
export const validateRequired = (value: string, fieldName?: string) => InputValidator.validateRequired(value, fieldName);
export const sanitizeInput = (input: string) => InputValidator.sanitizeInput(input);
export const sanitizeXmlContent = (content: string) => InputValidator.sanitizeXmlContent(content);


