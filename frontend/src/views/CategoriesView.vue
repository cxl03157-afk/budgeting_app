<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchCategoriesWithSubs,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  deleteSubcategory,
  updateSubcategory,
  type CategoryWithSubs,
  type TransactionType,
} from '../api/index'

const categories = ref<CategoryWithSubs[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)

async function loadCategories() {
  loading.value = true
  errorMessage.value = null
  try {
    categories.value = await fetchCategoriesWithSubs()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(loadCategories)

const expenseCategories = () => categories.value.filter((c) => c.type === 'expense')
const incomeCategories = () => categories.value.filter((c) => c.type === 'income')

// --- カテゴリ追加フォーム ---
const addName = ref('')
const addColor = ref('#6366f1')
const addType = ref<TransactionType>('expense')
const addError = ref<string | null>(null)
const addLoading = ref(false)

async function submitAddCategory() {
  if (!addName.value.trim()) {
    addError.value = 'カテゴリ名を入力してください'
    return
  }
  addError.value = null
  addLoading.value = true
  try {
    await createCategory({ name: addName.value.trim(), color: addColor.value, type: addType.value })
    addName.value = ''
    addColor.value = '#6366f1'
    await loadCategories()
    showSnackbar('カテゴリを追加しました')
  } catch (e) {
    addError.value = e instanceof Error ? e.message : '追加に失敗しました'
  } finally {
    addLoading.value = false
  }
}

// --- カテゴリ削除確認 ---
const deleteCategoryTarget = ref<CategoryWithSubs | null>(null)
const deleteCategoryError = ref<string | null>(null)
const deleteCategoryLoading = ref(false)

function openDeleteCategory(cat: CategoryWithSubs) {
  deleteCategoryTarget.value = cat
  deleteCategoryError.value = null
}

async function confirmDeleteCategory() {
  if (!deleteCategoryTarget.value) return
  deleteCategoryLoading.value = true
  deleteCategoryError.value = null
  try {
    await deleteCategory(deleteCategoryTarget.value.id)
    deleteCategoryTarget.value = null
    await loadCategories()
    showSnackbar('カテゴリを削除しました')
  } catch (e) {
    deleteCategoryError.value = e instanceof Error ? e.message : '削除に失敗しました'
  } finally {
    deleteCategoryLoading.value = false
  }
}

// --- サブカテゴリ追加 ---
const subInputName = ref<Record<number, string>>({})
const subInputError = ref<Record<number, string | null>>({})
const subInputLoading = ref<Record<number, boolean>>({})

async function submitAddSubcategory(categoryId: number) {
  const name = (subInputName.value[categoryId] ?? '').trim()
  if (!name) {
    subInputError.value[categoryId] = 'サブカテゴリ名を入力してください'
    return
  }
  subInputError.value[categoryId] = null
  subInputLoading.value[categoryId] = true
  try {
    await createSubcategory(categoryId, name)
    subInputName.value[categoryId] = ''
    await loadCategories()
    showSnackbar('サブカテゴリを追加しました')
  } catch (e) {
    subInputError.value[categoryId] = e instanceof Error ? e.message : '追加に失敗しました'
  } finally {
    subInputLoading.value[categoryId] = false
  }
}

// --- サブカテゴリ削除確認 ---
const deleteSubTarget = ref<{ categoryId: number; subId: number; subName: string } | null>(null)
const deleteSubLoading = ref(false)
const deleteSubError = ref<string | null>(null)

function openDeleteSubcategory(categoryId: number, subId: number, subName: string) {
  deleteSubTarget.value = { categoryId, subId, subName }
  deleteSubError.value = null
}

async function confirmDeleteSubcategory() {
  if (!deleteSubTarget.value) return
  deleteSubLoading.value = true
  deleteSubError.value = null
  try {
    await deleteSubcategory(deleteSubTarget.value.categoryId, deleteSubTarget.value.subId)
    deleteSubTarget.value = null
    await loadCategories()
    showSnackbar('サブカテゴリを削除しました')
  } catch (e) {
    deleteSubError.value = e instanceof Error ? e.message : '削除に失敗しました'
  } finally {
    deleteSubLoading.value = false
  }
}

// --- サブカテゴリ編集 ---
const subEditOpen = ref<Record<number, boolean>>({})
const subEditName = ref<Record<number, string>>({})
const subEditError = ref<Record<number, string | null>>({})
const subEditLoading = ref<Record<number, boolean>>({})

function openSubEdit(subId: number, currentName: string) {
  subEditOpen.value = { [subId]: true }
  subEditName.value[subId] = currentName
  subEditError.value[subId] = null
}

function cancelSubEdit(subId: number) {
  subEditOpen.value[subId] = false
}

async function submitSubEdit(categoryId: number, subId: number) {
  const name = (subEditName.value[subId] ?? '').trim()
  if (!name) {
    subEditError.value[subId] = 'サブカテゴリ名を入力してください'
    return
  }
  subEditLoading.value[subId] = true
  subEditError.value[subId] = null
  try {
    await updateSubcategory(categoryId, subId, name)
    subEditOpen.value[subId] = false
    await loadCategories()
    showSnackbar('サブカテゴリ名を更新しました')
  } catch (e) {
    subEditError.value[subId] = e instanceof Error ? e.message : '更新に失敗しました'
  } finally {
    subEditLoading.value[subId] = false
  }
}

// --- カテゴリ編集 ---
const editCategoryDialog = ref(false)
const editingCategory = ref<CategoryWithSubs | null>(null)
const editCategoryName = ref('')
const editCategoryColor = ref('')
const editCategorySaving = ref(false)
const editCategoryError = ref<string | null>(null)

function openEditCategory(cat: CategoryWithSubs) {
  editingCategory.value = cat
  editCategoryName.value = cat.name
  editCategoryColor.value = cat.color
  editCategoryError.value = null
  editCategoryDialog.value = true
}

function closeEditCategoryDialog() {
  editCategoryDialog.value = false
  editingCategory.value = null
  editCategoryName.value = ''
  editCategoryColor.value = ''
  editCategoryError.value = null
}

async function saveEditCategory() {
  if (!editingCategory.value || editCategorySaving.value) return
  editCategorySaving.value = true
  editCategoryError.value = null
  try {
    await updateCategory(editingCategory.value.id, {
      name: editCategoryName.value.trim(),
      color: editCategoryColor.value,
    })
    closeEditCategoryDialog()
    await loadCategories()
    showSnackbar('カテゴリを更新しました')
  } catch (e) {
    editCategoryError.value = e instanceof Error ? e.message : '更新に失敗しました'
  } finally {
    editCategorySaving.value = false
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
    <h2 class="text-h5 mb-4">カテゴリ管理</h2>

    <!-- カテゴリ追加フォーム -->
    <v-card class="mb-6 pa-4" variant="outlined">
      <div class="text-subtitle-2 mb-3">カテゴリを追加</div>
      <div class="d-flex flex-wrap align-center ga-2">
        <v-text-field
          v-model="addName"
          placeholder="カテゴリ名"
          maxlength="20"
          density="compact"
          hide-details="auto"
          :error-messages="addError ? [addError] : []"
          style="max-width: 200px"
        />
        <input
          v-model="addColor"
          type="color"
          style="width: 36px; height: 36px; border: none; padding: 0; cursor: pointer; border-radius: 4px"
        />
        <v-select
          v-model="addType"
          :items="[{ title: '支出', value: 'expense' }, { title: '収入', value: 'income' }]"
          item-title="title"
          item-value="value"
          density="compact"
          hide-details
          style="max-width: 100px"
        />
        <v-btn color="primary" variant="flat" :loading="addLoading" :disabled="addLoading" @click="submitAddCategory">
          追加
        </v-btn>
      </div>
    </v-card>

    <!-- エラー表示 -->
    <v-alert v-if="errorMessage" type="error" class="mb-4" density="compact">
      {{ errorMessage }}
    </v-alert>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <!-- 支出カテゴリ -->
    <div class="text-subtitle-1 font-weight-bold mb-2">支出カテゴリ</div>
    <div class="d-flex flex-column ga-2 mb-6">
      <v-card v-for="cat in expenseCategories()" :key="cat.id" variant="outlined" class="pa-3">
        <!-- カテゴリ名行 -->
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center ga-2">
            <span class="rounded-circle d-inline-block" :style="{ width: '12px', height: '12px', backgroundColor: cat.color, flexShrink: 0 }" />
            <span class="font-weight-medium">{{ cat.name }}</span>
          </div>
          <div class="d-flex align-center ga-1">
            <v-icon v-if="cat.is_default" icon="mdi-lock-outline" size="small" color="medium-emphasis" title="デフォルトカテゴリは削除できません" />
            <v-btn icon="mdi-pencil-outline" size="x-small" variant="text" @click="openEditCategory(cat)" />
            <v-btn v-if="!cat.is_default" icon="mdi-close" size="x-small" variant="text" color="error" @click="openDeleteCategory(cat)" />
          </div>
        </div>
        <!-- サブカテゴリチップ -->
        <div class="mb-2">
          <template v-for="sub in cat.subcategories" :key="sub.id">
            <div v-if="subEditOpen[sub.id]" class="d-inline-flex align-center ga-1 mr-2 mb-2" style="min-width: 200px; max-width: 400px">
              <v-text-field
                v-model="subEditName[sub.id]"
                density="compact"
                hide-details="auto"
                :error-messages="subEditError[sub.id] ?? undefined"
                maxlength="30"
                @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) submitSubEdit(cat.id, sub.id) }"
                @keyup.escape="cancelSubEdit(sub.id)"
              />
              <v-btn icon="mdi-check" size="small" color="primary" variant="tonal" :loading="subEditLoading[sub.id]" @click="submitSubEdit(cat.id, sub.id)" />
              <v-btn icon="mdi-close" size="small" variant="text" :disabled="subEditLoading[sub.id]" @click="cancelSubEdit(sub.id)" />
            </div>
            <span v-else class="d-inline-flex align-center ga-1 mr-2 mb-1">
              <v-chip size="small" variant="tonal">{{ sub.name }}</v-chip>
              <v-btn icon="mdi-pencil-outline" size="x-small" variant="text" @click.stop="openSubEdit(sub.id, sub.name)" />
              <v-btn icon="mdi-close-circle-outline" size="x-small" variant="text" color="error" @click.stop="openDeleteSubcategory(cat.id, sub.id, sub.name)" />
            </span>
          </template>
        </div>
        <!-- サブカテゴリ追加（常時表示） -->
        <div class="d-flex align-center ga-2" style="max-width: 320px">
          <v-text-field
            v-model="subInputName[cat.id]"
            density="compact"
            hide-details="auto"
            placeholder="+ サブカテゴリを追加..."
            maxlength="30"
            :loading="subInputLoading[cat.id]"
            :error-messages="subInputError[cat.id] ? [subInputError[cat.id]!] : []"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) submitAddSubcategory(cat.id) }"
          />
          <v-btn color="primary" variant="tonal" size="small" :loading="subInputLoading[cat.id]" @click="submitAddSubcategory(cat.id)">追加</v-btn>
        </div>
      </v-card>
      <p v-if="expenseCategories().length === 0" class="text-medium-emphasis text-body-2">なし</p>
    </div>

    <!-- 収入カテゴリ -->
    <div class="text-subtitle-1 font-weight-bold mb-2">収入カテゴリ</div>
    <div class="d-flex flex-column ga-2">
      <v-card v-for="cat in incomeCategories()" :key="cat.id" variant="outlined" class="pa-3">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center ga-2">
            <span class="rounded-circle d-inline-block" :style="{ width: '12px', height: '12px', backgroundColor: cat.color, flexShrink: 0 }" />
            <span class="font-weight-medium">{{ cat.name }}</span>
          </div>
          <div class="d-flex align-center ga-1">
            <v-icon v-if="cat.is_default" icon="mdi-lock-outline" size="small" color="medium-emphasis" title="デフォルトカテゴリは削除できません" />
            <v-btn icon="mdi-pencil-outline" size="x-small" variant="text" @click="openEditCategory(cat)" />
            <v-btn v-if="!cat.is_default" icon="mdi-close" size="x-small" variant="text" color="error" @click="openDeleteCategory(cat)" />
          </div>
        </div>
        <div class="mb-2">
          <template v-for="sub in cat.subcategories" :key="sub.id">
            <div v-if="subEditOpen[sub.id]" class="d-inline-flex align-center ga-1 mr-2 mb-2" style="min-width: 200px; max-width: 400px">
              <v-text-field
                v-model="subEditName[sub.id]"
                density="compact"
                hide-details="auto"
                :error-messages="subEditError[sub.id] ?? undefined"
                maxlength="30"
                @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) submitSubEdit(cat.id, sub.id) }"
                @keyup.escape="cancelSubEdit(sub.id)"
              />
              <v-btn icon="mdi-check" size="small" color="primary" variant="tonal" :loading="subEditLoading[sub.id]" @click="submitSubEdit(cat.id, sub.id)" />
              <v-btn icon="mdi-close" size="small" variant="text" :disabled="subEditLoading[sub.id]" @click="cancelSubEdit(sub.id)" />
            </div>
            <span v-else class="d-inline-flex align-center ga-1 mr-2 mb-1">
              <v-chip size="small" variant="tonal">{{ sub.name }}</v-chip>
              <v-btn icon="mdi-pencil-outline" size="x-small" variant="text" @click.stop="openSubEdit(sub.id, sub.name)" />
              <v-btn icon="mdi-close-circle-outline" size="x-small" variant="text" color="error" @click.stop="openDeleteSubcategory(cat.id, sub.id, sub.name)" />
            </span>
          </template>
        </div>
        <div class="d-flex align-center ga-2" style="max-width: 320px">
          <v-text-field
            v-model="subInputName[cat.id]"
            density="compact"
            hide-details="auto"
            placeholder="+ サブカテゴリを追加..."
            maxlength="30"
            :loading="subInputLoading[cat.id]"
            :error-messages="subInputError[cat.id] ? [subInputError[cat.id]!] : []"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) submitAddSubcategory(cat.id) }"
          />
          <v-btn color="primary" variant="tonal" size="small" :loading="subInputLoading[cat.id]" @click="submitAddSubcategory(cat.id)">追加</v-btn>
        </div>
      </v-card>
      <p v-if="incomeCategories().length === 0" class="text-medium-emphasis text-body-2">なし</p>
    </div>

    <!-- カテゴリ編集ダイアログ -->
    <v-dialog v-model="editCategoryDialog" max-width="400" persistent>
      <v-card v-if="editingCategory">
        <v-card-title class="pt-4 px-6">カテゴリを編集</v-card-title>
        <v-card-text class="px-6">
          <v-alert v-if="editCategoryError" type="error" density="compact" class="mb-3">
            {{ editCategoryError }}
          </v-alert>
          <v-text-field
            v-model="editCategoryName"
            label="カテゴリ名"
            maxlength="20"
            density="compact"
            class="mb-3"
          />
          <div class="d-flex align-center ga-3">
            <span class="text-body-2">カラー</span>
            <input
              v-model="editCategoryColor"
              type="color"
              style="width: 36px; height: 36px; border: none; padding: 0; cursor: pointer; border-radius: 4px"
            />
          </div>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" :disabled="editCategorySaving" @click="closeEditCategoryDialog">キャンセル</v-btn>
          <v-btn color="primary" variant="flat" :loading="editCategorySaving" @click="saveEditCategory">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- カテゴリ削除確認ダイアログ -->
    <v-dialog :model-value="deleteCategoryTarget !== null" max-width="360" persistent>
      <v-card v-if="deleteCategoryTarget">
        <v-card-title class="pt-4 px-6">カテゴリの削除</v-card-title>
        <v-card-text class="px-6">
          「{{ deleteCategoryTarget.name }}」を削除してもよろしいですか？<br>
          この操作は元に戻せません。
          <v-alert v-if="deleteCategoryError" type="error" density="compact" class="mt-3">
            {{ deleteCategoryError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="deleteCategoryLoading"
            @click="deleteCategoryTarget = null"
          >
            キャンセル
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleteCategoryLoading"
            :disabled="deleteCategoryLoading"
            @click="confirmDeleteCategory"
          >
            削除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- サブカテゴリ削除確認ダイアログ -->
    <v-dialog :model-value="deleteSubTarget !== null" max-width="400" persistent>
      <v-card v-if="deleteSubTarget">
        <v-card-title class="pt-4 px-6">サブカテゴリの削除</v-card-title>
        <v-card-text class="px-6">
          「{{ deleteSubTarget.subName }}」を削除してもよろしいですか？<br><br>
          <v-alert type="warning" density="compact" variant="tonal">
            過去の取引に紐付いているサブカテゴリ情報が外れます（取引データ自体は削除されません）。
          </v-alert>
          <v-alert v-if="deleteSubError" type="error" density="compact" class="mt-3">
            {{ deleteSubError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="deleteSubLoading"
            @click="deleteSubTarget = null"
          >
            キャンセル
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleteSubLoading"
            :disabled="deleteSubLoading"
            @click="confirmDeleteSubcategory"
          >
            削除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 成功スナックバー -->
    <v-snackbar v-model="snackbar" color="success" timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>
