'use strict';

const CATEGORY_VERSION = 2;
const SAMPLE_VERSION   = 2;

// ===== State =====
const state = {
  transactions: [],
  categories: [],
  budgets: {},
  currentSection: 'dashboard',
  currentPeriod: 'month',
  editingId: null,
  charts: { donut: null, bar: null },
  chartMode: 'daily',
  dashSelectedYM: '',
  dashSelectedYear: '',
};

// ===== デフォルトカテゴリ =====
const DEFAULT_CATEGORIES = [
  { id: 'cat-1',  name: '食費',         color: '#f97316', type: 'expense', isDefault: true,
    subcategories: ['食料品', '外食', 'カフェ', '飲み物・お酒', 'その他食費'] },
  { id: 'cat-2',  name: '日用品',       color: '#a855f7', type: 'expense', isDefault: true,
    subcategories: ['洗剤・掃除用品', 'キッチン用品', 'その他日用品'] },
  { id: 'cat-3',  name: '娯楽',         color: '#ec4899', type: 'expense', isDefault: true,
    subcategories: ['映画・音楽・ゲーム', '旅行', '本', '趣味', 'その他娯楽'] },
  { id: 'cat-4',  name: '交通費',       color: '#3b82f6', type: 'expense', isDefault: true,
    subcategories: ['電車', 'バス', 'タクシー', '飛行機', 'その他交通費'] },
  { id: 'cat-5',  name: '衣類・美容',   color: '#f43f5e', type: 'expense', isDefault: true,
    subcategories: ['服', 'クリーニング', '理髪', '美容・化粧品', 'その他衣類・美容'] },
  { id: 'cat-6',  name: '医療・健康',   color: '#ef4444', type: 'expense', isDefault: true,
    subcategories: ['医療費', '薬', 'フィットネス', 'その他医療・健康'] },
  { id: 'cat-7',  name: '自動車',       color: '#64748b', type: 'expense', isDefault: true,
    subcategories: ['自動車ローン', 'ガソリン', '有料道路', '駐車場', '自動車保険', '車検・点検', 'その他自動車'] },
  { id: 'cat-8',  name: '教育・自己投資', color: '#10b981', type: 'expense', isDefault: true,
    subcategories: ['IT機器', '書籍', '新聞・雑誌', '学費', '塾', '習い事', 'その他教育・自己投資'] },
  { id: 'cat-9',  name: '水道・光熱費', color: '#f59e0b', type: 'expense', isDefault: true,
    subcategories: ['水道', '電気', 'ガス', 'その他水道・光熱費'] },
  { id: 'cat-10', name: '住居費',       color: '#8b5cf6', type: 'expense', isDefault: true,
    subcategories: ['住宅ローン', '家賃', '管理費', '地震・火災保険', 'その他住居費'] },
  { id: 'cat-11', name: '保険',         color: '#0ea5e9', type: 'expense', isDefault: true,
    subcategories: ['生命保険', '医療保険', 'その他保険'] },
  { id: 'cat-12', name: '交際費',       color: '#d97706', type: 'expense', isDefault: true,
    subcategories: ['飲み会', '冠婚葬祭', '贈り物', 'その他交際費'] },
  { id: 'cat-13', name: '通信費',       color: '#06b6d4', type: 'expense', isDefault: true,
    subcategories: ['スマホ', 'インターネット', 'NHK', 'その他通信費'] },
  { id: 'cat-14', name: 'その他',       color: '#94a3b8', type: 'expense', isDefault: true,
    subcategories: ['ふるさと納税'] },
  { id: 'cat-15', name: '収入',         color: '#22c55e', type: 'income',  isDefault: true,
    subcategories: ['給与', 'ボーナス', '投資利益・配当金', 'その他収入'] },
];

