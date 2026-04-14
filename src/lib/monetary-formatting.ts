/**
 * Centralized monetary formatting utilities
 * Handles Brazilian currency format: R$ 1.234,56
 */

/**
 * Format input value to Brazilian monetary format for display
 * Accepts string like "123456" or "1234,56" and returns "1.234,56"
 */
export function formatMonetaryInput(value: string): string {
  if (!value) return ""

  // Remove all non-digit and non-comma characters
  const cleaned = value.replace(/[^\d,]/g, "")

  if (!cleaned) return ""

  // Split by comma to separate integer and decimal parts
  const parts = cleaned.split(",")
  const integerPart = parts[0]
  const decimalPart = parts[1] || ""

  // Format integer part with thousands separator (ponto)
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  // Limit decimal part to 2 digits (centavos)
  const limitedDecimal = decimalPart.slice(0, 2)

  // Combine with comma separator (vírgula para centavos)
  return limitedDecimal ? `${formattedInteger},${limitedDecimal}` : formattedInteger
}

/**
 * Parse display value back to numeric value
 * Takes "1.234,56" and returns "1234.56" for computation
 */
export function parseMonetaryInput(value: string): string {
  if (!value) return "0"

  // Remove thousands separator (ponto)
  const withoutThousands = value.replace(/\./g, "")

  // Replace decimal separator (vírgula) with dot for computation
  const numeric = withoutThousands.replace(",", ".")

  return numeric
}

/**
 * Format numeric value to display format
 * Takes 1234.56 and returns "1.234,56"
 */
export function formatCurrencyDisplay(value: number): string {
  if (isNaN(value) || value === undefined || value === null) return "0,00"

  // Convert to string with 2 decimal places
  const stringValue = Math.abs(value).toFixed(2)

  // Replace dot with comma for decimal separator
  const withComma = stringValue.replace(".", ",")

  // Add thousands separator
  const parts = withComma.split(",")
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  const decimalPart = parts[1]

  return `${integerPart},${decimalPart}`
}

/**
 * Validate if value exceeds maximum
 * Returns { isValid: boolean, error?: string }
 */
export function validateMonetaryValue(value: string, maxValue: number = 999_999_999.99): { isValid: boolean; error?: string } {
  if (!value) return { isValid: true }

  const numeric = parseFloat(parseMonetaryInput(value))

  if (isNaN(numeric)) {
    return { isValid: false, error: "Valor inválido" }
  }

  if (numeric > maxValue) {
    return {
      isValid: false,
      error: `Valor excede o máximo permitido de R$ ${formatCurrencyDisplay(maxValue)}`,
    }
  }

  return { isValid: true }
}

/**
 * Get numeric value for API/storage
 */
export function getNumericValue(displayValue: string): number {
  if (!displayValue) return 0
  return parseFloat(parseMonetaryInput(displayValue))
}
