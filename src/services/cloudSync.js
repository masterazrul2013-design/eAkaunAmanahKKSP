// Cloud Account & Multi-Device Real-Time Database Synchronization Engine
import { getDatabase } from "./api.js";
import { showToast } from "../components/Toast.js";

const CLOUD_KEY_STORAGE = "akaun_amanah_cloud_key";
export const DEFAULT_CLOUD_KEY = "KKSP-AMANAH-2026";

let isSyncing = false;
let autoSyncInterval = null;
let broadcastChannel = null;
let lastDbSignature = "";

try {
  broadcastChannel = new BroadcastChannel("akaun_amanah_sync_channel");
  broadcastChannel.onmessage = (event) => {
    if (event.data && (event.data.incomes || event.data.invoices)) {
      localStorage.setItem("akaun_amanah_db_v1", JSON.stringify(event.data));
      if (window.appRefreshUI) window.appRefreshUI();
    }
  };
} catch (e) {}

export function getCloudSyncKey() {
  return localStorage.getItem(CLOUD_KEY_STORAGE) || DEFAULT_CLOUD_KEY;
}

export function setCloudSyncKey(key) {
  const cleanKey = (key || "").trim().toUpperCase() || DEFAULT_CLOUD_KEY;
  localStorage.setItem(CLOUD_KEY_STORAGE, cleanKey);
  return cleanKey;
}

function computeSignature(dbObj) {
  if (!dbObj) return "";
  try {
    const incs = (dbObj.incomes || []).length;
    const exps = (dbObj.expenses || []).length;
    const clms = (dbObj.claims || []).length;
    const invs = (dbObj.invoices || []).length;
    const quos = (dbObj.quotations || []).length;
    const asts = (dbObj.assets || []).length;
    const stks = (dbObj.stock || []).length;
    const lastId =
      (dbObj.incomes?.[0]?.id || "") +
      (dbObj.expenses?.[0]?.id || "") +
      (dbObj.invoices?.[0]?.id || "") +
      (dbObj.quotations?.[0]?.id || "");
    return `${incs}-${exps}-${clms}-${invs}-${quos}-${asts}-${stks}_${lastId}_${dbObj.last_synced || ""}`;
  } catch (e) {
    return "";
  }
}

/**
 * Push local database snapshot to Online Cloud Storage (Multi-PC Sync)
 */
export async function pushDatabaseToCloud() {
  const cloudKey = getCloudSyncKey();
  const db = getDatabase();
  const timestamp = new Date().toISOString();
  db.last_synced = timestamp;

  // Broadcast to other local browser windows
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(db);
    } catch (e) {}
  }

  const payload = {
    cloud_key: cloudKey,
    updated_at: timestamp,
    db: db,
  };

  lastDbSignature = computeSignature(db);

  // Store in local vault cache
  try {
    localStorage.setItem(`cloud_vault_${cloudKey}`, JSON.stringify(payload));
  } catch (e) {}

  const cleanKey = cloudKey.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Push to cloud REST endpoints
  const endpoints = [
    `https://api.myjson.online/v1/records/${cleanKey}`,
    `https://kvdb.io/8xZ3Z9Jv2tJ41u8w91/${cleanKey}`,
  ];

  for (const url of endpoints) {
    try {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (e) {}
  }
}

/**
 * Pull latest Database from Online Cloud Storage (Auto Updates UI silently)
 */
export async function pullDatabaseFromCloud(keyInput = null, forceManual = false) {
  if (isSyncing) return { success: false };
  isSyncing = true;

  const cloudKey = keyInput ? setCloudSyncKey(keyInput) : getCloudSyncKey();
  const currentDb = getDatabase();
  const currentSig = computeSignature(currentDb);
  const cleanKey = cloudKey.toLowerCase().replace(/[^a-z0-9]/g, "");

  const endpoints = [
    `https://api.myjson.online/v1/records/${cleanKey}`,
    `https://kvdb.io/8xZ3Z9Jv2tJ41u8w91/${cleanKey}`,
  ];

  for (const epUrl of endpoints) {
    try {
      const res = await fetch(epUrl + `?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const textData = await res.text();
        if (!textData) continue;

        let parsed = null;
        try {
          parsed = JSON.parse(textData);
        } catch (e) {
          continue;
        }

        const cloudPayload = parsed.data || parsed;
        if (cloudPayload && cloudPayload.db) {
          const cloudSig = computeSignature(cloudPayload.db);

          if (cloudSig !== currentSig || forceManual) {
            lastDbSignature = cloudSig;

            // Save new cloud DB into local storage & update state
            localStorage.setItem("akaun_amanah_db_v1", JSON.stringify(cloudPayload.db));
            localStorage.setItem(`cloud_vault_${cloudKey}`, JSON.stringify(cloudPayload));

            showToast(forceManual ? "✓ Data berjaya diselaraskan dari Cloud!" : "☁️ Data baharu dikemaskini secara automatik dari Cloud");
            if (window.appRefreshUI) window.appRefreshUI();
            isSyncing = false;
            return { success: true, db: cloudPayload.db, source: "Pelayan Awan (Online Cloud)" };
          } else {
            isSyncing = false;
            return { success: true, db: currentDb, source: "Sudah Terkini" };
          }
        }
      }
    } catch (e) {}
  }

  isSyncing = false;
  return { success: false, source: "Data Sedia Ada" };
}

/**
 * Start Real-Time Automatic Cloud Synchronization Engine (Polls every 2 seconds)
 */
export function initAutoCloudSync() {
  if (autoSyncInterval) clearInterval(autoSyncInterval);

  // Poll cloud every 2 seconds
  autoSyncInterval = setInterval(() => {
    pullDatabaseFromCloud(null, false);
  }, 2000);

  // Poll immediately on window focus
  window.addEventListener("focus", () => {
    pullDatabaseFromCloud(null, false);
  });

  window.addEventListener("storage", (e) => {
    if (e.key === "akaun_amanah_db_v1") {
      if (window.appRefreshUI) window.appRefreshUI();
    }
  });
}
