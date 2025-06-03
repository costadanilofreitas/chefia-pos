/**
 * Utility functions for formatting values
 */

/**
 * Format a number as currency (BRL)
 * @param {number} value - The value to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Format a date and time
 * @param {Date|string|number} date - The date to format
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

/**
 * Format a date only
 * @param {Date|string|number} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
};

/**
 * Format a time only
 * @param {Date|string|number} date - The date to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

/**
 * Format a phone number
 * @param {string} phone - The phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format according to Brazilian phone number pattern
  if (cleaned.length === 11) {
    // Mobile with area code: (XX) XXXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    // Landline with area code: (XX) XXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  
  // Return original if not matching expected patterns
  return phone;
};

/**
 * Format a document number (CPF/CNPJ)
 * @param {string} doc - The document number to format
 * @returns {string} Formatted document number
 */
export const formatDocument = (doc) => {
  if (!doc) return '';
  
  // Remove non-numeric characters
  const cleaned = doc.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    // CPF: XXX.XXX.XXX-XX
    return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-${cleaned.substring(9)}`;
  } else if (cleaned.length === 14) {
    // CNPJ: XX.XXX.XXX/XXXX-XX
    return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5, 8)}/${cleaned.substring(8, 12)}-${cleaned.substring(12)}`;
  }
  
  // Return original if not matching expected patterns
  return doc;
};
