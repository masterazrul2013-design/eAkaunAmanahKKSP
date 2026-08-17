// Income Module View Component with Exported Form Modal
import { formatCurrency, STATUS_STYLES } from "../data/schema.js";
import { renderModal, showDeleteConfirmation } from "../components/Modal.js";
import { addRecord, updateRecord, deleteRecord } from "../services/api.js";
import { showToast } from "../components/Toast.js";
import { canEdit } from "../services/auth.js";

export function renderIncomeView(db, selectedYear) {
  let records = (db.incomes || []).filter((r) => r.record_status !== "DELETED");
  if (selectedYear !== "ALL") {
    records = records.filter((r) => r.year === selectedYear || (!r.year && selectedYear === "2025"));
  }

  const totalIncome = records.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  return `
    <div class="space-y-6 animate-fade-in pb-10">
      <!-- Header Bar -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">MODUL PENDAPATAN & TERIMAAN (RESIT)</h2>
          <p class="text-xs font-medium text-slate-500 mt-1">Pengurusan Rekod Terimaan Yuran, Program & Sumbangan Akaun Amanah</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-bold text-slate-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
            Jumlah Terimaan: <span class="text-emerald-700">${formatCurrency(totalIncome)}</span>
          </span>
          ${
            canEdit()
              ? `<button id="btn-add-income" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                  + Tambah Pendapatan
                </button>`
              : ""
          }
        </div>
      </div>

      <!-- Data Table Container -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="inst-table">
            <thead>
              <tr>
                <th>NO. ID</th>
                <th>TARIKH</th>
                <th>BULAN</th>
                <th>TAJUK / KOD PROGRAM</th>
                <th>PEMBAYAR</th>
                <th>NO. RESIT</th>
                <th class="text-right">JUMLAH (RM)</th>
                <th>STATUS</th>
                <th class="text-center">TINDAKAN</th>
              </tr>
            </thead>
            <tbody>
              ${
                records.length === 0
                  ? `<tr><td colspan="9" class="text-center py-8 text-slate-400 font-medium">Tiada rekod pendapatan ditemui.</td></tr>`
                  : records
                      .map(
                        (r) => `
                    <tr class="hover:bg-slate-50">
                      <td class="font-bold text-slate-900 font-mono">${r.id}</td>
                      <td>${r.date || r.month + " " + (r.year || "2025")}</td>
                      <td><span class="px-2 py-0.5 bg-slate-100 text-slate-700 font-extrabold rounded-md text-[11px]">${r.month}</span></td>
                      <td class="font-semibold text-slate-800 max-w-xs truncate">${r.programme}</td>
                      <td class="text-slate-700 font-medium">${r.payer || "Peserta"}</td>
                      <td class="font-mono text-xs text-slate-500">${r.receipt_no || "-"}</td>
                      <td class="text-right font-extrabold text-emerald-700">${formatCurrency(r.amount)}</td>
                      <td>
                        <span class="status-badge ${STATUS_STYLES[r.status] || STATUS_STYLES.Paid}">
                          ${r.status || "Paid"}
                        </span>
                      </td>
                      <td class="text-center">
                        <div class="flex items-center justify-center gap-1">
                          <button class="p-1.5 hover:bg-slate-100 rounded-lg text-xs" title="Lihat" onclick="window.viewIncomeRecord('${r.id}')">👁️</button>
                          ${
                            canEdit()
                              ? `
                                <button class="p-1.5 hover:bg-slate-100 rounded-lg text-xs" title="Edit" onclick="window.editIncomeRecord('${r.id}')">✏️</button>
                                <button class="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg text-xs" title="Padam" onclick="window.deleteIncomeRecord('${r.id}')">🗑️</button>
                              `
                              : ""
                          }
                        </div>
                      </td>
                    </tr>
                  `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function openIncomeFormModal(db, record = null) {
  const isEdit = !!record;
  const modalTitle = isEdit ? `Kemaskini Rekod Pendapatan (${record.id})` : "Tambah Rekod Pendapatan Baru";

  renderModal({
    title: modalTitle,
    bodyHtml: `
      <form id="income-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Tarikh (DD/MM/YYYY)</label>
            <input type="text" id="inc-date" value="${record ? record.date || "" : ""}" placeholder="17/08/2025" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Bulan</label>
            <select id="inc-month" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
              ${["JAN", "FEB", "MAC", "APR", "MEI", "JUN", "JUL", "OGOS", "SEPT", "OKT", "NOV", "DIS"]
                .map((m) => `<option value="${m}" ${record && record.month === m ? "selected" : ""}>${m}</option>`)
                .join("")}
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Tajuk Program / Kod Program</label>
          <input type="text" id="inc-programme" value="${record ? record.programme || "" : ""}" placeholder="Terimaan Yuran Program / Kod P1001" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Pembayar / Pelanggan</label>
            <input type="text" id="inc-payer" value="${record ? record.payer || "" : ""}" placeholder="Peserta / Agensi" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">No. Resit / Rujukan</label>
            <input type="text" id="inc-receipt" value="${record ? record.receipt_no || "" : ""}" placeholder="Terimaan R300001" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Jumlah (RM)</label>
            <input type="number" step="0.01" id="inc-amount" value="${record ? record.amount || "" : ""}" placeholder="450.00" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700" required />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Status Bayaran</label>
            <select id="inc-status" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
              <option value="Paid" ${record && record.status === "Paid" ? "selected" : ""}>Paid (Selesai)</option>
              <option value="Pending" ${record && record.status === "Pending" ? "selected" : ""}>Pending</option>
            </select>
          </div>
        </div>
      </form>
    `,
    footerButtons: [
      {
        label: "Batal",
        className: "px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold",
        onClick: (e, close) => close(),
      },
      {
        label: isEdit ? "Kemaskini Rekod" : "Simpan Rekod",
        className: "px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-md",
        onClick: async (e, close) => {
          const form = document.getElementById("income-form");
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }
          const payload = {
            id: isEdit ? record.id : `INC-2025-${String((db.incomes || []).length + 1).padStart(4, "0")}`,
            date: document.getElementById("inc-date").value,
            month: document.getElementById("inc-month").value,
            year: "2025",
            programme: document.getElementById("inc-programme").value,
            payer: document.getElementById("inc-payer").value,
            receipt_no: document.getElementById("inc-receipt").value,
            amount: parseFloat(document.getElementById("inc-amount").value) || 0,
            status: document.getElementById("inc-status").value,
          };

          if (isEdit) await updateRecord("Income", payload);
          else await addRecord("Income", payload);

          showToast(isEdit ? "✓ Rekod pendapatan dikemaskini" : "✓ Rekod pendapatan berjaya ditambah");
          close();
          if (window.appRefreshUI) window.appRefreshUI();
          else window.location.reload();
        },
      },
    ],
  });
}

export function attachIncomeEvents(db) {
  window.openIncomeFormModal = (dbRef, rec) => openIncomeFormModal(dbRef || db, rec);

  const addBtn = document.getElementById("btn-add-income");
  if (addBtn) {
    addBtn.onclick = () => openIncomeFormModal(db);
  }

  window.viewIncomeRecord = (id) => {
    const rec = (db.incomes || []).find((r) => r.id === id);
    if (!rec) return;
    renderModal({
      title: `Butiran Terimaan Pendapatan - ${rec.id}`,
      bodyHtml: `
        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div><span class="font-bold text-slate-500">No. ID:</span> <span class="font-bold text-slate-900">${rec.id}</span></div>
            <div><span class="font-bold text-slate-500">Tarikh:</span> ${rec.date || rec.month}</div>
            <div><span class="font-bold text-slate-500">Bulan:</span> ${rec.month}</div>
            <div><span class="font-bold text-slate-500">No. Resit:</span> ${rec.receipt_no || "-"}</div>
          </div>
          <div><span class="font-bold text-slate-500">Program / Kod:</span> <p class="text-sm font-bold text-slate-900 mt-0.5">${rec.programme}</p></div>
          <div><span class="font-bold text-slate-500">Pembayar / Pelanggan:</span> <p class="font-semibold text-slate-800">${rec.payer || "-"}</p></div>
          <div class="pt-2 border-t border-slate-200 flex justify-between items-center">
            <span class="font-bold text-slate-700">Jumlah Terimaan:</span>
            <span class="text-lg font-black text-emerald-700">${formatCurrency(rec.amount)}</span>
          </div>
        </div>
      `,
      footerButtons: [{ label: "Tutup", className: "px-4 py-2 border rounded-lg text-slate-700", onClick: (e, c) => c() }],
    });
  };

  window.editIncomeRecord = (id) => {
    const rec = (db.incomes || []).find((r) => r.id === id);
    if (rec) openIncomeFormModal(db, rec);
  };

  window.deleteIncomeRecord = (id) => {
    const rec = (db.incomes || []).find((r) => r.id === id);
    if (!rec) return;
    showDeleteConfirmation({
      recordId: rec.id,
      description: rec.programme,
      amount: formatCurrency(rec.amount),
      onConfirm: async () => {
        await deleteRecord("Income", rec.id);
        showToast("✓ Rekod pendapatan dipadam");
        if (window.appRefreshUI) window.appRefreshUI();
        else window.location.reload();
      },
    });
  };
}