// ===== サンプルデータ =====
function buildSampleTransactions() {
  const txs = [];
  let n = 1;
  const id = () => `tx-s${n++}`;
  const tx = (type, amount, date, categoryId, subcategoryName, memo) =>
    ({ id: id(), type, amount, date, categoryId, subcategoryName, memo, recurring: 'none' });

  for (let y = 2024; y <= 2026; y++) {
    const maxM = (y === 2026) ? 5 : 12;
    for (let m = 1; m <= maxM; m++) {
      const mm = String(m).padStart(2, '0');
      const ym = `${y}-${mm}`;

      // 収入：給与（月により若干変動）
      txs.push(tx('income', 280000 + (m % 3) * 5000, `${ym}-25`, 'cat-15', '給与', '給与'));

      // 収入：投資・配当（3/6/9/12月）
      if ([3, 6, 9, 12].includes(m))
        txs.push(tx('income', 5000 + m * 400, `${ym}-15`, 'cat-15', '投資利益・配当金', '配当'));

      // 収入：ボーナス（6月・12月）
      if (m === 6)  txs.push(tx('income', 200000, `${ym}-20`, 'cat-15', 'ボーナス', '夏ボーナス'));
      if (m === 12) txs.push(tx('income', 250000, `${ym}-20`, 'cat-15', 'ボーナス', '冬ボーナス'));

      // 支出：家賃
      txs.push(tx('expense', 80000, `${ym}-01`, 'cat-10', '家賃', '家賃'));

      // 支出：食費（食料品・外食）
      txs.push(tx('expense', 12000 + (m % 5) * 2000, `${ym}-08`, 'cat-1', '食料品', 'スーパー'));
      txs.push(tx('expense', 6000 + (m % 4) * 1500, `${ym}-18`, 'cat-1', '外食', '外食'));

      // 支出：交通費
      txs.push(tx('expense', 5800, `${ym}-01`, 'cat-4', '電車', '定期代'));

      // 支出：電気代（冬・夏は高め）
      const util = [12, 1, 2].includes(m) ? 8000 : [7, 8].includes(m) ? 7000 : 3500;
      txs.push(tx('expense', util, `${ym}-05`, 'cat-9', '電気', '電気代'));

      // 支出：通信費
      txs.push(tx('expense', 4500, `${ym}-10`, 'cat-13', 'スマホ', 'スマホ'));
      txs.push(tx('expense', 4000, `${ym}-10`, 'cat-13', 'インターネット', 'ネット'));

      // 支出：娯楽（3/8/12月のみ）
      if ([3, 8, 12].includes(m))
        txs.push(tx('expense', 8000 + m * 400, `${ym}-15`, 'cat-3', '映画・音楽・ゲーム', '娯楽'));

      // 支出：旅行（8月のみ）
      if (m === 8) txs.push(tx('expense', 60000, `${ym}-12`, 'cat-3', '旅行', '夏旅行'));

      // 支出：忘年会（12月のみ）
      if (m === 12) txs.push(tx('expense', 15000, `${ym}-28`, 'cat-12', '飲み会', '忘年会'));
    }
  }
  return txs;
}

// ===== サンプル予算データ =====
function buildSampleBudgets() {
  const budgets = {};
  for (let y = 2024; y <= 2026; y++) {
    const maxM = (y === 2026) ? 5 : 12;
    for (let m = 1; m <= maxM; m++) {
      budgets[`${y}-${String(m).padStart(2, '0')}`] = 150000;
    }
  }
  return budgets;
}

// ===== localStorage =====
function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function save() {
  const { transactions, categories, budgets } = state;
  localStorage.setItem('budgeting_app', JSON.stringify({ transactions, categories, budgets, categoryVersion: CATEGORY_VERSION, sampleVersion: SAMPLE_VERSION }));
}

function load() {
  const raw = localStorage.getItem('budgeting_app');
  if (raw) {
    const data = JSON.parse(raw);
    state.transactions = data.transactions || [];

    // カテゴリバージョンが異なる場合はデフォルトにリセット
    if (data.categoryVersion !== CATEGORY_VERSION || !data.categories) {
      state.categories = DEFAULT_CATEGORIES.map(c => ({ ...c, subcategories: [...c.subcategories] }));
      state.transactions.forEach(tx => {
        if (!state.categories.find(c => c.id === tx.categoryId)) {
          tx.categoryId = tx.type === 'income' ? 'cat-15' : 'cat-14';
        }
      });
    } else {
      const defaultMap = Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.id, c]));
      state.categories = data.categories.map(c => ({
        ...c,
        subcategories: c.subcategories || defaultMap[c.id]?.subcategories || [],
      }));
    }

    // 区分とカテゴリタイプの不一致を修復（毎回実行）
    state.transactions.forEach(tx => {
      const cat = state.categories.find(c => c.id === tx.categoryId);
      if (cat && cat.type !== tx.type) {
        tx.categoryId = tx.type === 'income' ? 'cat-15' : 'cat-14';
      }
    });

    // 旧形式 budget → budgets へマイグレーション
    if (data.budgets) {
      state.budgets = data.budgets;
    } else if (data.budget !== undefined) {
      state.budgets = { [getCurrentYearMonth()]: data.budget };
    } else {
      state.budgets = {};
    }

    // サンプルデータバージョンが変わった場合はトランザクション・予算をリセット
    if (!data.sampleVersion || data.sampleVersion !== SAMPLE_VERSION) {
      state.transactions = buildSampleTransactions();
      state.budgets      = buildSampleBudgets();
      save();
    }
  } else {
    state.categories   = DEFAULT_CATEGORIES.map(c => ({ ...c, subcategories: [...c.subcategories] }));
    state.transactions = buildSampleTransactions();
    state.budgets      = { [getCurrentYearMonth()]: 200000 };
    save();
  }
}

// ===== ユーティリティ =====
function formatYen(n) {
  return '¥' + Number(n).toLocaleString('ja-JP');
}

function getCategoryById(id) {
  return state.categories.find(c => c.id === id);
}

