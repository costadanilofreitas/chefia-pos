/**
 * Validation utilities for data integrity
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationRule<T> {
  test: (value: T) => boolean;
  message: string;
}

/**
 * Generic validator class
 */
export class Validator<T> {
  private rules: ValidationRule<T>[] = [];

  addRule(test: (value: T) => boolean, message: string): this {
    this.rules.push({ test, message });
    return this;
  }

  required(message = 'Campo obrigatório'): this {
    return this.addRule(
      value => value !== null && value !== undefined && value !== '',
      message
    );
  }

  validate(value: T): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of this.rules) {
      if (!rule.test(value)) {
        errors.push(rule.message);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * String validator
 */
export class StringValidator extends Validator<string> {
  minLength(length: number, message?: string): this {
    return this.addRule(
      value => !value || value.length >= length,
      message || `Mínimo de ${length} caracteres`
    );
  }

  maxLength(length: number, message?: string): this {
    return this.addRule(
      value => !value || value.length <= length,
      message || `Máximo de ${length} caracteres`
    );
  }

  email(message = 'Email inválido'): this {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.addRule(
      value => !value || emailRegex.test(value),
      message
    );
  }

  cpf(message = 'CPF inválido'): this {
    return this.addRule(
      value => !value || isValidCPF(value),
      message
    );
  }

  cnpj(message = 'CNPJ inválido'): this {
    return this.addRule(
      value => !value || isValidCNPJ(value),
      message
    );
  }

  phone(message = 'Telefone inválido'): this {
    const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
    return this.addRule(
      value => !value || phoneRegex.test(value),
      message
    );
  }
}

/**
 * Number validator
 */
export class NumberValidator extends Validator<number> {
  min(minValue: number, message?: string): this {
    return this.addRule(
      value => value === null || value === undefined || value >= minValue,
      message || `Valor mínimo: ${minValue}`
    );
  }

  max(maxValue: number, message?: string): this {
    return this.addRule(
      value => value === null || value === undefined || value <= maxValue,
      message || `Valor máximo: ${maxValue}`
    );
  }

  positive(message = 'Deve ser positivo'): this {
    return this.addRule(
      value => value === null || value === undefined || value > 0,
      message
    );
  }

  integer(message = 'Deve ser um número inteiro'): this {
    return this.addRule(
      value => value === null || value === undefined || Number.isInteger(value),
      message
    );
  }
}

/**
 * Object validator
 */
export class ObjectValidator<T extends Record<string, unknown>> {
  private fieldValidators: Map<keyof T, Validator<unknown>> = new Map();

  field<K extends keyof T>(name: K, validator: Validator<T[K]>): this {
    this.fieldValidators.set(name, validator);
    return this;
  }

  validate(obj: T): ValidationResult {
    const errors: string[] = [];
    
    for (const [field, validator] of this.fieldValidators) {
      const result = validator.validate(obj[field]);
      if (!result.valid) {
        errors.push(...result.errors.map(error => `${String(field)}: ${error}`));
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * CPF validation
 */
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  
  let digit = 11 - (sum % 11);
  if (digit === 10 || digit === 11) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  
  digit = 11 - (sum % 11);
  if (digit === 10 || digit === 11) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

/**
 * CNPJ validation
 */
function isValidCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights1[i];
  }
  
  let digit = sum % 11;
  digit = digit < 2 ? 0 : 11 - digit;
  if (digit !== parseInt(cnpj.charAt(12))) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights2[i];
  }
  
  digit = sum % 11;
  digit = digit < 2 ? 0 : 11 - digit;
  if (digit !== parseInt(cnpj.charAt(13))) return false;
  
  return true;
}

/**
 * Factory functions for common validators
 */
export const validators = {
  string: () => new StringValidator(),
  number: () => new NumberValidator(),
  object: <T extends Record<string, unknown>>() => new ObjectValidator<T>(),
  
  // Pre-configured validators
  email: () => new StringValidator().required().email(),
  cpf: () => new StringValidator().required().cpf(),
  cnpj: () => new StringValidator().required().cnpj(),
  phone: () => new StringValidator().required().phone(),
  money: () => new NumberValidator().required().min(0).positive(),
  quantity: () => new NumberValidator().required().min(1).integer()
};