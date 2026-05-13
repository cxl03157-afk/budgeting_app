import { createRouter, createWebHistory } from 'vue-router'
import TransactionsView from '../views/TransactionsView.vue'
import CategoriesView from '../views/CategoriesView.vue'
import PlaceholderView from '../views/PlaceholderView.vue'

const routes = [
  { path: '/', redirect: '/transactions' },
  { path: '/transactions', component: TransactionsView },
  { path: '/categories', component: CategoriesView },
  { path: '/budget', component: PlaceholderView },
  { path: '/report', component: PlaceholderView },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