function getFilteredByPeriod(txs, period) {
  const now = new Date();
  if (period === 'custom-month') {
    if (!state.dashSelectedYM) return [];
    return txs.filter(t => t.date.startsWith(state.dashSelectedYM));
  }
  if (period === 'custom-year') {
    if (!state.dashSelectedYear) return [];
    return txs.filter(t => t.date.startsWith(state.dashSelectedYear));
  }
  return txs.filter(tx => {
    const d = new Date(tx.date);
    if (period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek && d <= now;
    }
    if (period === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  });
}

function sumByType(txs, type) {
  return txs.filter(t => t.type === type).reduce((a, t) => a + t.amount, 0);
}

function genId() {
  return 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
}

function getMonthBudget(ym) {
  return state.budgets[ym] || 0;
}

function getPeriodLabel(period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmtDate = d => `${d.getMonth() + 1}月${d.getDate()}日`;

  if (period === 'month') {
    const lastDay = new Date(y, m + 1, 0).getDate();
    return `${y}年${m + 1}月1日 〜 ${m + 1}月${lastDay}日`;
  }
  if (period === 'week') {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return `${fmtDate(startOfWeek)} 〜 ${fmtDate(endOfWeek)}`;
  }
  if (period === 'year') return `${y}年1月1日 〜 12月31日`;
  if (period === 'custom-month' && state.dashSelectedYM) {
    const [cy, cm] = state.dashSelectedYM.split('-').map(Number);
    const lastDay = new Date(cy, cm, 0).getDate();
    return `${cy}年${cm}月1日 〜 ${cm}月${lastDay}日`;
  }
  if (period === 'custom-year' && state.dashSelectedYear) {
    return `${state.dashSelectedYear}年1月1日 〜 12月31日`;
  }
  return '';
}

// ===== 年セレクター初期化 =====
function setupYearOptions(selectId, emptyLabel = '年を選択') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const now = new Date().getFullYear();
  let opts = `<option value="">${emptyLabel}</option>`;
  for (let y = now + 1; y >= now - 5; y--) {
    opts += `<option value="${y}"${y === now ? ' selected' : ''}>${y}年</option>`;
  }
  sel.innerHTML = opts;
}

function getYMFromSelectors(yearId, monthId) {
  const year  = document.getElementById(yearId)?.value || '';
  const month = document.getElementById(monthId)?.value || '';
  if (!year) return '';
  if (!month) return year;
  return `${year}-${month}`;
}

function getBudgetYM() {
  const year  = document.getElementById('budgetYear')?.value;
  const month = document.getElementById('budgetMonthSel')?.value;
  if (year && month) return `${year}-${month}`;
  return getCurrentYearMonth();
}

// ===== 繰り返し取引の自動生成 =====
function generateRecurringTransactions() {
  const now = new Date();
  let changed = false;
  const originals = state.transactions.filter(t => t.recurring !== 'none' && !t.autoGenerated);

  originals.forEach(orig => {
    const origDate = new Date(orig.date);
    if (orig.recurring === 'monthly') {
      let checkDate = new Date(origDate);
      checkDate.setMonth(checkDate.getMonth() + 1);
      while (checkDate <= now) {
        const ym = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
        const exists = state.transactions.some(t => t.autoGenerated && t.originalId === orig.id && t.date.startsWith(ym));
        if (!exists) {
          const day = String(checkDate.getDate()).padStart(2, '0');
          state.transactions.push({ id: genId(), type: orig.type, amount: orig.amount, date: `${ym}-${day}`,
            categoryId: orig.categoryId, subcategoryName: orig.subcategoryName || '', memo: orig.memo,
            recurring: 'monthly', autoGenerated: true, originalId: orig.id });
          changed = true;
        }
        checkDate.setMonth(checkDate.getMonth() + 1);
      }
    }
    if (orig.recurring === 'weekly') {
      let checkDate = new Date(origDate);
      checkDate.setDate(checkDate.getDate() + 7);
      while (checkDate <= now) {
        const dateStr = checkDate.toISOString().slice(0, 10);
        const exists = state.transactions.some(t => t.autoGenerated && t.originalId === orig.id && t.date === dateStr);
        if (!exists) {
          state.transactions.push({ id: genId(), type: orig.type, amount: orig.amount, date: dateStr,
            categoryId: orig.categoryId, subcategoryName: orig.subcategoryName || '', memo: orig.memo,
            recurring: 'weekly', autoGenerated: true, originalId: orig.id });
          changed = true;
        }
        checkDate.setDate(checkDate.getDate() + 7);
      }
    }
  });
  if (changed) save();
}

