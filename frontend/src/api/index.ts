export type TransactionType = 'income' | 'expense'
export type RecurringType = 'none' | 'weekly' | 'monthly'

export interface Category {
  id: number
  name: string
  color: string
  type: TransactionType
  is_default: number
}

export interface Transaction {
  id: number
  type: TransactionType
  amount: number
  date: string
  category_id: number
  subcategory_id: number | null
  memo: string | null
  recurring: RecurringType
  auto_generated: number
}

export interface TransactionListResponse {
  items: Transaction[]
  total_income: number
  total_expense: number
  balance: number
}

export interface FilterParams {
  type?: TransactionType
  category_id?: number
  year?: number
  month?: number
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
  return res.json()
}

export async function fetchCategories(): Promise<Category[]> {
  return request<Category[]>('/api/categories')
}

export async function fetchTransactions(params: FilterParams = {}): Promise<TransactionListResponse> {
  const query = new URLSearchParams()
  if (params.type != null) query.set('type', params.type)
  if (params.category_id != null) query.set('category_id', String(params.category_id))
  if (params.year != null) query.set('year', String(params.year))
  if (params.month != null) query.set('month', String(params.month))
  const qs = query.toString()
  return request<TransactionListResponse>(`/api/transactions${qs ? `?${qs}` : ''}`)
}
