import { createRouter, createWebHistory } from 'vue-router'
import TransactionsView from '../views/TransactionsView.vue'
import CategoriesView from '../views/CategoriesView.vue'
import BudgetView from '../views/BudgetView.vue'
import DashboardView from '../views/DashboardView.vue'
import ReportView from '../views/ReportView.vue'

const routes = [
  { path: '/', redirect: '/transactions' },
  { path: '/transactions', component: TransactionsView },
  { path: '/categories', component: CategoriesView },
  { path: '/budget', component: BudgetView },
  { path: '/dashboard', component: DashboardView },
  { path: '/report', component: ReportView },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
