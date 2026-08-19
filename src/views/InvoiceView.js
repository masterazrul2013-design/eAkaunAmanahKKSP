// Invoice View Component for Akaun Amanah (Secretary Module) with Dynamic Year/Month Auto-Detection
import { formatCurrency, STATUS_STYLES } from "../data/schema.js";
import { renderModal, showDeleteConfirmation } from "../components/Modal.js";
import { addRecord, updateRecord, deleteRecord } from "../services/api.js";
import { showToast } from "../components/Toast.js";
import { canEdit } from "../services/auth.js";

function extractYearAndMonth(dateStr, fallbackYear = "2026") {
  let targetYear = fallbackYear === "ALL" || !fallbackYear ? "2026" : fallbackYear;
  let targetMonth = "JAN";

  if (dateStr) {
    const yMatch = dateStr.match(/\b(202[4-9])\b/);
    if (yMatch) targetYear = yMatch[1];

    const monthKeys = ["JAN", "FEB", "MAC", "APR", "MEI", "JUN", "JUL", "OGOS", "SEPT", "OKT", "NOV", "DIS"];
    const mNumMatch = dateStr.match(/\/(\d{1,2})\//) || dateStr.match(/-(\d{1,2})-/) || dateStr.match(/^\d{4}-(\d{2})-\d{2}$/);
    if (mNumMatch) {
      const idx = parseInt(mNumMatch[1], 10) - 1;
      if (idx >= 0 && idx < 12) targetMonth = monthKeys[idx];
    } else {
      const upper = dateStr.toUpperCase();
      for (const m of monthKeys) {
        if (upper.includes(m)) {
          targetMonth = m;
          break;
        }
      }
    }
  }

  return { year: targetYear, month: targetMonth };
}

export function renderInvoiceView(db, selectedYear) {
  let records = (db.invoices || []).filter((r) => r.record_status !== "DELETED");

  if (selectedYear !== "ALL") {
    records = records.filter((r) => r.year === selectedYear || (!r.year && selectedYear === "2025"));
  }

  const totalAmt = records.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  return `
    <div class="space-y-6 animate-fade-in pb-10">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">MODUL REKOD INVOIS (SETIAUSAHA)</h2>
          <p class="text-xs font-medium text-slate-500 mt-1">Pengurusan Invois Tuntutan Bayaran & Status Tunggakan (${selectedYear === "ALL" ? "Semua Tahun" : "Tahun " + selectedYear})</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-bold text-slate-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200">
            Jumlah Invois: <span class="text-blue-700 font-black">${formatCurrency(totalAmt)}</span>
          </span>
          ${
            canEdit()
              ? `<button id="btn-add-invoice" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                  + Tambah Invois
                </button>`
              : ""
          }
        </div>
      </div>

      <!-- Table Container -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="inst-table">
            <thead>
              <tr>
                <th>NO. INVOIS</th>
                <th>TARIKH INVOIS</th>
                <th>PROGRAM / TAJUK INVOIS</th>
                <th>KLIEN / BAYARAN MELALUI</th>
                <th class="text-right">JUMLAH (RM)</th>
                <th>STATUS</th>
                <th class="text-center">TINDAKAN</th>
              </tr>
            </thead>
            <tbody>
              ${
                records.length === 0
                  ? `<tr><td colspan="7" class="text-center py-8 text-slate-400 font-medium">Tiada rekod invois bagi tahun ${selectedYear}.</td></tr>`
                  : records
                      .map((r) => {
                        const isOverdue = r.status === "Overdue";
                        return `
                    <tr class="hover:bg-slate-50">
                      <td class="font-bold text-slate-900">${r.invoice_no || r.id}</td>
                      <td class="font-semibold">${r.invoice_date || r.month + " " + (r.year || "2026")}</td>
                      <td class="font-medium text-slate-800 max-w-xs truncate">${r.description || r.programme || "-"}</td>
                      <td class="text-slate-700 font-semibold">${r.client || "Pelanggan / Agensi"}</td>
                      <td class="text-right font-extrabold text-blue-700">${formatCurrency(r.amount)}</td>
                      <td>
                        <span class="status-badge ${STATUS_STYLES[r.status] || STATUS_STYLES.Paid}">
                          ${r.status || "Paid"}
                        </span>
                        ${isOverdue ? `<span class="block text-[10px] text-rose-600 font-extrabold mt-0.5">OVERDUE - TUNGGAKAN</span>` : ""}
                      </td>
                      <td class="text-center">
                        <div class="flex items-center justify-center gap-1">
                          <button class="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg text-xs font-bold" title="Cetak Invois Rasmi" onclick="window.printSingleInvoice('${r.id}')">🖨️ Cetak</button>
                          <button class="p-1.5 hover:bg-slate-100 rounded-lg text-xs" title="Lihat" onclick="window.viewInvoiceRecord('${r.id}')">👁️</button>
                          ${
                            canEdit()
                              ? `
                                <button class="p-1.5 hover:bg-slate-100 rounded-lg text-xs" title="Edit" onclick="window.editInvoiceRecord('${r.id}')">✏️</button>
                                <button class="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg text-xs" title="Padam" onclick="window.deleteInvoiceRecord('${r.id}')">🗑️</button>
                              `
                              : ""
                          }
                        </div>
                      </td>
                    </tr>
                  `;
                      })
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function openInvoiceFormModal(db, record = null, currentSelectedYear = "2026") {
  const isEdit = !!record;
  const defaultDate = record ? record.invoice_date || "" : `15/01/${currentSelectedYear === "ALL" ? "2026" : currentSelectedYear}`;

  renderModal({
    title: isEdit ? `Kemaskini Invois (${record.invoice_no || record.id})` : "Tambah Rekod Invois Baru",
    bodyHtml: `
      <form id="invoice-form" class="space-y-4 text-xs">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-bold text-slate-700 mb-1">No. Rujukan Invois</label>
            <input type="text" id="inv-no" value="${record ? record.invoice_no || "" : ""}" placeholder="KKSP01/${currentSelectedYear === "ALL" ? "2026" : currentSelectedYear}" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" required />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tarikh Invois (DD/MM/YYYY)</label>
            <input type="text" id="inv-date" value="${defaultDate}" placeholder="15/01/2026" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" required />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Tajuk Invois / Program</label>
          <input type="text" id="inv-desc" value="${record ? record.description || record.programme || "" : ""}" placeholder="PROGRAM JALINAN ILMU..." class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" required />
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Bayaran Melalui / Klien</label>
          <input type="text" id="inv-client" value="${record ? record.client || "" : ""}" placeholder="SMK AIR MERAH / AGENSI" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" required />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Jumlah Tuntutan (RM)</label>
            <input type="number" step="0.01" id="inv-amount" value="${record ? record.amount || "" : ""}" placeholder="4400.00" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-700" required />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Status Invois</label>
            <select id="inv-status" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold">
              <option value="Paid" ${record && record.status === "Paid" ? "selected" : ""}>Paid (Telah Dibayar)</option>
              <option value="Issued" ${record && record.status === "Issued" ? "selected" : ""}>Issued (Telah Dikeluarkan)</option>
              <option value="Overdue" ${record && record.status === "Overdue" ? "selected" : ""}>Overdue (Tunggakan)</option>
              <option value="Cancelled" ${record && record.status === "Cancelled" ? "selected" : ""}>Cancelled (Batal)</option>
            </select>
          </div>
        </div>
      </form>
    `,
    footerButtons: [
      { label: "Batal", className: "px-4 py-2 border rounded-lg text-slate-700", onClick: (e, c) => c() },
      {
        label: isEdit ? "Kemaskini" : "Simpan Invois",
        className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md",
        onClick: async (e, close) => {
          const form = document.getElementById("invoice-form");
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const dateVal = document.getElementById("inv-date").value;
          const { year, month } = extractYearAndMonth(dateVal, currentSelectedYear);

          const payload = {
            id: isEdit ? record.id : `INV-${year}-${String((db.invoices || []).length + 1).padStart(4, "0")}`,
            invoice_no: document.getElementById("inv-no").value,
            invoice_date: dateVal,
            month: month,
            year: year,
            programme: document.getElementById("inv-desc").value,
            description: document.getElementById("inv-desc").value,
            client: document.getElementById("inv-client").value,
            amount: parseFloat(document.getElementById("inv-amount").value) || 0,
            status: document.getElementById("inv-status").value,
          };
          if (isEdit) await updateRecord("Invoice", payload);
          else await addRecord("Invoice", payload);
          showToast("✓ Rekod invois berjaya disimpan bagi Tahun " + year);
          close();
          if (window.appRefreshUI) window.appRefreshUI();
          else window.location.reload();
        },
      },
    ],
  });
}

export function attachInvoiceEvents(db, selectedYear = "2026") {
  window.openInvoiceFormModal = (dbRef, rec) => openInvoiceFormModal(dbRef || db, rec, selectedYear);

  const addBtn = document.getElementById("btn-add-invoice");
  if (addBtn) {
    addBtn.onclick = () => openInvoiceFormModal(db, null, selectedYear);
  }

  // Printable Official Invoice Generator Modal
  window.printSingleInvoice = (id) => {
    const rec = (db.invoices || []).find((r) => r.id === id);
    if (!rec) return;

    const orgName = db.settings ? db.settings.organisation_name || "KOLEJ KOMUNITI SUNGAI PETANI" : "KOLEJ KOMUNITI SUNGAI PETANI";
    const invNo = rec.invoice_no || rec.id;
    const invDate = rec.invoice_date || rec.month + " " + (rec.year || "2026");
    const client = rec.client || "Pelanggan / Agensi";

    renderModal({
      title: `Cetakan Invois Rasmi - ${invNo}`,
      bodyHtml: `
        <div id="single-invoice-print" class="bg-white p-6 rounded-xl text-slate-900 border border-slate-300 font-sans text-xs space-y-4">
          <div class="flex justify-between items-start border-b pb-4">
            <div>
              <h2 class="text-xl font-extrabold text-blue-900">${orgName}</h2>
              <p class="text-slate-500 font-semibold mt-0.5">Unit Akaun Amanah • Invois Tuntutan Bayaran</p>
            </div>
            <div class="text-right">
              <span class="text-xs uppercase font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">INVOIS RASMI</span>
              <p class="font-mono text-sm font-bold text-slate-900 mt-1">${invNo}</p>
              <p class="text-slate-500 text-[11px]">Tarikh: ${invDate}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">Kepada / Bayaran Melalui:</p>
              <p class="font-bold text-slate-900 text-sm mt-0.5">${client}</p>
            </div>
            <div class="text-right">
              <p class="text-[10px] font-bold text-slate-400 uppercase">Status Pembayaran:</p>
              <span class="inline-block mt-1 font-bold ${rec.status === "Paid" ? "text-emerald-700" : "text-rose-600"}">${rec.status || "Issued"}</span>
            </div>
          </div>

          <table class="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <th class="p-2 border-r border-slate-300">Bil</th>
                <th class="p-2 border-r border-slate-300">Keterangan / Program</th>
                <th class="p-2 text-right">Jumlah (RM)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="p-2 border-r border-slate-300 font-mono">1</td>
                <td class="p-2 border-r border-slate-300 font-semibold">${rec.description || rec.programme}</td>
                <td class="p-2 text-right font-bold text-slate-900">${formatCurrency(rec.amount)}</td>
              </tr>
            </tbody>
          </table>

          <div class="flex justify-end pt-2">
            <div class="w-1/2 bg-blue-50 p-3 rounded-lg border border-blue-200 text-right">
              <p class="text-xs font-bold text-slate-600">JUMLAH KESELURUHAN:</p>
              <p class="text-xl font-black text-blue-900">${formatCurrency(rec.amount)}</p>
            </div>
          </div>

          <div class="pt-6 mt-6 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
            <p>Cetakan Komputer Sah - Tidak Memerlukan Tandatangan Fizikal</p>
            <p>Mukasurat 1 / 1</p>
          </div>
        </div>
      `,
      footerButtons: [
        { label: "Tutup", className: "px-4 py-2 border rounded-lg text-slate-700", onClick: (e, c) => c() },
        {
          label: "🖨️ Cetak Invois Sekarang",
          className: "px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md",
          onClick: () => window.print(),
        },
      ],
    });
  };

  window.viewInvoiceRecord = (id) => {
    window.printSingleInvoice(id);
  };

  window.editInvoiceRecord = (id) => {
    const rec = (db.invoices || []).find((r) => r.id === id);
    if (rec) openInvoiceFormModal(db, rec, selectedYear);
  };

  window.deleteInvoiceRecord = (id) => {
    const rec = (db.invoices || []).find((r) => r.id === id);
    if (!rec) return;
    showDeleteConfirmation({
      recordId: rec.id,
      description: rec.description || rec.programme,
      amount: formatCurrency(rec.amount),
      onConfirm: async () => {
        await deleteRecord("Invoice", rec.id);
        showToast("✓ Rekod invois dipadam");
        if (window.appRefreshUI) window.appRefreshUI();
        else window.location.reload();
      },
    });
  };
}
