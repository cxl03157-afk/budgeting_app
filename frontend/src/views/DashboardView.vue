<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  fetchTransactions,
  fetchCategories,
  fetchBudgets,
  type Category,
  type TransactionListResponse,
  type MonthlyBudgetRow,
} from '../api/index'

type PeriodMode = 'currentMonth' | 'currentYear' | 'month' | 'year'

const now = new Date()
const todayYear = now.getFullYear()
const todayMonth = now.getMonth() + 1

const periodMode = ref<PeriodMode>('currentMonth')
const selectedYear = ref(todayYear)
const selectedMonth = ref(todayMonth)

const txData = ref<TransactionListResponse | null>(null)
const categories = ref<Category[]>([])
const budgetRows = ref<MonthlyBudgetRow[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const categoryTab = ref<'expense' | 'income'>('expense')

const isMonthMode = computed(
  () => periodMode.value === 'currentMonth' || periodMode.value === 'month'
)

const apiYear = computed(() =>
  periodMode.value === 'currentMonth' || periodMode.value === 'currentYear'
    ? todayYear
    : selectedYear.value
)

const apiMonth = computed<number | undefined>(() => {
  if (periodMode.value === 'currentMonth') return todayMonth
  if (periodMode.value === 'month') return selectedMonth.value
  return undefined
})

async function loadData() {
  loading.value = true
  errorMessage.value = null
  try {
    const params: { year: number; month?: number } = { year: apiYear.value }
    if (apiMonth.value != null) params.month = apiMonth.value

    // NOTE: カテゴリ集計は現在フロントエンドで行っているが、データ量増加時は
    // GET /summary/monthly?year= のようなバックエンド集計APIへの切り替えを検討すること
    const [txRes, catRes, budgetRes] = await Promise.all([
      fetchTransactions(params),
      fetchCategories(),
      isMonthMode.value ? fetchBudgets(apiYear.value) : Promise.resolve<MonthlyBudgetRow[]>([]),
    ])
    txData.value = txRes
    categories.value = catRes
    budgetRows.value = budgetRes
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '取得に失敗しました'
  } finally {
    loading.value = false
  }
}

const apiParams = computed(() => ({ year: apiYear.value, month: apiMonth.value }))

onMounted(loadData)
watch(apiParams, loadData, { deep: true })

const categoryMap = computed(() => {
  const map = new Map<number, Category>()
  for (const cat of categories.value) map.set(cat.id, cat)
  return map
})

const budgetAlert = computed(() => {
  if (!isMonthMode.value || !txData.value) return null
  const month = apiMonth.value!
  const row = budgetRows.value.find(r => r.month === month)
  if (!row || row.amount === null) return null
  const expense = txData.value.total_expense
  if (expense <= row.amount) return null
  return { expense, budget: row.amount, year: apiYear.value, month }
})

interface CategoryRow {
  name: string
  color: string
  amount: number
  ratio: string
}

const categoryRows = computed((): CategoryRow[] => {
  if (!txData.value) return []
  const items = txData.value.items.filter(t => t.type === categoryTab.value)
  const total =
    categoryTab.value === 'expense' ? txData.value.total_expense : txData.value.total_income

  const map = new Map<number, number>()
  for (const item of items) {
    map.set(item.category_id, (map.get(item.category_id) ?? 0) + item.amount)
  }

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, amount]) => {
      const cat = categoryMap.value.get(id)
      return {
        name: cat?.name ?? '不明なカテゴリ',
        color: cat?.color ?? '#9e9e9e',
        amount,
        ratio: total > 0 ? `${Math.round((amount / total) * 100)}%` : '—',
      }
    })
})

const yearOptions = computed(() => {
  const years: number[] = []
  for (let y = todayYear - 3; y <= todayYear + 1; y++) years.push(y)
  return years
})

const monthOptions = Array.from({ length: 12 }, (_, i) => ({ title: `${i + 1}月`, value: i + 1 }))

function formatAmount(n: number) {
  return `¥${n.toLocaleString()}`
}
</script>

<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h5 mb-4">ダッシュボード</h2>

    <!-- 期間セレクター -->
    <div class="d-flex flex-wrap align-center ga-2 mb-4">
      <v-btn-toggle v-model="periodMode" mandatory density="compact" color="primary">
        <v-btn value="currentMonth">今月</v-btn>
        <v-btn value="currentYear">今年</v-btn>
        <v-btn value="month">月選択</v-btn>
        <v-btn value="year">年選択</v-btn>
      </v-btn-toggle>

      <template v-if="periodMode === 'month'">
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          density="compact"
          hide-details
          style="max-width: 110px"
        />
        <v-select
          v-model="selectedMonth"
          :items="monthOptions"
          density="compact"
          hide-details
          style="max-width: 100px"
        />
      </template>
      <template v-else-if="periodMode === 'year'">
        <v-select
          v-model="selectedYear"
          :items="yearOptions"
          density="compact"
          hide-details
          style="max-width: 110px"
        />
      </template>
    </div>

    <!-- ローディング -->
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <!-- エラー -->
    <v-alert v-if="errorMessage" type="error" density="compact" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <!-- 予算超過アラート（月単位モードのみ） -->
    <v-alert
      v-if="budgetAlert"
      type="warning"
      density="compact"
      icon="mdi-alert"
      class="mb-4"
    >
      {{ budgetAlert.year }}年{{ budgetAlert.month }}月の支出が予算を超過しています
      （支出 {{ formatAmount(budgetAlert.expense) }} / 予算 {{ formatAmount(budgetAlert.budget) }}）
    </v-alert>

    <!-- サマリーカード -->
    <v-row v-if="txData" class="mb-6">
      <v-col cols="12" sm="4">
        <v-card variant="outlined">
          <v-card-text class="text-center">
            <div class="text-caption text-medium-emphasis mb-1">収入合計</div>
            <div class="text-h5 font-weight-bold text-green">
              {{ formatAmount(txData.total_income) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="outlined">
          <v-card-text class="text-center">
            <div class="text-caption text-medium-emphasis mb-1">支出合計</div>
            <div class="text-h5 font-weight-bold text-red">
              {{ formatAmount(txData.total_expense) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="outlined">
          <v-card-text class="text-center">
            <div class="text-caption text-medium-emphasis mb-1">残高</div>
            <div
              class="text-h5 font-weight-bold"
              :class="txData.balance >= 0 ? 'text-green' : 'text-red'"
            >
              {{ formatAmount(txData.balance) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- カテゴリ別内訳 -->
    <div v-if="txData">
      <h3 class="text-subtitle-1 font-weight-bold mb-2">カテゴリ別内訳</h3>
      <v-btn-toggle v-model="categoryTab" mandatory density="compact" color="primary" class="mb-3">
        <v-btn value="expense">支出</v-btn>
        <v-btn value="income">収入</v-btn>
      </v-btn-toggle>

      <v-table v-if="categoryRows.length > 0" density="compact" hover>
        <thead>
          <tr>
            <th>カテゴリ</th>
            <th class="text-right">金額</th>
            <th class="text-right">割合</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in categoryRows" :key="row.name">
            <td>
              <div class="d-flex align-center ga-2">
                <span
                  :style="{ background: row.color, width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', flexShrink: '0' }"
                />
                {{ row.name }}
              </div>
            </td>
            <td class="text-right">{{ formatAmount(row.amount) }}</td>
            <td class="text-right">{{ row.ratio }}</td>
          </tr>
        </tbody>
      </v-table>
      <p v-else class="text-medium-emphasis text-body-2 mt-2">データがありません</p>
    </div>
  </v-container>
</template>
