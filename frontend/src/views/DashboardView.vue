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

type PeriodMode = 'currentMonth' | 'currentWeek' | 'currentYear' | 'month' | 'year'

const now = new Date()
const todayYear = now.getFullYear()
const todayMonth = now.getMonth() + 1
// 簡易週：1〜7日=第1週、8〜14日=第2週、15〜21日=第3週、22〜28日=第4週、29日〜月末=第5週
const todayWeek = Math.min(Math.ceil(now.getDate() / 7), 5)

const periodMode = ref<PeriodMode>('currentMonth')
const selectedYear = ref(todayYear)
const selectedMonth = ref(todayMonth)

const txData = ref<TransactionListResponse | null>(null)
const categories = ref<Category[]>([])
const budgetRows = ref<MonthlyBudgetRow[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const isMonthMode = computed(
  () =>
    periodMode.value === 'currentMonth' ||
    periodMode.value === 'currentWeek' ||
    periodMode.value === 'month'
)

const apiYear = computed(() =>
  periodMode.value === 'currentMonth' || periodMode.value === 'currentYear'
    ? todayYear
    : selectedYear.value
)

const apiMonth = computed<number | undefined>(() => {
  if (periodMode.value === 'currentMonth' || periodMode.value === 'currentWeek') return todayMonth
  if (periodMode.value === 'month') return selectedMonth.value
  return undefined
})

const apiWeek = computed<number | undefined>(() =>
  periodMode.value === 'currentWeek' ? todayWeek : undefined
)

async function loadData() {
  loading.value = true
  errorMessage.value = null
  try {
    const params: { year: number; month?: number; week?: number } = { year: apiYear.value }
    if (apiMonth.value != null) params.month = apiMonth.value
    if (apiWeek.value != null) params.week = apiWeek.value

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

const apiParams = computed(() => ({ year: apiYear.value, month: apiMonth.value, week: apiWeek.value }))

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


const yearOptions = computed(() => {
  const years: number[] = []
  for (let y = todayYear - 3; y <= todayYear + 1; y++) years.push(y)
  return years
})

const monthOptions = Array.from({ length: 12 }, (_, i) => ({ title: `${i + 1}月`, value: i + 1 }))

const dateRangeText = computed(() => {
  const y = apiYear.value
  const m = apiMonth.value
  if (periodMode.value === 'currentWeek') {
    const startDay = (todayWeek - 1) * 7 + 1
    const lastDay = new Date(y, m!, 0).getDate()
    const endDay = todayWeek === 5 ? lastDay : todayWeek * 7
    return `${y}年${m}月${startDay}日 〜 ${m}月${endDay}日`
  } else if (m != null) {
    const lastDay = new Date(y, m, 0).getDate()
    return `${y}年${m}月1日 〜 ${m}月${lastDay}日`
  } else {
    return `${y}年1月1日 〜 ${y}年12月31日`
  }
})

interface CategoryRow {
  type: 'income' | 'expense'
  name: string
  color: string
  amount: number
  ratio: string
}

const categoryRows = computed((): CategoryRow[] => {
  if (!txData.value) return []
  const expenseTotal = txData.value.total_expense
  const incomeTotal = txData.value.total_income

  const map = new Map<string, { type: 'income' | 'expense'; catId: number; amount: number }>()
  for (const item of txData.value.items) {
    const key = `${item.type}:${item.category_id}`
    const existing = map.get(key)
    if (existing) {
      existing.amount += item.amount
    } else {
      map.set(key, { type: item.type as 'income' | 'expense', catId: item.category_id, amount: item.amount })
    }
  }

  return [...map.values()]
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'expense' ? -1 : 1
      return b.amount - a.amount
    })
    .map(({ type, catId, amount }) => {
      const cat = categoryMap.value.get(catId)
      const total = type === 'expense' ? expenseTotal : incomeTotal
      return {
        type,
        name: cat?.name ?? '不明なカテゴリ',
        color: cat?.color ?? '#9e9e9e',
        amount,
        ratio: total > 0 ? `${Math.round((amount / total) * 100)}%` : '—',
      }
    })
})

function formatAmount(n: number) {
  return `¥${n.toLocaleString()}`
}
</script>

<template>
  <v-container fluid class="pa-4">
    <!-- ヘッダー：タイトル左 + 期間ボタン右（日付範囲はボタン下に右寄せ） -->
    <div class="d-flex align-start justify-space-between flex-wrap ga-2 mb-4">
      <h2 class="text-h5">ダッシュボード</h2>
      <div class="d-flex flex-column align-end ga-1">
        <div class="d-flex flex-wrap align-center ga-2">
          <v-btn-toggle v-model="periodMode" mandatory density="compact" color="primary">
            <v-btn value="currentMonth">今月</v-btn>
            <v-btn value="currentWeek">今週</v-btn>
            <v-btn value="currentYear">今年</v-btn>
            <v-btn value="month">月選択</v-btn>
            <v-btn value="year">年選択</v-btn>
          </v-btn-toggle>
          <template v-if="periodMode === 'month'">
            <v-select v-model="selectedYear" :items="yearOptions" density="compact" hide-details style="max-width: 110px" />
            <v-select v-model="selectedMonth" :items="monthOptions" density="compact" hide-details style="max-width: 100px" />
          </template>
          <template v-else-if="periodMode === 'year'">
            <v-select v-model="selectedYear" :items="yearOptions" density="compact" hide-details style="max-width: 110px" />
          </template>
        </div>
        <div class="text-body-2 text-medium-emphasis">{{ dateRangeText }}</div>
      </div>
    </div>

    <!-- ローディング -->
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <!-- エラー -->
    <v-alert v-if="errorMessage" type="error" density="compact" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <!-- 予算超過アラート（月単位モードのみ） -->
    <v-alert v-if="budgetAlert" type="warning" density="compact" icon="mdi-alert" class="mb-4">
      支出が予算を超過しています
    </v-alert>

    <!-- サマリーカード -->
    <v-row v-if="txData" class="mb-6">
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="green">
          <v-card-text class="text-center">
            <div class="text-caption mb-1">収入合計</div>
            <div class="text-h5 font-weight-bold text-green">{{ formatAmount(txData.total_income) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="tonal" color="red">
          <v-card-text class="text-center">
            <div class="text-caption mb-1">支出合計</div>
            <div class="text-h5 font-weight-bold text-red">{{ formatAmount(txData.total_expense) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="tonal" :color="txData.balance >= 0 ? 'indigo' : 'orange'">
          <v-card-text class="text-center">
            <div class="text-caption mb-1">残高</div>
            <div class="text-h5 font-weight-bold" :class="txData.balance >= 0 ? 'text-indigo' : 'text-orange'">
              {{ formatAmount(txData.balance) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- カテゴリ別内訳（支出・収入統合） -->
    <div v-if="txData">
      <h3 class="text-subtitle-1 font-weight-bold mb-2">カテゴリ別内訳</h3>
      <v-table v-if="categoryRows.length > 0" density="compact" hover>
        <thead>
          <tr>
            <th>区分</th>
            <th>カテゴリ</th>
            <th class="text-right">金額</th>
            <th class="text-right">割合</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in categoryRows" :key="`${row.type}:${row.name}`">
            <td>
              <v-chip size="small" :color="row.type === 'income' ? 'green' : 'red'" variant="tonal">
                {{ row.type === 'income' ? '収入' : '支出' }}
              </v-chip>
            </td>
            <td>
              <div class="d-flex align-center ga-2">
                <span :style="{ background: row.color, width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', flexShrink: '0' }" />
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
