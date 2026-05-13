<script setup lang="ts">
import { ref } from 'vue'
import TransactionsView from './views/TransactionsView.vue'

const drawer = ref(true)
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
          prepend-icon="mdi-format-list-bulleted"
          title="収支一覧"
          value="transactions"
          active
          color="primary"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <TransactionsView />
    </v-main>
  </v-app>
</template>