// ===== ナビゲーション =====
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-section="${id}"]`)?.classList.add('active');
  state.currentSection = id;
  if (id === 'dashboard')    renderDashboard();
  if (id === 'transactions') renderTransactions();
  if (id === 'categories')   renderCategories();
  if (id === 'budget')       renderBudget();
  if (id === 'report')       renderReport();
}

// ===== ダッシュボード =====
function renderDashboard() {
  const txs    = getFilteredByPeriod(state.transactions, state.currentPeriod);
  const income  = sumByType(txs, 'income');
  const expense = sumByType(txs, 'expense');
  const balance = income - expense;
  const budget  = getMonthBudget(getCurrentYearMonth());

  document.getElementById('totalIncome').textContent  = formatYen(income);
  document.getElementById('totalExpense').textContent = formatYen(expense);
  document.getElementById('totalBalance').textContent = formatYen(balance);

  document.getElementById('alertBanner').classList.toggle('hidden', !(budget > 0 && expense > budget));

  const periodRangeEl = document.getElementById('periodRange');
  if (periodRangeEl) periodRangeEl.textContent = getPeriodLabel(state.currentPeriod);

  renderCategoryBreakdown(txs);
}

function renderCategoryBreakdown(txs) {
  const expenseTxs = txs.filter(t => t.type === 'expense');
  const incomeTxs  = txs.filter(t => t.type === 'income');

  const buildRows = (list) => {
    const catMap = {};
    list.forEach(tx => { catMap[tx.categoryId] = (catMap[tx.categoryId] || 0) + tx.amount; });
    const total = Object.values(catMap).reduce((a, b) => a + b, 0);
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([id, amount]) => {
        const cat = getCategoryById(id);
        return { name: cat?.name || '不明', color: cat?.color || '#94a3b8',
                 amount, pct: total > 0 ? (amount / total * 100).toFixed(1) : '0.0' };
      });
  };

  const expenseRows = buildRows(expenseTxs);
  const incomeRows  = buildRows(incomeTxs);

  const tbody = document.getElementById('catBreakdownList');
  const empty = document.getElementById('catBreakdownEmpty');

  if (expenseRows.length === 0 && incomeRows.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const renderRows = (rows, typeLabel, badgeClass, amtClass) =>
    rows.map(r => `<tr>
      <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
      <td><span class="cat-badge"><span class="cat-dot" style="background:${r.color}"></span>${r.name}</span></td>
      <td class="${amtClass}" style="font-weight:600;text-align:right">${formatYen(r.amount)}</td>
      <td style="text-align:right;color:var(--text-sub)">${r.pct}%</td>
    </tr>`).join('');

  tbody.innerHTML =
    renderRows(expenseRows, '支出', 'badge-expense', 'expense-text') +
    renderRows(incomeRows,  '収入', 'badge-income',  'income-text');
}

// ===== ダッシュボード：カスタム期間セレクター =====
function onDashCustomMonthChange() {
  const ym = getYMFromSelectors('dashYear', 'dashMonthSel');
  state.dashSelectedYM = ym.length === 7 ? ym : '';
  renderDashboard();
}

function onDashCustomYearChange() {
  state.dashSelectedYear = document.getElementById('dashYearOnly')?.value || '';
  renderDashboard();
}

// ===== 収支一覧 =====
function renderTransactions(filtered = null) {
  const txs    = filtered !== null ? filtered : state.transactions;
  const sorted = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));

  document.getElementById('filterIncome').textContent  = formatYen(sumByType(txs, 'income'));
  document.getElementById('filterExpense').textContent = formatYen(sumByType(txs, 'expense'));
  document.getElementById('filterBalance').textContent = formatYen(sumByType(txs, 'income') - sumByType(txs, 'expense'));

  const tbody = document.getElementById('txList');
  const empty = document.getElementById('emptyTx');

  if (sorted.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const recurringLabel = { none: '—', weekly: '毎週', monthly: '毎月' };
  tbody.innerHTML = sorted.map(tx => {
    const cat   = getCategoryById(tx.categoryId);
    const color = cat ? cat.color : '#94a3b8';
    const name  = cat ? cat.name  : '不明';
    return `<tr>
      <td>${tx.date}</td>
      <td><span class="badge badge-${tx.type}">${tx.type === 'income' ? '収入' : '支出'}</span></td>
      <td><span class="cat-badge"><span class="cat-dot" style="background:${color}"></span>${name}</span></td>
      <td style="color:var(--text-sub);font-size:12px">${tx.subcategoryName || '—'}</td>
      <td style="color:var(--text-sub)">${tx.memo || '—'}</td>
      <td style="color:var(--text-sub);font-size:12px">${recurringLabel[tx.recurring] || '—'}</td>
      <td class="${tx.type === 'income' ? 'income-text' : 'expense-text'}" style="font-weight:600;text-align:right">
        ${tx.type === 'income' ? '+' : '-'}${formatYen(tx.amount)}
      </td>
      <td>
        <button class="icon-btn" onclick="openModal('${tx.id}')">✏️</button>
        <button class="icon-btn" onclick="confirmDelete('${tx.id}')">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function onFilterPeriodChange() {
  const period = document.getElementById('filterPeriod').value;
  document.getElementById('filterMonthWrap').classList.toggle('hidden', period === 'year');
  document.getElementById('filterWeekWrap').classList.toggle('hidden', period !== 'week');
  if (period !== 'week') document.getElementById('filterWeek').value = '';
  applyFilter();
}

function applyFilter() {
  let txs    = [...state.transactions];
  const type   = document.getElementById('filterType').value;
  const catId  = document.getElementById('filterCategory').value;
  const subcat = document.getElementById('filterSubcategory').value;
  const period = document.getElementById('filterPeriod').value;
  const ym     = period === 'year'
    ? (document.getElementById('filterYear')?.value || '')
    : getYMFromSelectors('filterYear', 'filterMonthSel');
  const weekNum = document.getElementById('filterWeek')?.value || '';

  if (type !== 'all')   txs = txs.filter(t => t.type === type);
  if (catId !== 'all')  txs = txs.filter(t => t.categoryId === catId);
  if (subcat !== 'all') txs = txs.filter(t => t.subcategoryName === subcat);

  if (ym) {
    txs = txs.filter(t => t.date.startsWith(ym));
    if (period === 'week' && weekNum) {
      txs = txs.filter(t => Math.ceil(parseInt(t.date.slice(8, 10)) / 7) === parseInt(weekNum));
    }
  } else {
    txs = getFilteredByPeriod(txs, period);
  }

  renderTransactions(txs);
}

