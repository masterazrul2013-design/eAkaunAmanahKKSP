// Top Navbar Component
import { getCurrentUser, setCurrentUserRole, ROLES } from "../services/auth.js";
import { getSettings } from "../services/api.js";

export function renderNavbar({ selectedYear, onYearChange, onSearch, onQuickAdd }) {
  const user = getCurrentUser();
  const settings = getSettings();
  const isLive = settings.api_mode === "LIVE";

  return `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
      <div class="px-6 py-3 flex items-center justify-between gap-4">
        <!-- Left: Search Bar -->
        <div class="flex items-center gap-3 flex-1 max-w-md">
          <div class="relative w-full">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              🔍
            </span>
            <input
              type="text"
              id="global-search-input"
              placeholder="Cari ID, program, pembekal, resit, invois..."
              class="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>
        </div>

        <!-- Right: Controls & Status -->
        <div class="flex items-center gap-4">
          <!-- Year Selector -->
          <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span class="text-xs font-semibold text-slate-500 pl-2">Tahun:</span>
            <select id="global-year-select" class="bg-white border-none rounded-lg text-xs font-bold text-slate-800 px-3 py-1.5 focus:outline-none shadow-sm cursor-pointer">
              <option value="2025" ${selectedYear === "2025" ? "selected" : ""}>2025</option>
              <option value="2026" ${selectedYear === "2026" ? "selected" : ""}>2026</option>
              <option value="2027" ${selectedYear === "2027" ? "selected" : ""}>2027</option>
              <option value="ALL" ${selectedYear === "ALL" ? "selected" : ""}>Semua Tahun</option>
            </select>
          </div>

          <!-- Connection Status Indicator -->
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            isLive ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-800"
          }">
            <span class="w-2.5 h-2.5 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}"></span>
            <span>${isLive ? "🟢 Google Sheets Connected" : "🟡 DEMO MODE"}</span>
          </div>

          <!-- Quick Actions Dropdown -->
          <div class="relative group">
            <button class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5">
              <span>+ Tambah Rekod</span>
              <span class="text-[10px]">▼</span>
            </button>
            <div class="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 hidden group-hover:block z-50 animate-fade-in">
              <button class="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2" onclick="window.appQuickAdd('Income')">
                <span class="text-emerald-600">💵</span> + Pendapatan
              </button>
              <button class="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2" onclick="window.appQuickAdd('Expense')">
                <span class="text-rose-600">🛒</span> + Perbelanjaan
              </button>
              <button class="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2" onclick="window.appQuickAdd('Claim')">
                <span class="text-amber-600">🎓</span> + Tuntutan Penceramah
              </button>
              <button class="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2" onclick="window.appQuickAdd('Invoice')">
                <span class="text-blue-600">📄</span> + Invois
              </button>
              <button class="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2" onclick="window.appQuickAdd('Quotation')">
                <span class="text-purple-600">📋</span> + Sebutharga
              </button>
              <button class="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2" onclick="window.appQuickAdd('Stock')">
                <span class="text-teal-600">📦</span> + Transaksi Stok
              </button>
            </div>
          </div>

          <!-- User Role Switcher -->
          <div class="flex items-center gap-2 pl-2 border-l border-slate-200">
            <select id="user-role-select" class="bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 px-3 py-1.5 focus:outline-none cursor-pointer">
              <option value="${ROLES.ADMIN}" ${user.role === ROLES.ADMIN ? "selected" : ""}>👑 Pentadbir (Admin)</option>
              <option value="${ROLES.BENDAHARI}" ${user.role === ROLES.BENDAHARI ? "selected" : ""}>💰 Bendahari</option>
              <option value="${ROLES.SETIAUSAHA}" ${user.role === ROLES.SETIAUSAHA ? "selected" : ""}>📝 Setiausaha</option>
              <option value="${ROLES.STOCK_OFFICER}" ${user.role === ROLES.STOCK_OFFICER ? "selected" : ""}>📦 Pegawai Stok</option>
              <option value="${ROLES.VIEWER}" ${user.role === ROLES.VIEWER ? "selected" : ""}>👁️ Viewer (Read-only)</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  `;
}
