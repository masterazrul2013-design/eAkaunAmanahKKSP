// Main Application Controller & Router
import { getDatabase } from "./services/api.js";
import { getCurrentUser, setCurrentUserRole } from "./services/auth.js";
import { renderNavbar } from "./components/Navbar.js";
import { renderSidebar } from "./components/Sidebar.js";
import { renderDashboardView, initDashboardCharts } from "./views/DashboardView.js";
import { renderPenyataView, attachPenyataEvents } from "./views/PenyataView.js";
import { renderIncomeView, attachIncomeEvents, openIncomeFormModal } from "./views/IncomeView.js";
import { renderExpenseView, attachExpenseEvents, openExpenseFormModal } from "./views/ExpenseView.js";
import { renderClaimsView, attachClaimsEvents, openClaimFormModal } from "./views/ClaimsView.js";
import { renderInvoiceView, attachInvoiceEvents, openInvoiceFormModal } from "./views/InvoiceView.js";
import { renderQuotationView, attachQuotationEvents, openQuotationFormModal } from "./views/QuotationView.js";
import { renderInventoryView, attachInventoryEvents } from "./views/InventoryView.js";
import { renderAssetsView, attachAssetsEvents, openAssetFormModal } from "./views/AssetsView.js";
import { renderDataQualityView, attachDataQualityEvents } from "./views/DataQualityView.js";
import { renderReportsView, attachReportsEvents } from "./views/ReportsView.js";
import { renderAuditLogView } from "./views/AuditLogView.js";
import { renderSettingsView, attachSettingsEvents } from "./views/SettingsView.js";

let state = {
  selectedYear: "2025",
  currentRoute: "dashboard",
  activeReportType: "penyata",
  stockSubTab: "SUMMARY",
};

// Register modal handlers globally on initial load
window.openIncomeFormModal = (db, rec) => openIncomeFormModal(db || getDatabase(), rec);
window.openExpenseFormModal = (db, rec) => openExpenseFormModal(db || getDatabase(), rec);
window.openClaimFormModal = (db, rec) => openClaimFormModal(db || getDatabase(), rec);
window.openInvoiceFormModal = (db, rec) => openInvoiceFormModal(db || getDatabase(), rec);
window.openQuotationFormModal = (db, rec) => openQuotationFormModal(db || getDatabase(), rec);
window.openAssetFormModal = (db, rec) => openAssetFormModal(db || getDatabase(), rec);

import { initAutoCloudSync } from "./services/cloudSync.js";

export function initApp() {
  const db = getDatabase();

  // Start real-time background multi-device cloud synchronization
  initAutoCloudSync();

  // Router handler
  const handleRoute = () => {
    const hash = window.location.hash.replace("#", "");
    state.currentRoute = hash || "dashboard";
    renderUI();
  };

  window.addEventListener("hashchange", handleRoute);
  window.addEventListener("user-role-changed", () => renderUI());
  window.addEventListener("db-updated", () => renderUI());

  // Global UI refresh helper
  window.appRefreshUI = () => {
    renderUI();
  };

  // Global Quick Add handler (Always functional from any route!)
  window.appQuickAdd = (moduleType) => {
    const activeDb = getDatabase();
    if (moduleType === "Income") window.openIncomeFormModal(activeDb);
    else if (moduleType === "Expense") window.openExpenseFormModal(activeDb);
    else if (moduleType === "Claim") window.openClaimFormModal(activeDb);
    else if (moduleType === "Invoice") window.openInvoiceFormModal(activeDb);
    else if (moduleType === "Quotation") window.openQuotationFormModal(activeDb);
    else if (moduleType === "Asset") window.openAssetFormModal(activeDb);
    else if (moduleType === "Stock" && window.openStockFormModal) window.openStockFormModal(activeDb);
  };

  handleRoute();
}

function renderUI() {
  const root = document.getElementById("app");
  if (!root) return;

  const db = getDatabase();
  const currentRoute = state.currentRoute;
  const selectedYear = state.selectedYear;

  window.activeReportTypeState = state.activeReportType;

  // Build Shell layout
  root.innerHTML = `
    <div class="flex h-screen bg-slate-100 overflow-hidden font-sans">
      <!-- Sidebar -->
      ${renderSidebar({ currentRoute })}

      <!-- Main Body Container -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Navbar -->
        ${renderNavbar({ selectedYear, onYearChange: (yr) => (state.selectedYear = yr) })}

        <!-- Main View Area -->
        <main class="flex-1 overflow-y-auto p-6" id="main-content">
          ${renderMainView(db, currentRoute, selectedYear)}
        </main>
      </div>
    </div>
  `;

  // Attach event listeners for Navbar
  const yearSelect = document.getElementById("global-year-select");
  if (yearSelect) {
    yearSelect.onchange = (e) => {
      state.selectedYear = e.target.value;
      renderUI();
    };
  }

  const roleSelect = document.getElementById("user-role-select");
  if (roleSelect) {
    roleSelect.onchange = (e) => {
      setCurrentUserRole(e.target.value);
    };
  }

  // Attach view-specific events
  if (currentRoute === "dashboard") {
    setTimeout(() => initDashboardCharts(db), 100);
  } else if (currentRoute === "penyata") {
    attachPenyataEvents();
  } else if (currentRoute === "income") {
    attachIncomeEvents(db, selectedYear);
  } else if (currentRoute === "expenses") {
    attachExpenseEvents(db, selectedYear);
  } else if (currentRoute === "claims") {
    attachClaimsEvents(db, selectedYear);
  } else if (currentRoute === "invoices") {
    attachInvoiceEvents(db, selectedYear);
  } else if (currentRoute === "quotations") {
    attachQuotationEvents(db, selectedYear);
  } else if (currentRoute === "inventory") {
    attachInventoryEvents(db, (tab) => {
      state.stockSubTab = tab;
      renderUI();
    });
  } else if (currentRoute === "assets") {
    attachAssetsEvents(db);
  } else if (currentRoute === "data_quality") {
    attachDataQualityEvents(db);
  } else if (currentRoute === "reports") {
    attachReportsEvents(db, (newReportId) => {
      state.activeReportType = newReportId;
      window.activeReportTypeState = newReportId;
      renderUI();
    });
  } else if (currentRoute === "settings") {
    attachSettingsEvents(db);
  }
}

function renderMainView(db, route, selectedYear) {
  switch (route) {
    case "dashboard":
      return renderDashboardView(db, selectedYear);
    case "penyata":
      return renderPenyataView(db, selectedYear);
    case "income":
      return renderIncomeView(db, selectedYear);
    case "expenses":
      return renderExpenseView(db, selectedYear);
    case "claims":
      return renderClaimsView(db, selectedYear);
    case "invoices":
      return renderInvoiceView(db, selectedYear);
    case "quotations":
      return renderQuotationView(db, selectedYear);
    case "inventory":
      return renderInventoryView(db, selectedYear, state.stockSubTab);
    case "assets":
      return renderAssetsView(db, selectedYear);
    case "data_quality":
      return renderDataQualityView(db);
    case "reports":
      return renderReportsView(db, selectedYear, state.activeReportType);
    case "audit":
      return renderAuditLogView();
    case "settings":
      return renderSettingsView(db);
    default:
      return renderDashboardView(db, selectedYear);
  }
}

// Auto init on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});