function onFilterCategoryChange() {
  const catId = document.getElementById('filterCategory').value;
  populateFilterSubcategory(catId);
  applyFilter();
}

function resetFilter() {
  document.getElementById('filterType').value        = 'all';
  document.getElementById('filterCategory').value    = 'all';
  document.getElementById('filterYear').value        = '';
  document.getElementById('filterMonthSel').value    = '';
  document.getElementById('filterPeriod').value      = 'month';
  document.getElementById('filterWeek').value        = '';
  document.getElementById('filterMonthWrap').classList.remove('hidden');
  document.getElementById('filterWeekWrap').classList.add('hidden');
  populateFilterSubcategory('all');
  renderTransactions();
}

function populateFilterCategory() {
  const sel = document.getElementById('filterCategory');
  sel.innerHTML = '<option value="all">すべてのカテゴリ</option>' +
    state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  populateFilterSubcategory('all');
}

function populateFilterSubcategory(catId) {
  const sel = document.getElementById('filterSubcategory');
  if (!sel) return;
  if (!catId || catId === 'all') {
    sel.innerHTML = '<option value="all">すべてのサブカテゴリ</option>';
    return;
  }
  const cat = getCategoryById(catId);
  const subcats = cat?.subcategories || [];
  sel.innerHTML = '<option value="all">すべてのサブカテゴリ</option>' +
    subcats.map(s => `<option value="${s}">${s}</option>`).join('');
}

// ===== モーダル =====
function openModal(id = null) {
  state.editingId = id;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = id ? '収支を編集' : '収支を登録';
  document.getElementById('deleteBtn').classList.toggle('hidden', !id);
  document.getElementById('amountError').classList.add('hidden');

  if (id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;
    setTxType(tx.type);
    document.getElementById('txAmount').value    = tx.amount;
    document.getElementById('txDate').value      = tx.date;
    document.getElementById('txMemo').value      = tx.memo || '';
    document.getElementById('txRecurring').value = tx.recurring || 'none';
    populateModalCategories(tx.type);
    document.getElementById('txCategory').value  = tx.categoryId;
    populateModalSubcategories(tx.categoryId);
    document.getElementById('txSubcategory').value = tx.subcategoryName || '';
  } else {
    setTxType('expense');
    document.getElementById('txAmount').value    = '';
    document.getElementById('txDate').value      = new Date().toISOString().slice(0, 10);
    document.getElementById('txMemo').value      = '';
    document.getElementById('txRecurring').value = 'none';
  }
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  state.editingId = null;
}

function setTxType(type) {
  document.getElementById('txType').value = type;
  document.getElementById('typeExpenseBtn').classList.toggle('active', type === 'expense');
  document.getElementById('typeIncomeBtn').classList.toggle('active', type === 'income');
  populateModalCategories(type);
  const firstCat = state.categories.find(c => c.type === type);
  populateModalSubcategories(firstCat?.id || null);
}

