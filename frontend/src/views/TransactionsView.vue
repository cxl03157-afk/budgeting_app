<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  fetchCategories,
  fetchTransactions,
  type Category,
  type Transaction,
  type TransactionListResponse,
  type TransactionType,
  type FilterParams,
} from '../api/index'

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

const tableHeaders = [
  { title: '日付', key: 'date', sortable: true },
  { title: '区分', key: 'type', sortable: false },
  { title: 'カテゴリ', key: 'category_id', sortable: false },
  { title: 'メモ', key: 'memo', sortable: false },
  { title: '金額', key: 'amount', sortable: true, align: 'end' as const },
]

const tableItems = computed(() =>
  [...result.value.items].sort((a, b) => b.date.localeCompare(a.date))
)
</script>

<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h5 mb-4">収支一覧</h2>

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
    </v-data-table>
  </v-container>
</template>
