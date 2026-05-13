<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import {
  fetchBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  type MonthlyBudgetRow,
} from '../api/index'

const selectedYear = ref(new Date().getFullYear())
const rows = ref<MonthlyBudgetRow[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)

async function loadBudgets() {
  loading.value = true
  errorMessage.value = null
  try {
    rows.value = await fetchBudgets(selectedYear.value)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(loadBudgets)
watch(selectedYear, loadBudgets)

function formatAmount(amount: number) {
  return `¥${amount.toLocaleString()}`
}

function calcRate(amount: number, actual: number): number {
  return Math.round((actual / amount) * 100)
}

function calcDiff(amount: number, actual: number): number {
  return amount - actual
}

// --- 設定・編集ダイアログ ---
const showDialog = ref(false)
const dialogRow = ref<MonthlyBudgetRow | null>(null)
const formAmount = ref<string | number>('')
const formError = ref<string | null>(null)
const saving = ref(false)

const isEditMode = ref(false)

function openDialog(row: MonthlyBudgetRow) {
  dialogRow.value = row
  isEditMode.value = row.budget_id !== null
  formAmount.value = row.amount ?? ''
  formError.value = null
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  dialogRow.value = null
  formError.value = null
  formAmount.value = ''
}

async function submitForm() {
  const amount = Number(formAmount.value)
  if (!amount || amount <= 0) {
    formError.value = '金額は1円以上を入力してください'
    return
  }
  if (!dialogRow.value) return

  saving.value = true
  formError.value = null
  try {
    if (isEditMode.value && dialogRow.value.budget_id !== null) {
      await updateBudget(dialogRow.value.budget_id, amount)
      showSnackbar('予算を更新しました')
    } else {
      await createBudget({ year: selectedYear.value, month: dialogRow.value.month, amount })
      showSnackbar('予算を設定しました')
    }
    closeDialog()
    await loadBudgets()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '保存に失敗しました'
  } finally {
    saving.value = false
  }
}

// --- 削除確認ダイアログ ---
const showDeleteConfirm = ref(false)
const deleteTargetRow = ref<MonthlyBudgetRow | null>(null)
const deleteLoading = ref(false)
const deleteError = ref<string | null>(null)

function openDeleteConfirm(row: MonthlyBudgetRow) {
  deleteTargetRow.value = row
  deleteError.value = null
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTargetRow.value?.budget_id) return
  deleteLoading.value = true
  deleteError.value = null
  try {
    await deleteBudget(deleteTargetRow.value.budget_id)
    showDeleteConfirm.value = false
    deleteTargetRow.value = null
    await loadBudgets()
    showSnackbar('予算を削除しました')
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : '削除に失敗しました'
  } finally {
    deleteLoading.value = false
  }
}

// --- スナックバー ---
const snackbar = ref(false)
const snackbarMessage = ref('')

function showSnackbar(msg: string) {
  snackbarMessage.value = msg
  snackbar.value = true
}
</script>

<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h5 mb-4">予算管理</h2>

    <!-- 年切り替え -->
    <div class="d-flex align-center ga-2 mb-4">
      <v-btn icon="mdi-chevron-left" variant="text" @click="selectedYear--" />
      <span class="text-h6 font-weight-medium" style="min-width: 80px; text-align: center">
        {{ selectedYear }}年
      </span>
      <v-btn icon="mdi-chevron-right" variant="text" @click="selectedYear++" />
    </div>

    <!-- エラー -->
    <v-alert v-if="errorMessage" type="error" density="compact" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <!-- テーブル -->
    <v-table :loading="loading" hover>
      <thead>
        <tr>
          <th>月</th>
          <th class="text-right">予算</th>
          <th class="text-right">実績支出</th>
          <th class="text-right">差額</th>
          <th style="min-width: 160px">達成率</th>
          <th class="text-center">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.month">
          <!-- 月 -->
          <td>{{ row.month }}月</td>

          <!-- 予算 -->
          <td class="text-right">
            <span v-if="row.amount !== null">{{ formatAmount(row.amount) }}</span>
            <span v-else class="text-medium-emphasis text-caption">未設定</span>
          </td>

          <!-- 実績支出 -->
          <td class="text-right">{{ formatAmount(row.actual_expense) }}</td>

          <!-- 差額 -->
          <td class="text-right">
            <span
              v-if="row.amount !== null"
              :class="calcDiff(row.amount, row.actual_expense) >= 0 ? 'text-green' : 'text-red'"
              class="font-weight-medium"
            >
              {{ calcDiff(row.amount, row.actual_expense) >= 0 ? '+' : '' }}{{ formatAmount(calcDiff(row.amount, row.actual_expense)) }}
            </span>
            <span v-else class="text-medium-emphasis">—</span>
          </td>

          <!-- 達成率 -->
          <td>
            <div v-if="row.amount !== null" class="d-flex align-center ga-2">
              <v-progress-linear
                :model-value="Math.min(calcRate(row.amount, row.actual_expense), 100)"
                :color="calcRate(row.amount, row.actual_expense) > 100 ? 'red' : 'primary'"
                rounded
                height="8"
                style="min-width: 80px"
              />
              <span
                class="text-caption font-weight-medium"
                :class="calcRate(row.amount, row.actual_expense) > 100 ? 'text-red' : ''"
              >
                {{ calcRate(row.amount, row.actual_expense) }}%
              </span>
            </div>
            <span v-else class="text-medium-emphasis">—</span>
          </td>

          <!-- 操作 -->
          <td class="text-center">
            <template v-if="row.budget_id !== null">
              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="openDialog(row)"
              />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="openDeleteConfirm(row)"
              />
            </template>
            <v-btn
              v-else
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-plus"
              @click="openDialog(row)"
            >
              設定
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- 設定・編集ダイアログ -->
    <v-dialog v-model="showDialog" max-width="360" persistent>
      <v-card>
        <v-card-title class="pt-4 px-6">
          {{ isEditMode ? '予算を編集' : `${dialogRow?.month}月の予算を設定` }}
        </v-card-title>
        <v-card-text class="px-6">
          <v-text-field
            v-model="formAmount"
            label="予算額（円）"
            type="number"
            min="1"
            prefix="¥"
            density="compact"
            hide-details="auto"
          />
          <v-alert v-if="formError" type="error" density="compact" class="mt-4">
            {{ formError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="closeDialog">キャンセル</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="submitForm">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 削除確認ダイアログ -->
    <v-dialog :model-value="showDeleteConfirm" max-width="360" persistent>
      <v-card v-if="deleteTargetRow">
        <v-card-title class="pt-4 px-6">予算の削除</v-card-title>
        <v-card-text class="px-6">
          {{ deleteTargetRow.month }}月の予算を削除してもよろしいですか？
          <v-alert v-if="deleteError" type="error" density="compact" class="mt-3">
            {{ deleteError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" :disabled="deleteLoading" @click="showDeleteConfirm = false">
            キャンセル
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleteLoading"
            :disabled="deleteLoading"
            @click="confirmDelete"
          >
            削除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- スナックバー -->
    <v-snackbar v-model="snackbar" color="success" timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>