function populateModalCategories(type) {
  const cats = state.categories.filter(c => c.type === type);
  document.getElementById('txCategory').innerHTML =
    cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function populateModalSubcategories(catId) {
  const cat     = catId ? getCategoryById(catId) : null;
  const subcats = cat?.subcategories || [];
  document.getElementById('txSubcategory').innerHTML =
    '<option value="">サブカテゴリなし</option>' +
    subcats.map(s => `<option value="${s}">${s}</option>`).join('');
}

function saveTransaction() {
  const amount = Number(document.getElementById('txAmount').value);
  if (!amount || amount <= 0) {
    document.getElementById('amountError').classList.remove('hidden');
    return;
  }
  document.getElementById('amountError').classList.add('hidden');

  const tx = {
    id:              state.editingId || genId(),
    type:            document.getElementById('txType').value,
    amount,
    date:            document.getElementById('txDate').value,
    categoryId:      document.getElementById('txCategory').value,
    subcategoryName: document.getElementById('txSubcategory').value,
    memo:            document.getElementById('txMemo').value.trim(),
    recurring:       document.getElementById('txRecurring').value,
  };

  if (state.editingId) {
    const idx = state.transactions.findIndex(t => t.id === state.editingId);
    if (idx !== -1) state.transactions[idx] = tx;
  } else {
    state.transactions.push(tx);
  }

  save();
  closeModal();
  if (state.currentSection === 'transactions') renderTransactions();
  if (state.currentSection === 'dashboard')    renderDashboard();
  if (state.currentSection === 'budget')       renderBudget();
}

function confirmDelete(id) {
  if (!confirm('この取引を削除しますか？')) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  save();
  renderTransactions();
  if (state.currentSection === 'dashboard') renderDashboard();
}

function deleteTransaction() {
  if (!state.editingId) return;
  if (!confirm('この取引を削除しますか？')) return;
  state.transactions = state.transactions.filter(t => t.id !== state.editingId);
  save();
  closeModal();
  if (state.currentSection === 'transactions') renderTransactions();
  if (state.currentSection === 'dashboard')    renderDashboard();
}

// ===== カテゴリ管理 =====
function renderCategories() {
  renderCatList('expense', 'expenseCatList');
  renderCatList('income',  'incomeCatList');
}

function renderCatList(type, containerId) {
  const el   = document.getElementById(containerId);
  const cats = state.categories.filter(c => c.type === type);
  el.innerHTML = cats.map(c => {
    const subcats   = c.subcategories || [];
    const chipsHtml = subcats.map(s => `
      <span class="subcategory-chip">
        ${s}
        <button class="chip-delete" onclick="deleteSubcategory('${c.id}', '${s}')">✕</button>
      </span>`).join('');
    return `<div class="cat-item">
      <div class="cat-item-header">
        <span class="cat-color" style="background:${c.color}"></span>
        <span class="cat-item-name">${c.name}</span>
        <button class="cat-delete-btn" onclick="deleteCategory('${c.id}')"
          ${c.isDefault ? 'disabled title="デフォルトは削除できません"' : ''}>✕</button>
      </div>
      <div class="subcategory-list">
        ${chipsHtml || '<span class="subcat-empty">サブカテゴリなし</span>'}
      </div>
      <div class="subcategory-input-row">
        <input type="text" id="subcat-input-${c.id}" placeholder="＋ サブカテゴリを追加..." maxlength="20"
               onkeydown="if(event.key==='Enter') addSubcategory('${c.id}')">
        <button class="btn-sm-primary" onclick="addSubcategory('${c.id}')">追加</button>
      </div>
    </div>`;
  }).join('');
}

function addCategory() {
  const name  = document.getElementById('newCatName').value.trim();
  const color = document.getElementById('newCatColor').value;
  const type  = document.getElementById('newCatType').value;
  if (!name) { alert('カテゴリ名を入力してください'); return; }
  if (state.categories.some(c => c.name === name)) { alert('同じ名前のカテゴリが既に存在します'); return; }
  state.categories.push({ id: 'cat-' + Date.now(), name, color, type, isDefault: false, subcategories: [] });
  save();
  renderCategories();
  document.getElementById('newCatName').value = '';
}

function deleteCategory(id) {
  const cat = state.categories.find(c => c.id === id);
  if (!cat || cat.isDefault) return;
  if (!confirm(`「${cat.name}」を削除しますか？`)) return;
  state.categories = state.categories.filter(c => c.id !== id);
  state.transactions.forEach(tx => { if (tx.categoryId === id) tx.categoryId = 'cat-14'; });
  save();
  renderCategories();
}

function addSubcategory(catId) {
  const input = document.getElementById(`subcat-input-${catId}`);
  const name  = input.value.trim();
  if (!name) return;
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;
  if (!cat.subcategories) cat.subcategories = [];
  if (cat.subcategories.includes(name)) { alert('同じサブカテゴリが既に存在します'); return; }
  cat.subcategories.push(name);
  save();
  renderCategories();
}

function deleteSubcategory(catId, name) {
  const cat = state.categories.find(c => c.id === catId);
  if (!cat?.subcategories) return;
  cat.subcategories = cat.subcategories.filter(s => s !== name);
  save();
  renderCategories();
}

// ===== 予算設定 =====
function renderBudget() {
  const selectedYM = getBudgetYM();
  const [y, m]     = selectedYM.split('-').map(Number);

  const statusTitle = document.getElementById('budgetStatusTitle');
  if (statusTitle) statusTitle.textContent = `${y}年${m}月の状況`;

  const monthTxs = state.transactions.filter(t => t.date.startsWith(selectedYM));
  const income   = sumByType(monthTxs, 'income');
  const expense  = sumByType(monthTxs, 'expense');
  const budget   = getMonthBudget(selectedYM);
  const saving   = income - budget;
  const rawPercent = budget > 0 ? (expense / budget) * 100 : 0;
  const barPercent = Math.min(rawPercent, 100);
  const isOver     = budget > 0 && expense > budget;

  document.getElementById('budgetIncome').textContent  = formatYen(income);
  document.getElementById('budgetInput').value         = budget || '';
  document.getElementById('budgetDisplay').textContent = formatYen(budget);
  document.getElementById('budgetExpense').textContent = formatYen(expense);
  document.getElementById('budgetPercent').textContent = Math.round(rawPercent) + '%';
  const savingEl = document.getElementById('budgetSaving');
  savingEl.textContent = formatYen(saving);
  savingEl.className   = saving < 0 ? 'expense-text' : 'saving-text';

  const fill = document.getElementById('budgetBarFill');
  fill.style.width = barPercent + '%';
  fill.classList.toggle('over', isOver);
  document.getElementById('budgetAlert').classList.toggle('hidden', !isOver);
}

function saveBudget() {
  const val = Number(document.getElementById('budgetInput').value);
  if (isNaN(val) || val < 0) { alert('正しい金額を入力してください'); return; }
  const selectedYM = getBudgetYM();
  state.budgets[selectedYM] = val;
  save();
  renderBudget();
}

function onBudgetViewTypeChange() {
  const isYear = document.getElementById('budgetViewType').value === 'year';
  document.getElementById('budgetYearView').classList.toggle('hidden', !isYear);
  document.getElementById('budgetMonthView').classList.toggle('hidden', isYear);
  if (isYear) renderBudgetYear();
  else        renderBudget();
}

function renderBudgetYear() {
  const year = document.getElementById('budgetYearForYearView')?.value || new Date().getFullYear();
  document.getElementById('budgetYearTitle').textContent = `${year}年の予算状況`;
  const tbody = document.getElementById('budgetYearList');
  tbody.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const m       = String(i + 1).padStart(2, '0');
    const ym      = `${year}-${m}`;
    const monthTxs = state.transactions.filter(t => t.date.startsWith(ym));
    const income  = sumByType(monthTxs, 'income');
    const expense = sumByType(monthTxs, 'expense');
    const budget  = getMonthBudget(ym);
    const rem     = budget - expense;
    const pct     = budget > 0 ? Math.round(expense / budget * 100) : 0;
    return `<tr>
      <td>${i + 1}月</td>
      <td class="income-text" style="text-align:right">${formatYen(income)}</td>
      <td style="text-align:right">${formatYen(budget)}</td>
      <td class="expense-text" style="text-align:right">${formatYen(expense)}</td>
      <td class="${rem < 0 ? 'expense-text' : ''}" style="text-align:right">${formatYen(rem)}</td>
      <td style="text-align:right${pct > 100 ? ';color:var(--expense)' : ''}">${pct}%</td>
    </tr>`;
  }).join('');
}

