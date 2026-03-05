import Papa from 'papaparse'
import { parse as dateParse, isValid } from 'date-fns'
import type { CsvColumnMapping, ParsedTransaction, ParseResult } from './types'

const DATE_FORMATS = [
  'dd/MM/yyyy',
  'dd/MM/yy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'dd-MM-yyyy',
  'yyyy/MM/dd',
  'd/M/yyyy',
]

/**
 * Try to parse a date string against multiple formats.
 * Returns ISO date string or null if all formats fail.
 */
function tryParseDate(raw: string): string | null {
  const cleaned = raw.trim()
  for (const fmt of DATE_FORMATS) {
    const d = dateParse(cleaned, fmt, new Date())
    if (isValid(d) && d.getFullYear() > 1970) {
      const yyyy = d.getFullYear()
      const mm   = String(d.getMonth() + 1).padStart(2, '0')
      const dd   = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
  }
  return null
}

/**
 * Normalize a Brazilian-formatted number string to a JS number.
 * Handles formats like: "1.234,56" → 1234.56 | "1234.56" → 1234.56 | "-150,00" → -150
 */
function parseAmount(raw: string): number | null {
  let s = raw.trim()
    .replace(/R\$\s*/g, '')  // remove currency symbol
    .replace(/\s/g, '')       // remove spaces

  // Detect format: if last separator is ',' and there are dots before it → Brazilian format
  const lastComma = s.lastIndexOf(',')
  const lastDot   = s.lastIndexOf('.')

  if (lastComma > lastDot) {
    // Brazilian: 1.234,56
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    // International: 1,234.56 — strip commas
    s = s.replace(/,/g, '')
  }

  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

/**
 * Parse CSV file content and return headers + raw rows for preview.
 * Does NOT apply any mapping — returns raw strings.
 */
export function parseCsvPreview(content: string): {
  headers: string[]
  rows: Record<string, string>[]
  error?: string
} {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (result.errors.length > 0 && result.data.length === 0) {
    return { headers: [], rows: [], error: result.errors[0].message }
  }

  const headers = result.meta.fields ?? []
  const rows = result.data.slice(0, 20) as Record<string, string>[] // preview: first 20 rows

  return { headers, rows }
}

/**
 * Apply a column mapping to all raw CSV rows and return ParsedTransactions.
 */
export function applyCsvMapping(
  content: string,
  mapping: CsvColumnMapping
): ParseResult {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const transactions: ParsedTransaction[] = []
  const errors: string[] = []
  const warnings: string[] = []

  result.data.forEach((row, idx) => {
    const rowNum = idx + 2 // 1-indexed + header row

    // Date
    const rawDate = row[mapping.date]?.trim()
    if (!rawDate) {
      errors.push(`Linha ${rowNum}: data ausente`)
      return
    }
    const date = tryParseDate(rawDate)
    if (!date) {
      errors.push(`Linha ${rowNum}: data inválida "${rawDate}"`)
      return
    }

    // Description
    const description = row[mapping.description]?.trim() || 'Sem descrição'

    // Amount
    let amount: number | null = null

    if (mapping.amount) {
      amount = parseAmount(row[mapping.amount] ?? '')
    } else if (mapping.debit || mapping.credit) {
      const debit  = mapping.debit  ? parseAmount(row[mapping.debit]  ?? '') : null
      const credit = mapping.credit ? parseAmount(row[mapping.credit] ?? '') : null

      if (debit && Math.abs(debit) > 0) {
        amount = -Math.abs(debit)  // debit = expense → negative
      } else if (credit && Math.abs(credit) > 0) {
        amount = Math.abs(credit)  // credit = income → positive
      }
    }

    if (amount === null || isNaN(amount)) {
      errors.push(`Linha ${rowNum}: valor inválido`)
      return
    }

    const type: ParsedTransaction['type'] =
      amount > 0 ? 'income' : amount < 0 ? 'expense' : 'transfer'

    const notes = mapping.notes ? row[mapping.notes]?.trim() : undefined

    transactions.push({ date, description, amount, type, notes })
  })

  if (result.errors.length > 0) {
    result.errors.forEach((e) => warnings.push(`Aviso CSV: ${e.message}`))
  }

  return { transactions, errors, warnings }
}
