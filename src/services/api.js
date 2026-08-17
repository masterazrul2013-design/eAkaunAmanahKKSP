// Database & API Synchronization Service
import {
  INITIAL_PENYATA,
  INITIAL_INCOME,
  INITIAL_EXPENSES,
  INITIAL_CLAIMS,
  INITIAL_INVOICES,
  INITIAL_QUOTATIONS,
  INITIAL_STOCK,
  INITIAL_USERS,
  INITIAL_SETTINGS,
} from "../data/seedData.js";
import { logAction } from "./audit.js";
import { getCurrentUser } from "./auth.js";

const DB_KEY = "akaun_amanah_db_v1";

/**
 * Initialize Database from LocalStorage or Seed Data
 */
export function getDatabase() {
  const stored = localStorage.getItem(DB_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing stored database, reinitializing:", e);
    }
  }

  const initialDb = {
    penyata: INITIAL_PENYATA,
    incomes: INITIAL_INCOME,
    expenses: INITIAL_EXPENSES,
    claims: INITIAL_CLAIMS,
    invoices: INITIAL_INVOICES,
    quotations: INITIAL_QUOTATIONS,
    stock: INITIAL_STOCK,
    users: INITIAL_USERS,
    settings: INITIAL_SETTINGS,
    last_synced: new Date().toISOString(),
  };

  localStorage.setItem(DB_KEY, JSON.stringify(initialDb));
  return initialDb;
}

export function saveDatabase(db) {
  db.last_synced = new Date().toISOString();
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("db-updated", { detail: db }));
}

export function resetToSeedData() {
  localStorage.removeItem(DB_KEY);
  const db = getDatabase();
  logAction(getCurrentUser().name, "RESET_SEED", "SYSTEM", "SYS-001", "", "Reset database to initial seed dataset");
  saveDatabase(db);
  return db;
}

// Global API Mode & Settings
export function getSettings() {
  const db = getDatabase();
  return db.settings || INITIAL_SETTINGS;
}

export function updateSettings(newSettings) {
  const db = getDatabase();
  const oldSettings = db.settings;
  db.settings = { ...db.settings, ...newSettings };
  saveDatabase(db);
  logAction(getCurrentUser().name, "UPDATE_SETTINGS", "SETTINGS", "SET-001", oldSettings, newSettings);
  return db.settings;
}

// Generic CRUD functions
export async function fetchModuleData(moduleKey) {
  const db = getDatabase();
  const settings = getSettings();

  // If live mode configured, attempt API sync
  if (settings.api_mode === "LIVE" && settings.google_sheet_url) {
    try {
      const res = await fetch(`${settings.google_sheet_url}?action=get${moduleKey}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        db[moduleKey.toLowerCase()] = json.data;
        saveDatabase(db);
        return json.data;
      }
    } catch (err) {
      console.warn(`GAS Live API call failed for ${moduleKey}, fallback to local cache:`, err);
    }
  }

  return (db[moduleKey.toLowerCase()] || []).filter((r) => r.record_status !== "DELETED");
}

export async function addRecord(moduleName, record) {
  const db = getDatabase();
  const user = getCurrentUser();
  const now = new Date().toISOString();

  record.created_at = now;
  record.updated_at = now;
  record.created_by = user.name;
  record.record_status = "ACTIVE";

  const keyMap = {
    Income: "incomes",
    Expense: "expenses",
    Claim: "claims",
    Invoice: "invoices",
    Quotation: "quotations",
    Stock: "stock",
  };

  const listKey = keyMap[moduleName] || moduleName.toLowerCase();
  if (!db[listKey]) db[listKey] = [];
  db[listKey].unshift(record);

  saveDatabase(db);
  logAction(user.name, "CREATE", moduleName.toUpperCase(), record.id, "", record);

  // Sync to GAS if live
  const settings = getSettings();
  if (settings.api_mode === "LIVE" && settings.google_sheet_url) {
    try {
      await fetch(settings.google_sheet_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: `add${moduleName}`, data: record, user: user.name }),
      });
    } catch (e) {
      console.error("Live sync failed:", e);
    }
  }

  return record;
}

export async function updateRecord(moduleName, record) {
  const db = getDatabase();
  const user = getCurrentUser();
  const now = new Date().toISOString();

  const keyMap = {
    Income: "incomes",
    Expense: "expenses",
    Claim: "claims",
    Invoice: "invoices",
    Quotation: "quotations",
    Stock: "stock",
  };

  const listKey = keyMap[moduleName] || moduleName.toLowerCase();
  const list = db[listKey] || [];
  const idx = list.findIndex((r) => r.id === record.id);

  if (idx !== -1) {
    const oldRecord = { ...list[idx] };
    record.updated_at = now;
    list[idx] = { ...list[idx], ...record };
    saveDatabase(db);
    logAction(user.name, "UPDATE", moduleName.toUpperCase(), record.id, oldRecord, record);

    const settings = getSettings();
    if (settings.api_mode === "LIVE" && settings.google_sheet_url) {
      try {
        await fetch(settings.google_sheet_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: `update${moduleName}`, data: record, user: user.name }),
        });
      } catch (e) {
        console.error("Live update failed:", e);
      }
    }
    return list[idx];
  }
  throw new Error(`Record ${record.id} not found`);
}

export async function deleteRecord(moduleName, recordId) {
  const db = getDatabase();
  const user = getCurrentUser();

  const keyMap = {
    Income: "incomes",
    Expense: "expenses",
    Claim: "claims",
    Invoice: "invoices",
    Quotation: "quotations",
    Stock: "stock",
  };

  const listKey = keyMap[moduleName] || moduleName.toLowerCase();
  const list = db[listKey] || [];
  const item = list.find((r) => r.id === recordId);

  if (item) {
    // Soft Delete
    item.record_status = "DELETED";
    item.updated_at = new Date().toISOString();
    saveDatabase(db);
    logAction(user.name, "SOFT_DELETE", moduleName.toUpperCase(), recordId, "ACTIVE", "DELETED");

    const settings = getSettings();
    if (settings.api_mode === "LIVE" && settings.google_sheet_url) {
      try {
        await fetch(settings.google_sheet_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: `delete${moduleName}`, data: { id: recordId }, user: user.name }),
        });
      } catch (e) {
        console.error("Live delete failed:", e);
      }
    }
    return true;
  }
  return false;
}
