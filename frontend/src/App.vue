<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTheme } from 'vuetify'

const drawer = ref(true)

const navItems = [
  { icon: 'mdi-format-list-bulleted', title: '収支一覧', to: '/transactions' },
  { icon: 'mdi-tag-multiple', title: 'カテゴリ管理', to: '/categories' },
  { icon: 'mdi-wallet', title: '予算管理', to: '/budget' },
  { icon: 'mdi-view-dashboard', title: 'ダッシュボード', to: '/dashboard' },
  { icon: 'mdi-chart-pie', title: 'グラフ・レポート', to: '/report' },
]

const theme = useTheme()
const isDark = ref(localStorage.getItem('theme') === 'dark')
// onMounted を待つと一瞬 light が表示されるため、setup 内で即時設定
theme.global.name.value = isDark.value ? 'dark' : 'light'

watch(isDark, (val) => {
  theme.global.name.value = val ? 'dark' : 'light'
  localStorage.setItem('theme', val ? 'dark' : 'light')
})
</script>

<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" permanent width="220">
      <v-list-item
        title="家計簿アプリ"
        subtitle="budgeting"
        class="py-4"
      />
      <v-divider />
      <v-list nav density="compact">
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
          color="primary"
        />
      </v-list>
      <v-divider class="my-2" />
      <v-list nav density="compact">
        <v-list-item
          :prepend-icon="isDark ? 'mdi-weather-night' : 'mdi-weather-sunny'"
          :title="isDark ? 'ライトモードに切替' : 'ダークモードに切替'"
          @click="isDark = !isDark"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>
