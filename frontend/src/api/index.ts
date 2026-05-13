export type TransactionType = 'income' | 'expense'
export type RecurringType = 'none' | 'weekly' | 'monthly'

export interface Category {
  id: number
  name: string
  color: string
  type: TransactionType
  is_default: number
}

export interface Subcategory {
  id: number
  name: string
}

export interface CategoryWithSubs extends Category {
  subcategories: Subcategory[]
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

export async function fetchCategoriesWithSubs(): Promise<CategoryWithSubs[]> {
  return request<CategoryWithSubs[]>('/api/categories?with_subcategories=true')
}

export async function createCategory(data: {
  name: string
  color: string
  type: TransactionType
}): Promise<Category> {
  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `API error: ${res.status}`)
  }
  return res.json()
}

export async function deleteCategory(id: number): Promise<void> {
  const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `API error: ${res.status}`)
  }
}

export async function createSubcategory(categoryId: number, name: string): Promise<Subcategory> {
  const res = await fetch(`/api/categories/${categoryId}/subcategories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `API error: ${res.status}`)
  }
  return res.json()
}

export async function deleteSubcategory(categoryId: number, subId: number): Promise<void> {
  const res = await fetch(`/api/categories/${categoryId}/subcategories/${subId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `API error: ${res.status}`)
  }
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

export interface TransactionCreateInput {
  type: TransactionType
  amount: number
  date: string
  category_id: number
  memo?: string
  recurring: RecurringType
}

export async function deleteTransaction(id: number): Promise<void> {
  // 204 No Content のためレスポンスボディは読まない
  const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `API error: ${res.status}`)
  }
}

export async function updateTransaction(id: number, data: TransactionCreateInput): Promise<Transaction> {
  const res = await fetch(`/api/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `API error: ${res.status}`)
  }
  return res.json()
}

export async function createTransaction(data: TransactionCreateInput): Promise<Transaction> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `API error: ${res.status}`)
  }
  return res.json()
}

// --- 予算 ---

export interface Budget {
  id: number
  year: number
  month: number
  amount: number
}

export interface MonthlyBudgetRow {
  month: number
  budget_id: number | null
  amount: number | null
  actual_expense: number
}

export async function fetchBudgets(year: number): Promise<MonthlyBudgetRow[]> {
  return request<MonthlyBudgetRow[]>(`/api/budgets?year=${year}`)
}

export async function createBudget(data: {
  year: number
  month: number
  amount: number
}): Promise<Budget> {
  const res = await fetch('/api/budgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `API error: ${res.status}`)
  }
  return res.json()
}

export async function updateBudget(id: number, amount: number): Promise<Budget> {
  const res = await fetch(`/api/budgets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `API error: ${res.status}`)
  }
  return res.json()
}

export async function deleteBudget(id: number): Promise<void> {
  const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `API error: ${res.status}`)
  }
}
