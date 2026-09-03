/**
 * Helper to construct official WhatsApp Click-to-Chat (wa.me) links.
 * Format: https://wa.me/<number>?text=<urlencodedtext>
 * 
 * Phone number must be in international format without any leading '+', 
 * dashes, spaces, or parentheses.
 */
export function buildWhatsAppLink(phone: string, message?: string): string {
  if (!phone) return '';

  // Remove any non-digit character (including '+', '(', ')', '-', ' ')
  const cleanNumber = phone.replace(/\D/g, '');

  let url = `https://wa.me/${cleanNumber}`;

  if (message && message.trim().length > 0) {
    url += `?text=${encodeURIComponent(message.trim())}`;
  }

  return url;
}

/**
 * Validates whether a phone number is clean enough for wa.me
 */
export function isValidForWaMe(phone: string): boolean {
  if (!phone) return false;
  const cleanNumber = phone.replace(/\D/g, '');
  // Valid international numbers have between 8 and 15 digits
  return cleanNumber.length >= 8 && cleanNumber.length <= 15;
}
