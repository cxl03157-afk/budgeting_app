<script setup lang="ts">
import { ref } from 'vue'

const drawer = ref(true)

const navItems = [
  { icon: 'mdi-format-list-bulleted', title: '収支一覧', to: '/transactions' },
  { icon: 'mdi-tag-multiple', title: 'カテゴリ管理', to: '/categories' },
  { icon: 'mdi-wallet', title: '予算管理', to: '/budget' },
  { icon: 'mdi-view-dashboard', title: 'ダッシュボード', to: '/dashboard' },
  { icon: 'mdi-chart-pie', title: 'グラフ・レポート', to: '/report' },
]
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
    </v-navigation-drawer>

    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>
