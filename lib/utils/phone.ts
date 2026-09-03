import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string; // E.164 format, e.g. +919876543210
  country?: string;
  error?: string;
}

/**
 * Validates and standardizes a phone number into international E.164 format.
 * Defaults to 'IN' (India) if no country calling code is provided.
 */
export function validateAndFormatPhone(
  rawPhone: string | number | null | undefined,
  defaultCountry: any = 'IN'
): PhoneValidationResult {
  if (!rawPhone) {
    return {
      isValid: false,
      formatted: '',
      error: 'Phone number is required',
    };
  }

  const str = String(rawPhone).trim();

  // Try parsing with libphonenumber-js
  try {
    const parsed = parsePhoneNumberFromString(str, defaultCountry);
    if (parsed && parsed.isValid()) {
      return {
        isValid: true,
        formatted: parsed.format('E.164'),
        country: parsed.country,
      };
    }
  } catch (e) {
    // Fall back to regex
  }

  // Fallback E.164 cleanup: remove spaces, dashes, parentheses
  const cleaned = str.replace(/[\s\-\(\)\.]/g, '');
  
  // If starts with +, check if followed by 8-15 digits
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return {
      isValid: true,
      formatted: cleaned,
    };
  }

  // If 10 digits without leading +, prefix default Indian country code +91
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return {
      isValid: true,
      formatted: `+91${cleaned}`,
      country: 'IN',
    };
  }

  return {
    isValid: false,
    formatted: str,
    error: 'Invalid phone number. Must be valid international E.164 format (e.g. +919876543210)',
  };
}
