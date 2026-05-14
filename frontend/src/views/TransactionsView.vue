<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  fetchCategoriesWithSubs,
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type CategoryWithSubs,
  type Transaction,
  type TransactionListResponse,
  type TransactionType,
  type RecurringType,
  type FilterParams,
  type PeriodMode,
} from '../api/index'

// --- 一覧表示 ---
const categories = ref<CategoryWithSubs[]>([])
const result = ref<TransactionListResponse>({ items: [], total_income: 0, total_expense: 0, balance: 0 })
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const now = new Date()
const todayYear = now.getFullYear()
const todayMonth = now.getMonth() + 1

const filterType = ref<TransactionType | null>(null)
const filterCategoryId = ref<number | null>(null)
const filterYear = ref<number | null>(null)
const filterMonth = ref<number | null>(null)
const filterPeriodMode = ref<PeriodMode>('monthly')
const filterSubcategoryId = ref<number | null>(null)
const filterWeek = ref<number | null>(null)

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map((c) => [c.id, c]))
)

const typeOptions = [
  { title: 'すべて', value: null },
  { title: '収入のみ', value: 'income' },
  { title: '支出のみ', value: 'expense' },
]
const periodModeOptions: { title: string; value: PeriodMode }[] = [
  { title: '月別', value: 'monthly' },
  { title: '週別', value: 'weekly' },
  { title: '年別', value: 'yearly' },
]
const categoryOptions = computed(() => [
  { title: 'すべて', value: null },
  ...categories.value
    .filter(c => filterType.value == null || c.type === filterType.value)
    .map((c) => ({ title: c.name, value: c.id })),
])
const yearOptions = [
  { title: 'すべて', value: null },
  ...[2024, 2025, 2026].map((y) => ({ title: String(y), value: y })),
]
const monthOptions = [
  { title: 'すべて', value: null },
  ...[...Array(12)].map((_, i) => ({ title: `${i + 1}月`, value: i + 1 })),
]
const weekOptions = [
  { title: '第1週（1〜7日）',   value: 1 },
  { title: '第2週（8〜14日）',  value: 2 },
  { title: '第3週（15〜21日）', value: 3 },
  { title: '第4週（22〜28日）', value: 4 },
  { title: '第5週（29日〜月末）', value: 5 },
]

const filterSubcategoryOptions = computed(() => {
  if (filterCategoryId.value == null) return []
  const cat = categories.value.find(c => c.id === filterCategoryId.value)
  return cat?.subcategories.map(s => ({ title: s.name, value: s.id })) ?? []
})

async function loadTransactions() {
  loading.value = true
  errorMessage.value = null
  try {
    const params: FilterParams = {}
    if (filterType.value != null) params.type = filterType.value
    if (filterCategoryId.value != null) params.category_id = filterCategoryId.value
    if (filterSubcategoryId.value != null) params.subcategory_id = filterSubcategoryId.value
    if (filterYear.value != null) params.year = filterYear.value
    if (filterMonth.value != null && filterPeriodMode.value !== 'yearly') params.month = filterMonth.value
    if (filterWeek.value != null && filterPeriodMode.value === 'weekly') params.week = filterWeek.value
    result.value = await fetchTransactions(params)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '取得に失敗しました'
  } finally {
    loading.value = false
  }
}

watch(filterType, () => {
  filterCategoryId.value = null
  filterSubcategoryId.value = null
})

watch(filterCategoryId, () => { filterSubcategoryId.value = null })

watch(filterPeriodMode, (newMode) => {
  if (newMode === 'yearly') {
    filterMonth.value = null
    filterWeek.value = null
  } else if (newMode === 'weekly') {
    if (filterYear.value == null) filterYear.value = todayYear
    if (filterMonth.value == null) filterMonth.value = todayMonth
    filterWeek.value = null
  } else {
    filterWeek.value = null
  }
})

watch(
  [filterType, filterCategoryId, filterSubcategoryId, filterYear, filterMonth, filterWeek, filterPeriodMode],
  () => loadTransactions()
)

onMounted(async () => {
  categories.value = await fetchCategoriesWithSubs()
  await loadTransactions()
})

