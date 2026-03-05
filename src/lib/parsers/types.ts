export interface ParsedTransaction {
  date: string          // ISO date string YYYY-MM-DD
  description: string
  amount: number        // positive = income/credit, negative = expense/debit
  type: 'income' | 'expense' | 'transfer'
  notes?: string
  ofx_fitid?: string    // OFX unique transaction ID
  checknum?: string
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  accountInfo?: {
    bankId?: string
    accountId?: string
    currency?: string
  }
  errors: string[]
  warnings: string[]
}

export interface CsvColumnMapping {
  date: string
  description: string
  amount?: string        // single amount column
  debit?: string         // separate debit column (positive value = expense)
  credit?: string        // separate credit column (positive value = income)
  notes?: string
  dateFormat?: string    // hint for date parsing
}