// ===== グラフ =====
function onReportPeriodTypeChange() {
  const type        = document.getElementById('reportPeriodType').value;
  const monthSel    = document.getElementById('reportMonthSel');
  const chartToggle = document.getElementById('chartToggleWrap');

  if (type === 'year') {
    monthSel.value = '';
    monthSel.classList.add('hidden');
    if (chartToggle) chartToggle.classList.add('hidden');
  } else {
    monthSel.classList.remove('hidden');
    if (chartToggle) chartToggle.classList.remove('hidden');
  }
  renderReport();
}

function renderReport() {
  const reportType  = document.getElementById('reportType').value;
  const periodType  = document.getElementById('reportPeriodType').value;
  const yearVal     = document.getElementById('reportYear')?.value || '';
  const monthVal    = document.getElementById('reportMonthSel')?.value || '';

  let txs = [...state.transactions];

  if (periodType === 'year') {
    if (!yearVal) { renderDonut([]); renderMonthlyBar([]); return; }
    txs = txs.filter(t => t.date.startsWith(yearVal));
  } else {
    const ym = yearVal && monthVal ? `${yearVal}-${monthVal}` : '';
    if (!ym) { renderDonut([]); renderBar([]); return; }
    txs = txs.filter(t => t.date.startsWith(ym));
  }
  txs = txs.filter(t => t.type === reportType);

  renderDonut(txs);

  if (periodType === 'year') {
    renderMonthlyBar(txs);
  } else if (state.chartMode === 'weekly') {
    renderWeeklyBar(txs);
  } else {
    renderBar(txs);
  }
}

function renderDonut(txs) {
  const catMap = {};
  txs.forEach(tx => { catMap[tx.categoryId] = (catMap[tx.categoryId] || 0) + tx.amount; });

  const cats   = Object.keys(catMap).map(id => getCategoryById(id)).filter(Boolean);
  const labels = cats.map(c => c.name);
  const data   = cats.map(c => catMap[c.id]);
  const colors = cats.map(c => c.color);

  const canvas = document.getElementById('donutChart');
  if (state.charts.donut) state.charts.donut.destroy();
  if (data.length === 0) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }

  const total = data.reduce((a, b) => a + b, 0);

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea: { left, top, width, height } } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1e293b';
      ctx.fillText('¥' + total.toLocaleString('ja-JP'), left + width / 2, top + height / 2);
      ctx.restore();
    },
  };

  state.charts.donut = new Chart(canvas, {
    type: 'doughnut',
    plugins: [ChartDataLabels, centerTextPlugin],
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 } } },
        datalabels: {
          formatter: (value, ctx) => {
            const pct = value / total;
            if (pct < 0.10) return null;
            return `${ctx.chart.data.labels[ctx.dataIndex]}\n${(pct * 100).toFixed(1)}%`;
          },
          color: '#fff',
          font: { weight: 'bold', size: 11 },
          textAlign: 'center',
        },
      },
    },
  });
}

function renderBar(txs) {
  const dayMap = {};
  txs.forEach(tx => {
    const day = tx.date.slice(8, 10);
    dayMap[day] = (dayMap[day] || 0) + tx.amount;
  });
  const labels = Object.keys(dayMap).sort();
  const data   = labels.map(d => dayMap[d]);

  const canvas = document.getElementById('barChart');
  if (state.charts.bar) state.charts.bar.destroy();
  if (data.length === 0) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }

  state.charts.bar = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels.map(d => d + '日'),
      datasets: [{ label: '金額', data, backgroundColor: '#4f6ef7', borderRadius: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: { display: false } },
      scales: { y: { ticks: { callback: v => '¥' + v.toLocaleString('ja-JP'), font: { size: 11 } } } },
    },
  });
}