function formatDate(d: string) {
  return d.replace(/-/g, '/')
}
function formatAmount(amount: number) {
  return `¥${amount.toLocaleString()}`
}
function formatAmountSigned(amount: number, type: string) {
  return type === 'income' ? `+¥${amount.toLocaleString()}` : `−¥${amount.toLocaleString()}`
}

function openDelete(tx: Transaction) {
  editingId.value = tx.id
  showDeleteConfirm.value = true
}
function today() {
  return new Date().toISOString().slice(0, 10)
}

const tableHeaders = [
  { title: '日付', key: 'date', sortable: true },
  { title: '区分', key: 'type', sortable: false },
  { title: 'カテゴリ', key: 'category_id', sortable: false },
  { title: 'サブカテゴリ', key: 'subcategory_id', sortable: false },
  { title: 'メモ', key: 'memo', sortable: false },
  { title: '金額', key: 'amount', sortable: true, align: 'end' as const },
  { title: '操作', key: 'actions', sortable: false, align: 'center' as const },
]
const tableItems = computed(() =>
  [...result.value.items].sort((a, b) => b.date.localeCompare(a.date))
)

// --- 登録 / 編集モーダル ---
const showDialog = ref(false)
const saving = ref(false)
const formError = ref<string | null>(null)
const editingId = ref<number | null>(null)
const isEditMode = computed(() => editingId.value !== null)

const initialForm = () => ({
  type: 'expense' as TransactionType,
  amount: '' as string | number,
  date: today(),
  category_id: null as number | null,
  subcategory_id: null as number | null,
  memo: '',
  recurring: 'none' as RecurringType,
})
const form = ref(initialForm())

const recurringOptions = [
  { title: 'なし', value: 'none' },
  { title: '毎週', value: 'weekly' },
  { title: '毎月', value: 'monthly' },
]

function getSubcategoryName(subcategoryId: number | null): string {
  if (subcategoryId == null) return '—'
  for (const cat of categories.value) {
    const sub = cat.subcategories.find(s => s.id === subcategoryId)
    if (sub) return sub.name
  }
  return '不明なサブカテゴリ'
}

function onTypeToggle() {
  form.value.category_id = null
  form.value.subcategory_id = null
}

function onCategoryChange() {
  form.value.subcategory_id = null
}

const formCategoryOptions = computed(() =>
  categories.value
    .filter((c) => c.type === form.value.type)
    .map((c) => ({ title: c.name, value: c.id }))
)

const formSubcategoryOptions = computed(() => {
  if (form.value.category_id == null) return []
  const cat = categories.value.find(c => c.id === form.value.category_id)
  return cat?.subcategories.map(s => ({ title: s.name, value: s.id })) ?? []
})

function openDialog(tx?: Transaction) {
  editingId.value = tx?.id ?? null
  form.value = tx
    ? {
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        category_id: tx.category_id,
        subcategory_id: tx.subcategory_id,
        memo: tx.memo ?? '',
        recurring: tx.recurring,
      }
    : initialForm()
  formError.value = null
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  editingId.value = null
  formError.value = null
  form.value = initialForm()
}

// --- 削除 ---
const showDeleteConfirm = ref(false)

async function confirmDelete() {
  if (editingId.value === null) return
  saving.value = true
  try {
    await deleteTransaction(editingId.value)
    showDeleteConfirm.value = false
    closeDialog()
    await loadTransactions()
    snackbarMessage.value = '削除しました'
    snackbar.value = true
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '削除に失敗しました'
    showDeleteConfirm.value = false
  } finally {
    saving.value = false
  }
}

async function submitForm() {
  const amount = Number(form.value.amount)
  if (!amount || amount <= 0) {
    formError.value = '金額は1円以上を入力してください'
    return
  }
  if (!form.value.category_id) {
    formError.value = 'カテゴリを選択してください'
    return
  }

  saving.value = true
  formError.value = null
  const payload = {
    type: form.value.type,
    amount,
    date: form.value.date,
    category_id: Number(form.value.category_id),
    subcategory_id: form.value.subcategory_id ?? null,
    memo: form.value.memo || undefined,
    recurring: form.value.recurring,
  }
  try {
    if (isEditMode.value) {
      if (editingId.value === null) return
      await updateTransaction(editingId.value, payload)
      snackbarMessage.value = '更新しました'
    } else {
      await createTransaction(payload)
      snackbarMessage.value = '登録しました'
    }
    closeDialog()
    await loadTransactions()
    snackbar.value = true
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '保存に失敗しました'
  } finally {
    saving.value = false
  }
}

