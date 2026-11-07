/**
 * Formats a phone number for the WhatsApp API.
 * Removes all non-digit characters and ensures it starts with a country code.
 * If the number is 10 digits, it defaults to prefixing '91' (India).
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it's 10 digits, assume India (+91)
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  return cleaned;
};

/**
 * Constructs a WhatsApp API URL.
 * @param phone The recipient's phone number.
 * @param text The message content.
 * @returns A full WhatsApp API URL.
 */
export const getWhatsAppUrl = (phone?: string, text?: string): string => {
  const baseUrl = 'https://api.whatsapp.com/send';
  const params = new URLSearchParams();
  
  if (phone) {
    params.append('phone', formatPhoneNumber(phone));
  }
  
  if (text) {
    params.append('text', text);
  }
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};
