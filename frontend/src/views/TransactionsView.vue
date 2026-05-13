<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  fetchCategories,
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type Category,
  type Transaction,
  type TransactionListResponse,
  type TransactionType,
  type RecurringType,
  type FilterParams,
} from '../api/index'

// --- 一覧表示 ---
const categories = ref<Category[]>([])
const result = ref<TransactionListResponse>({ items: [], total_income: 0, total_expense: 0, balance: 0 })
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const filterType = ref<TransactionType | null>(null)
const filterCategoryId = ref<number | null>(null)
const filterYear = ref<number | null>(null)
const filterMonth = ref<number | null>(null)

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map((c) => [c.id, c]))
)

const typeOptions = [
  { title: 'すべて', value: null },
  { title: '収入のみ', value: 'income' },
  { title: '支出のみ', value: 'expense' },
]
const categoryOptions = computed(() => [
  { title: 'すべて', value: null },
  ...categories.value.map((c) => ({ title: c.name, value: c.id })),
])
const yearOptions = [
  { title: 'すべて', value: null },
  ...[2024, 2025, 2026].map((y) => ({ title: String(y), value: y })),
]
const monthOptions = [
  { title: 'すべて', value: null },
  ...[...Array(12)].map((_, i) => ({ title: `${i + 1}月`, value: i + 1 })),
]

async function loadTransactions() {
  loading.value = true
  errorMessage.value = null
  try {
    const params: FilterParams = {}
    if (filterType.value != null) params.type = filterType.value
    if (filterCategoryId.value != null) params.category_id = filterCategoryId.value
    if (filterYear.value != null) params.year = filterYear.value
    if (filterMonth.value != null) params.month = filterMonth.value
    result.value = await fetchTransactions(params)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '取得に失敗しました'
  } finally {
    loading.value = false
  }
}

watch([filterType, filterCategoryId, filterYear, filterMonth], () => loadTransactions())

onMounted(async () => {
  categories.value = await fetchCategories()
  await loadTransactions()
})

function formatDate(d: string) {
  return d.replace(/-/g, '/')
}
function formatAmount(amount: number) {
  return `¥${amount.toLocaleString()}`
}
function today() {
  return new Date().toISOString().slice(0, 10)
}

const tableHeaders = [
  { title: '日付', key: 'date', sortable: true },
  { title: '区分', key: 'type', sortable: false },
  { title: 'カテゴリ', key: 'category_id', sortable: false },
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

function onTypeToggle() {
  form.value.category_id = null
}

const formCategoryOptions = computed(() =>
  categories.value
    .filter((c) => c.type === form.value.type)
    .map((c) => ({ title: c.name, value: c.id }))
)

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

    <!-- フィルターバー -->
    <v-row dense class="mb-4">
      <v-col cols="12" sm="3">
        <v-select
          v-model="filterType"
          :items="typeOptions"
          item-title="title"
          item-value="value"
          label="区分"
          density="compact"
          hide-details
          clearable
        />
      </v-col>
      <v-col cols="12" sm="3">
        <v-select
          v-model="filterCategoryId"
          :items="categoryOptions"
          item-title="title"
          item-value="value"
          label="カテゴリ"
          density="compact"
          hide-details
          clearable
        />
      </v-col>
      <v-col cols="12" sm="3">
        <v-select
          v-model="filterYear"
          :items="yearOptions"
          item-title="title"
          item-value="value"
          label="年"
          density="compact"
          hide-details
          clearable
        />
      </v-col>
      <v-col cols="12" sm="3">
        <v-select
          v-model="filterMonth"
          :items="monthOptions"
          item-title="title"
          item-value="value"
          label="月"
          density="compact"
          hide-details
          clearable
        />
      </v-col>
    </v-row>

    <!-- エラー表示 -->
    <v-alert v-if="errorMessage" type="error" class="mb-4" density="compact">
      {{ errorMessage }}
    </v-alert>

    <!-- サマリーカード -->
    <v-row dense class="mb-4">
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="green">
          <v-card-text class="text-center">
            <div class="text-caption">収入合計</div>
            <div class="text-h6 font-weight-bold text-green">
              {{ formatAmount(result.total_income) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="red">
          <v-card-text class="text-center">
            <div class="text-caption">支出合計</div>
            <div class="text-h6 font-weight-bold text-red">
              {{ formatAmount(result.total_expense) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="tonal" :color="result.balance >= 0 ? 'blue' : 'orange'">
          <v-card-text class="text-center">
            <div class="text-caption">残高</div>
            <div
              class="text-h6 font-weight-bold"
              :class="result.balance >= 0 ? 'text-blue' : 'text-orange'"
            >
              {{ formatAmount(result.balance) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

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

      <template #item.memo="{ item }">
        {{ (item as Transaction).memo ?? '—' }}
      </template>

      <template #item.amount="{ item }">
        <span
          class="font-weight-medium"
          :class="(item as Transaction).type === 'income' ? 'text-green' : 'text-red'"
        >
          {{ formatAmount((item as Transaction).amount) }}
        </span>
      </template>

      <template #item.actions="{ item }">
        <v-btn
          icon="mdi-pencil"
          size="small"
          variant="text"
          @click="openDialog(item as Transaction)"
        />
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

          <!-- 繰り返し -->
          <v-select
            v-model="form.recurring"
            :items="recurringOptions"
            item-title="title"
            item-value="value"
            label="繰り返し"
            density="compact"
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
