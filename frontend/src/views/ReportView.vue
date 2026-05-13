<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  fetchTransactions,
  fetchCategories,
  type Transaction,
  type Category,
  type TransactionType,
} from '../api/index'
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  type ChartData,
  type Plugin,
  type TooltipItem,
} from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import ChartDataLabels from 'chartjs-plugin-datalabels'

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

type PeriodMode = 'month' | 'year'
type BarMode = 'daily' | 'weekly'

const now = new Date()
const todayYear = now.getFullYear()
const todayMonth = now.getMonth() + 1

const periodMode = ref<PeriodMode>('month')
const displayType = ref<TransactionType>('expense')
const selectedYear = ref(todayYear)
const selectedMonth = ref(todayMonth)
const barMode = ref<BarMode>('daily')
const transactions = ref<Transaction[]>([])
const categories = ref<Category[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const categoryMap = computed(() => {
  const map = new Map<number, Category>()
  for (const cat of categories.value) map.set(cat.id, cat)
  return map
})

const yearOptions = computed(() => {
  const years: number[] = []
  for (let y = todayYear - 3; y <= todayYear + 1; y++) years.push(y)
  return years
})

const monthOptions = Array.from({ length: 12 }, (_, i) => ({ title: `${i + 1}月`, value: i + 1 }))

const totalAmount = computed(() => transactions.value.reduce((sum, tx) => sum + tx.amount, 0))

// 対象月の実日数（月別モード用）
const daysInMonth = computed(() => new Date(selectedYear.value, selectedMonth.value, 0).getDate())

// ドーナツグラフ用データ
const donutChartData = computed((): ChartData<'doughnut'> => {
  const catTotals = new Map<number, number>()
  for (const tx of transactions.value) {
    catTotals.set(tx.category_id, (catTotals.get(tx.category_id) ?? 0) + tx.amount)
  }

  const labels: string[] = []
  const data: number[] = []
  const backgroundColor: string[] = []

  for (const [catId, amount] of [...catTotals.entries()].sort((a, b) => b[1] - a[1])) {
    const cat = categoryMap.value.get(catId)
    labels.push(cat?.name ?? '不明なカテゴリ')
    data.push(amount)
    backgroundColor.push(cat?.color ?? '#9e9e9e')
  }

  return { labels, datasets: [{ data, backgroundColor, borderWidth: 1 }] }
})

// ドーナツ中央テキストプラグイン
const centerTextPlugin: Plugin<'doughnut'> = {
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, chartArea } = chart
    if (!chartArea) return
    const { left, right, top, bottom } = chartArea
    const centerX = (left + right) / 2
    const centerY = (top + bottom) / 2
    ctx.save()
    ctx.font = 'bold 15px sans-serif'
    ctx.fillStyle = '#555'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`¥${totalAmount.value.toLocaleString()}`, centerX, centerY)
    ctx.restore()
  },
}

const donutChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { position: 'bottom' as const },
    tooltip: {
      callbacks: {
        label: (ctx: TooltipItem<'doughnut'>) =>
          `${ctx.label}: ¥${(ctx.parsed as number).toLocaleString()}`,
      },
    },
    datalabels: {
      color: '#fff',
      font: { weight: 'bold' as const, size: 11 },
      textAlign: 'center' as const,
      // 10% 未満のスライスはラベル非表示
      formatter: (value: number, ctx: { chart: Chart; dataIndex: number }) => {
        const total = (ctx.chart.data.datasets[0].data as number[]).reduce(
          (s, v) => s + (v ?? 0),
          0,
        )
        const pct = total > 0 ? (value / total) * 100 : 0
        if (pct < 10) return null
        const label = ctx.chart.data.labels?.[ctx.dataIndex] ?? ''
        return `${label}\n${Math.round(pct)}%`
      },
    },
  },
}))

// 棒グラフ用データ（periodMode × barMode で切り替え）
const barChartData = computed((): ChartData<'bar'> => {
  if (periodMode.value === 'year') {
    // 年別モード: 1〜12月集計
    const months = new Array(12).fill(0)
    for (const tx of transactions.value) {
      const m = parseInt(tx.date.slice(5, 7), 10) - 1
      if (m >= 0 && m < 12) months[m] += tx.amount
    }
    return {
      labels: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
      datasets: [{ label: '金額', data: months, backgroundColor: '#8b5cf6' }],
    }
  }

  if (barMode.value === 'weekly') {
    // 月別・週別モード（簡易週：1〜7日=第1週、8〜14日=第2週、…（暦週ではない））
    const weeks = [0, 0, 0, 0, 0]
    for (const tx of transactions.value) {
      const day = parseInt(tx.date.slice(8, 10), 10)
      const weekIdx = Math.min(Math.ceil(day / 7) - 1, 4)
      weeks[weekIdx] += tx.amount
    }
    return {
      labels: ['第1週', '第2週', '第3週', '第4週', '第5週'],
      datasets: [{ label: '金額', data: weeks, backgroundColor: '#10b981' }],
    }
  }

  // 月別・日別モード（対象月の実日数を使用）
  const days = daysInMonth.value
  const amounts = new Array(days).fill(0)
  for (const tx of transactions.value) {
    const day = parseInt(tx.date.slice(8, 10), 10)
    if (day >= 1 && day <= days) amounts[day - 1] += tx.amount
  }
  return {
    labels: Array.from({ length: days }, (_, i) => `${i + 1}日`),
    datasets: [{ label: '金額', data: amounts, backgroundColor: '#4f6ef7' }],
  }
})

const barChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: TooltipItem<'bar'>) => `¥${(ctx.parsed.y ?? 0).toLocaleString()}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: string | number) => `¥${Number(value).toLocaleString()}`,
      },
    },
  },
}))

async function loadData() {
  loading.value = true
  errorMessage.value = null
  try {
    const params = {
      year: selectedYear.value,
      type: displayType.value,
      ...(periodMode.value === 'month' ? { month: selectedMonth.value } : {}),
    }
    const [txRes, catRes] = await Promise.all([fetchTransactions(params), fetchCategories()])
    transactions.value = txRes.items
    categories.value = catRes
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
watch([periodMode, displayType, selectedYear, selectedMonth], loadData)

function formatAmount(n: number) {
  return `¥${n.toLocaleString()}`
}

// CSVエクスポート
// 全フィールドをダブルクォートで囲み、" は "" にエスケープ、改行は除去
function escapeCsvField(value: string | number): string {
  const str = String(value).replace(/\n/g, ' ').replace(/"/g, '""')
  return `"${str}"`
}

function exportCsv() {
  const headers = ['日付', '区分', 'カテゴリ', 'メモ', '金額']
  const rows = transactions.value.map(tx => {
    const cat = categoryMap.value.get(tx.category_id)
    return [
      tx.date,
      tx.type === 'income' ? '収入' : '支出',
      cat?.name ?? '不明なカテゴリ',
      tx.memo ?? '',
      tx.amount,
    ]
  })

  const csvContent = [headers, ...rows]
    .map(row => row.map(escapeCsvField).join(','))
    .join('\r\n')

  const bom = '﻿'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const suffix =
    periodMode.value === 'month'
      ? `${selectedYear.value}_${String(selectedMonth.value).padStart(2, '0')}`
      : `${selectedYear.value}`
  a.download = `report_${suffix}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <v-container fluid class="pa-4">
    <!-- タイトル + CSVエクスポート -->
    <div class="d-flex align-center justify-space-between mb-4">
      <h2 class="text-h5">グラフ・レポート</h2>
      <v-btn
        prepend-icon="mdi-download"
        variant="tonal"
        density="compact"
        :disabled="totalAmount === 0"
        @click="exportCsv"
      >
        CSVエクスポート
      </v-btn>
    </div>

    <!-- コントロールバー -->
    <div class="d-flex flex-wrap align-center ga-2 mb-4">
      <v-btn-toggle v-model="periodMode" mandatory density="compact" color="primary">
        <v-btn value="month">月別</v-btn>
        <v-btn value="year">年別</v-btn>
      </v-btn-toggle>

      <v-btn-toggle v-model="displayType" mandatory density="compact" color="secondary">
        <v-btn value="expense">支出</v-btn>
        <v-btn value="income">収入</v-btn>
      </v-btn-toggle>

      <v-select
        v-model="selectedYear"
        :items="yearOptions"
        density="compact"
        hide-details
        style="max-width: 110px"
      />

      <v-select
        v-if="periodMode === 'month'"
        v-model="selectedMonth"
        :items="monthOptions"
        density="compact"
        hide-details
        style="max-width: 100px"
      />
    </div>

    <!-- ローディング -->
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <!-- エラー -->
    <v-alert v-if="errorMessage" type="error" density="compact" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <!-- グラフエリア -->
    <v-row>
      <!-- ドーナツグラフ -->
      <v-col cols="12" md="5">
        <v-card variant="outlined">
          <v-card-title class="text-subtitle-1 font-weight-bold pa-3">カテゴリ別内訳</v-card-title>
          <v-card-text>
            <div style="position: relative; height: 300px">
              <Doughnut
                v-if="totalAmount > 0"
                :data="donutChartData"
                :options="donutChartOptions"
                :plugins="[centerTextPlugin, ChartDataLabels]"
              />
              <div
                v-else
                class="d-flex align-center justify-center text-medium-emphasis text-body-2"
                style="height: 100%"
              >
                データがありません
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 棒グラフ -->
      <v-col cols="12" md="7">
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center justify-space-between pa-3">
            <span class="text-subtitle-1 font-weight-bold">推移</span>
            <v-btn-toggle
              v-if="periodMode === 'month'"
              v-model="barMode"
              mandatory
              density="compact"
              color="primary"
              size="small"
            >
              <v-btn value="daily">日別</v-btn>
              <v-btn value="weekly">週別</v-btn>
            </v-btn-toggle>
          </v-card-title>
          <v-card-text>
            <div style="height: 300px">
              <Bar
                v-if="totalAmount > 0"
                :data="barChartData"
                :options="barChartOptions"
              />
              <div
                v-else
                class="d-flex align-center justify-center text-medium-emphasis text-body-2"
                style="height: 100%"
              >
                データがありません
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 合計金額サマリー（グラフの補助表示） -->
    <div v-if="totalAmount > 0" class="text-right text-body-2 text-medium-emphasis mt-2">
      表示中の{{ displayType === 'expense' ? '支出' : '収入' }}合計：{{ formatAmount(totalAmount) }}
    </div>
  </v-container>
</template>