function resetFilters() {
  filterType.value = null
  filterCategoryId.value = null
  filterSubcategoryId.value = null
  filterYear.value = todayYear
  filterMonth.value = todayMonth
  filterWeek.value = null
  filterPeriodMode.value = 'monthly'
}

// --- 成功通知 ---
const snackbar = ref(false)
const snackbarMessage = ref('')
</script>

<template>
  <v-container fluid class="pa-4">
    <!-- ヘッダー -->
    <div class="d-flex align-center justify-space-between mb-4">
      <h2 class="text-h5">収支一覧</h2>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openDialog()">
        新規登録
      </v-btn>
    </div>

    <!-- フィルターバー（1行） -->
    <div class="d-flex flex-wrap align-center ga-2 mb-4">
      <v-select
        v-model="filterType"
        :items="typeOptions"
        item-title="title"
        item-value="value"
        label="区分"
        density="compact"
        hide-details
        style="max-width: 140px"
      />
      <v-select
        v-model="filterCategoryId"
        :items="categoryOptions"
        item-title="title"
        item-value="value"
        label="カテゴリ"
        density="compact"
        hide-details
        style="max-width: 180px"
      />
      <v-select
        v-if="filterSubcategoryOptions.length > 0"
        v-model="filterSubcategoryId"
        :items="[{ title: 'すべて', value: null }, ...filterSubcategoryOptions]"
        item-title="title"
        item-value="value"
        label="サブカテゴリ"
        density="compact"
        hide-details
        style="max-width: 180px"
      />
      <v-select
        v-model="filterPeriodMode"
        :items="periodModeOptions"
        item-title="title"
        item-value="value"
        label="集計期間"
        density="compact"
        hide-details
        style="max-width: 130px"
      />
      <v-select
        v-model="filterYear"
        :items="yearOptions"
        item-title="title"
        item-value="value"
        label="年"
        density="compact"
        hide-details
        style="max-width: 120px"
      />
      <v-select
        v-if="filterPeriodMode !== 'yearly'"
        v-model="filterMonth"
        :items="monthOptions"
        item-title="title"
        item-value="value"
        label="月"
        density="compact"
        hide-details
        style="max-width: 140px"
      />
      <v-select
        v-if="filterPeriodMode === 'weekly'"
        v-model="filterWeek"
        :items="weekOptions"
        item-title="title"
        item-value="value"
        label="週"
        density="compact"
        hide-details
        style="max-width: 180px"
      />
      <v-btn variant="text" density="compact" color="primary" @click="resetFilters">リセット</v-btn>
    </div>

    <!-- エラー表示 -->
    <v-alert v-if="errorMessage" type="error" class="mb-4" density="compact">
      {{ errorMessage }}
    </v-alert>

    <!-- サマリーテキスト -->
    <div class="d-flex ga-4 mb-4 text-body-2">
      <span class="text-green font-weight-medium">収入: {{ formatAmount(result.total_income) }}</span>
      <span class="text-red font-weight-medium">支出: {{ formatAmount(result.total_expense) }}</span>
      <span :class="result.balance >= 0 ? 'text-blue' : 'text-orange'" class="font-weight-medium">
        残高: {{ formatAmount(result.balance) }}
      </span>
    </div>

    <!-- 収支テーブル -->
    <v-data-table
      :headers="tableHeaders"
      :items="tableItems"
      :loading="loading"
      loading-text="読み込み中..."
      no-data-text="該当する収支データがありません"
      items-per-page="25"
    >
      <template #item.date="{ item }">
        {{ formatDate((item as Transaction).date) }}
      </template>

      <template #item.type="{ item }">
        <v-chip
          size="small"
          :color="(item as Transaction).type === 'income' ? 'green' : 'red'"
          variant="tonal"
        >
          {{ (item as Transaction).type === 'income' ? '収入' : '支出' }}
        </v-chip>
      </template>

      <template #item.category_id="{ item }">
        <span class="d-flex align-center ga-1">
          <span
            class="rounded-circle d-inline-block"
            :style="{
              width: '10px',
              height: '10px',
              backgroundColor: categoryMap[(item as Transaction).category_id]?.color ?? '#ccc',
            }"
          />
          {{ categoryMap[(item as Transaction).category_id]?.name ?? '—' }}
        </span>
      </template>

      <template #item.subcategory_id="{ item }">
        {{ getSubcategoryName((item as Transaction).subcategory_id) }}
      </template>

      <template #item.memo="{ item }">
        {{ (item as Transaction).memo ?? '—' }}
      </template>

      <template #item.amount="{ item }">
        <span
          class="font-weight-medium"
          :class="(item as Transaction).type === 'income' ? 'text-green' : 'text-red'"
        >
          {{ formatAmountSigned((item as Transaction).amount, (item as Transaction).type) }}
        </span>
      </template>

      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" @click="openDialog(item as Transaction)" />
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openDelete(item as Transaction)" />
      </template>
    </v-data-table>

    <!-- 登録 / 編集モーダル -->
    <v-dialog v-model="showDialog" max-width="480" persistent>
      <v-card>
        <v-card-title class="pt-4 px-6">
          {{ isEditMode ? '収支を編集' : '収支を登録' }}
        </v-card-title>
        <v-card-text class="px-6">
          <!-- 区分トグル -->
          <div class="mb-4">
            <div class="text-caption mb-1">区分</div>
            <v-btn-toggle v-model="form.type" mandatory density="compact" color="primary" @update:model-value="onTypeToggle">
              <v-btn value="expense">支出</v-btn>
              <v-btn value="income">収入</v-btn>
            </v-btn-toggle>
          </div>

          <!-- 金額 -->
          <v-text-field
            v-model="form.amount"
            label="金額（円）"
            type="number"
            min="1"
            prefix="¥"
            density="compact"
            class="mb-3"
            hide-details="auto"
          />

          <!-- 日付 -->
          <v-text-field
            v-model="form.date"
            label="日付"
            type="date"
            density="compact"
            class="mb-3"
            hide-details="auto"
          />

          <!-- カテゴリ -->
          <v-select
            v-model="form.category_id"
            :items="formCategoryOptions"
            item-title="title"
            item-value="value"
            label="カテゴリ"
            density="compact"
            class="mb-3"
            hide-details="auto"
            @update:model-value="onCategoryChange"
          />

          <!-- サブカテゴリ -->
          <v-select
            v-if="formSubcategoryOptions.length > 0"
            v-model="form.subcategory_id"
            :items="[{ title: 'なし', value: null }, ...formSubcategoryOptions]"
            item-title="title"
            item-value="value"
            label="サブカテゴリ（任意）"
            density="compact"
            class="mb-3"
            hide-details="auto"
          />

          <!-- メモ -->
          <v-text-field
            v-model="form.memo"
            label="メモ（任意）"
            maxlength="100"
            density="compact"
            class="mb-3"
            hide-details="auto"
          />

          <!-- フォームエラー -->
          <v-alert v-if="formError" type="error" density="compact" class="mt-4">
            {{ formError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-btn
            v-if="isEditMode"
            color="error"
            variant="text"
            :loading="saving"
            :disabled="saving"
            @click="showDeleteConfirm = true"
          >
            削除
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeDialog" :disabled="saving">キャンセル</v-btn>
          <v-btn color="primary" variant="flat" @click="submitForm" :loading="saving">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 削除確認ダイアログ -->
    <v-dialog v-model="showDeleteConfirm" max-width="360">
      <v-card>
        <v-card-title class="pt-4 px-6">削除の確認</v-card-title>
        <v-card-text class="px-6">
          この収支を削除してもよろしいですか？<br>この操作は元に戻せません。
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="showDeleteConfirm = false">キャンセル</v-btn>
          <v-btn color="error" variant="flat" :loading="saving" :disabled="saving" @click="confirmDelete">削除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 成功スナックバー -->
    <v-snackbar v-model="snackbar" color="success" timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>