function renderWeeklyBar(txs) {
  const weekMap = {};
  txs.forEach(tx => {
    const day   = parseInt(tx.date.slice(8, 10), 10);
    const label = `第${Math.ceil(day / 7)}週`;
    weekMap[label] = (weekMap[label] || 0) + tx.amount;
  });
  const allLabels = ['第1週', '第2週', '第3週', '第4週', '第5週'];
  const labels = allLabels.filter(l => weekMap[l] !== undefined);
  const data   = labels.map(l => weekMap[l]);

  const canvas = document.getElementById('barChart');
  if (state.charts.bar) state.charts.bar.destroy();
  if (data.length === 0) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }

  state.charts.bar = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: '金額', data, backgroundColor: '#10b981', borderRadius: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: { display: false } },
      scales: { y: { ticks: { callback: v => '¥' + v.toLocaleString('ja-JP'), font: { size: 11 } } } },
    },
  });
}

function renderMonthlyBar(txs) {
  const monthMap = {};
  txs.forEach(tx => {
    const m = tx.date.slice(5, 7);
    monthMap[m] = (monthMap[m] || 0) + tx.amount;
  });
  const allMonths = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const labels = allMonths.filter(m => monthMap[m] !== undefined);
  const data   = labels.map(m => monthMap[m]);

  const canvas = document.getElementById('barChart');
  if (state.charts.bar) state.charts.bar.destroy();
  if (data.length === 0) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }

  state.charts.bar = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels.map(m => parseInt(m) + '月'),
      datasets: [{ label: '金額', data, backgroundColor: '#8b5cf6', borderRadius: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, datalabels: { display: false } },
      scales: { y: { ticks: { callback: v => '¥' + v.toLocaleString('ja-JP'), font: { size: 11 } } } },
    },
  });
}

function setChartMode(mode) {
  state.chartMode = mode;
  document.getElementById('dailyBtn').classList.toggle('active', mode === 'daily');
  document.getElementById('weeklyBtn').classList.toggle('active', mode === 'weekly');
  renderReport();
}

// ===== CSVエクスポート =====
function buildCSV() {
  const reportType  = document.getElementById('reportType').value;
  const periodType  = document.getElementById('reportPeriodType').value;
  const yearVal     = document.getElementById('reportYear')?.value || '';
  const monthVal    = document.getElementById('reportMonthSel')?.value || '';

  let txs = [...state.transactions];
  if (periodType === 'year' && yearVal) {
    txs = txs.filter(t => t.date.startsWith(yearVal));
  } else {
    const ym = yearVal && monthVal ? `${yearVal}-${monthVal}` : '';
    if (ym) txs = txs.filter(t => t.date.startsWith(ym));
    else    txs = getFilteredByPeriod(txs, 'month');
  }
  txs = txs.filter(t => t.type === reportType);

  const recurringMap = { none: 'なし', weekly: '毎週', monthly: '毎月' };
  const header = '日付,区分,カテゴリ,サブカテゴリ,メモ,繰り返し,金額\n';
  const rows = txs.map(tx => {
    const cat = getCategoryById(tx.categoryId);
    return [tx.date, tx.type === 'income' ? '収入' : '支出', cat?.name || '不明',
      tx.subcategoryName || '', tx.memo || '', recurringMap[tx.recurring] || 'なし', tx.amount].join(',');
  }).join('\n');
  return header + rows;
}

function exportCSV() {
  const reportYear  = document.getElementById('reportYear')?.value || '';
  const reportMonth = document.getElementById('reportMonthSel')?.value || '';
  const suffix   = reportYear && reportMonth ? `${reportYear}-${reportMonth}` : reportYear || 'current';
  const content  = '﻿' + buildCSV();
  const filename = `budgeting_${suffix}.csv`;
  const encoded  = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
  const a = Object.assign(document.createElement('a'), { href: encoded, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ===== ダークモード =====
function toggleDarkMode() {
  const html   = document.documentElement;
  const isDark = html.dataset.theme === 'dark';
  html.dataset.theme = isDark ? 'light' : 'dark';
  document.getElementById('darkModeToggle').textContent = isDark ? '🌙 ダークモード' : '☀️ ライトモード';
}

// ===== イベント登録 =====
function setupEvents() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentPeriod = btn.dataset.period;
      document.getElementById('dashCustomMonth').classList.toggle('hidden', btn.dataset.period !== 'custom-month');
      document.getElementById('dashCustomYear').classList.toggle('hidden', btn.dataset.period !== 'custom-year');
      renderDashboard();
    });
  });

  document.getElementById('typeExpenseBtn').addEventListener('click', () => setTxType('expense'));
  document.getElementById('typeIncomeBtn').addEventListener('click',  () => setTxType('income'));

  document.getElementById('txCategory').addEventListener('change', e => {
    populateModalSubcategories(e.target.value);
  });

  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });

  // グラフの月セレクターのデフォルトを今月に設定
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('reportMonthSel').value  = currentMonthStr;
  document.getElementById('budgetMonthSel').value  = currentMonthStr;
}

// ===== 初期化 =====
load();
generateRecurringTransactions();
setupEvents();
setupYearOptions('dashYear');
setupYearOptions('dashYearOnly');
setupYearOptions('filterYear', '年を選択');
setupYearOptions('budgetYear');
setupYearOptions('budgetYearForYearView');
setupYearOptions('reportYear');
populateFilterCategory();
showSection('dashboard');
