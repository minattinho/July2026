export type AccountType = 'checking' | 'savings' | 'credit' | 'investment'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryType = 'income' | 'expense' | 'both'
export type ImportStatus = 'pending' | 'done' | 'error'
export type FileType = 'ofx' | 'csv'

export interface Account {
  id: string
  user_id: string
  name: string
  bank_name: string | null
  account_type: AccountType
  currency: string
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  slug: string
  color: string
  icon: string | null
  type: CategoryType
  created_at: string
}

export interface Import {
  id: string
  user_id: string
  account_id: string | null
  file_name: string
  file_type: FileType
  status: ImportStatus
  total_rows: number | null
  imported_rows: number | null
  skipped_rows: number | null
  error_message: string | null
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  import_id: string | null
  amount: number
  type: TransactionType
  description: string
  notes: string | null
  date: string
  ofx_fitid: string | null
  checknum: string | null
  is_reconciled: boolean
  created_at: string
  updated_at: string
  // Joined fields (optional on base type)
  account?: Pick<Account, 'id' | 'name' | 'color'> | null
  category?: Pick<Category, 'id' | 'name' | 'color' | 'icon'> | null
}

export interface TransactionWithRelations extends Omit<Transaction, 'account' | 'category'> {
  account: Pick<Account, 'id' | 'name' | 'color'>
  category: Pick<Category, 'id' | 'name' | 'color' | 'icon'> | null
}
