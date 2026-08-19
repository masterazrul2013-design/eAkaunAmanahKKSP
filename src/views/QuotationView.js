// Quotation View Component for Akaun Amanah (Secretary Module) with Dynamic Year/Month Auto-Detection
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

export function renderQuotationView(db, selectedYear) {
  let records = (db.quotations || []).filter((r) => r.record_status !== "DELETED");

  if (selectedYear !== "ALL") {
    records = records.filter((r) => r.year === selectedYear || (!r.year && selectedYear === "2025"));
  }

  const totalAmt = records.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  return `
    <div class="space-y-6 animate-fade-in pb-10">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">MODUL REKOD SEBUTHARGA (SETIAUSAHA)</h2>
          <p class="text-xs font-medium text-slate-500 mt-1">Penjejakan Cadangan Sebutharga & Kelulusan Pelanggan (${selectedYear === "ALL" ? "Semua Tahun" : "Tahun " + selectedYear})</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-bold text-slate-700 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
            Nilai Pipeline Sebutharga: <span class="text-purple-700 font-black">${formatCurrency(totalAmt)}</span>
          </span>
          ${
            canEdit()
              ? `<button id="btn-add-quotation" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                  + Tambah Sebutharga
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
                <th>NO. SEBUTHARGA</th>
                <th>TARIKH</th>
                <th>TAJUK PROGRAM / CADANGAN SEBUTHARGA</th>
                <th>KLIEN / AGENSI / SEKOLAH</th>
                <th class="text-right">JUMLAH ANGGARAN (RM)</th>
                <th>STATUS</th>
                <th class="text-center">TINDAKAN</th>
              </tr>
            </thead>
            <tbody>
              ${
                records.length === 0
                  ? `<tr><td colspan="7" class="text-center py-8 text-slate-400 font-medium">Tiada rekod sebutharga bagi tahun ${selectedYear}.</td></tr>`
                  : records
                      .map(
                        (r) => `
                    <tr class="hover:bg-slate-50">
                      <td class="font-bold text-slate-900 font-mono text-xs">${r.quotation_no || r.id}</td>
                      <td class="font-semibold">${r.quotation_date || r.month + " " + (r.year || "2026")}</td>
                      <td class="font-medium text-slate-800 max-w-xs truncate">${r.description || r.programme || "-"}</td>
                      <td class="text-slate-700 font-semibold">${r.client || "Agensi Pelanggan"}</td>
                      <td class="text-right font-extrabold text-purple-700">${formatCurrency(r.amount)}</td>
                      <td>
                        <span class="status-badge ${STATUS_STYLES[r.status] || STATUS_STYLES.Approved}">
                          ${r.status || "Approved"}
                        </span>
                      </td>
                      <td class="text-center">
                        <div class="flex items-center justify-center gap-1">
                          <button class="p-1.5 hover:bg-purple-50 text-purple-600 rounded-lg text-xs font-bold" title="Cetak Sebutharga Rasmi" onclick="window.printSingleQuotation('${r.id}')">🖨️ Cetak</button>
                          <button class="p-1.5 hover:bg-slate-100 rounded-lg text-xs" title="Lihat" onclick="window.viewQuotationRecord('${r.id}')">👁️</button>
                          ${
                            canEdit()
                              ? `
                                <button class="p-1.5 hover:bg-slate-100 rounded-lg text-xs" title="Edit" onclick="window.editQuotationRecord('${r.id}')">✏️</button>
                                <button class="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg text-xs" title="Padam" onclick="window.deleteQuotationRecord('${r.id}')">🗑️</button>
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

export function openQuotationFormModal(db, record = null, currentSelectedYear = "2026") {
  const isEdit = !!record;
  const defaultDate = record ? record.quotation_date || "" : `15/01/${currentSelectedYear === "ALL" ? "2026" : currentSelectedYear}`;

  renderModal({
    title: isEdit ? `Kemaskini Sebutharga (${record.quotation_no || record.id})` : "Tambah Rekod Sebutharga Baru",
    bodyHtml: `
      <form id="quo-form" class="space-y-4 text-xs">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-bold text-slate-700 mb-1">No. Rujukan Sebutharga</label>
            <input type="text" id="quo-no" value="${record ? record.quotation_no || "" : ""}" placeholder="KKSP/700-5/3/2 JLD.5(13)" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" required />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tarikh Sebutharga (DD/MM/YYYY)</label>
            <input type="text" id="quo-date" value="${defaultDate}" placeholder="15/01/2026" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" required />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Tajuk Sebutharga / Program</label>
          <input type="text" id="quo-desc" value="${record ? record.description || record.programme || "" : ""}" placeholder="PENINGKATAN KEMAHIRAN GURU-GURU TVET..." class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" required />
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Klien / Agensi / Sekolah</label>
          <input type="text" id="quo-client" value="${record ? record.client || "" : ""}" placeholder="SMK PENDIDIKAN KHAS / AGENSI" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold" required />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Jumlah Harga (RM)</label>
            <input type="number" step="0.01" id="quo-amount" value="${record ? record.amount || "" : ""}" placeholder="27800.00" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-purple-700" required />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Status Sebutharga</label>
            <select id="quo-status" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold">
              <option value="Approved" ${record && record.status === "Approved" ? "selected" : ""}>Approved (Diluluskan)</option>
              <option value="Submitted" ${record && record.status === "Submitted" ? "selected" : ""}>Submitted (Disemak)</option>
              <option value="Draft" ${record && record.status === "Draft" ? "selected" : ""}>Draft</option>
              <option value="Converted to PO" ${record && record.status === "Converted to PO" ? "selected" : ""}>Converted to PO</option>
            </select>
          </div>
        </div>
      </form>
    `,
    footerButtons: [
      { label: "Batal", className: "px-4 py-2 border rounded-lg text-slate-700", onClick: (e, c) => c() },
      {
        label: isEdit ? "Kemaskini" : "Simpan Sebutharga",
        className: "px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-md",
        onClick: async (e, close) => {
          const form = document.getElementById("quo-form");
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const dateVal = document.getElementById("quo-date").value;
          const { year, month } = extractYearAndMonth(dateVal, currentSelectedYear);

          const payload = {
            id: isEdit ? record.id : `QUO-${year}-${String((db.quotations || []).length + 1).padStart(4, "0")}`,
            quotation_no: document.getElementById("quo-no").value,
            quotation_date: dateVal,
            month: month,
            year: year,
            programme: document.getElementById("quo-desc").value,
            description: document.getElementById("quo-desc").value,
            client: document.getElementById("quo-client").value,
            amount: parseFloat(document.getElementById("quo-amount").value) || 0,
            status: document.getElementById("quo-status").value,
          };
          if (isEdit) await updateRecord("Quotation", payload);
          else await addRecord("Quotation", payload);
          showToast("✓ Rekod sebutharga berjaya disimpan bagi Tahun " + year);
          close();
          if (window.appRefreshUI) window.appRefreshUI();
          else window.location.reload();
        },
      },
    ],
  });
}

export function attachQuotationEvents(db, selectedYear = "2026") {
  window.openQuotationFormModal = (dbRef, rec) => openQuotationFormModal(dbRef || db, rec, selectedYear);

  const addBtn = document.getElementById("btn-add-quotation");
  if (addBtn) {
    addBtn.onclick = () => openQuotationFormModal(db, null, selectedYear);
  }

  // Printable Official Quotation Document Generator Modal
  window.printSingleQuotation = (id) => {
    const rec = (db.quotations || []).find((r) => r.id === id);
    if (!rec) return;

    const orgName = db.settings ? db.settings.organisation_name || "KOLEJ KOMUNITI SUNGAI PETANI" : "KOLEJ KOMUNITI SUNGAI PETANI";
    const quoNo = rec.quotation_no || rec.id;
    const quoDate = rec.quotation_date || rec.month + " " + (rec.year || "2026");
    const client = rec.client || "SMK Pendidikan Khas Bumbung Lima";

    renderModal({
      title: `Cetakan Sebutharga Rasmi - ${quoNo}`,
      bodyHtml: `
        <div id="single-quotation-print" class="bg-white p-6 rounded-xl text-slate-900 border border-slate-300 font-sans text-xs space-y-4">
          <div class="flex justify-between items-start border-b pb-4">
            <div>
              <h2 class="text-xl font-extrabold text-purple-900">${orgName}</h2>
              <p class="text-slate-500 font-semibold mt-0.5">Unit Akaun Amanah • Dokumen Sebutharga</p>
            </div>
            <div class="text-right">
              <span class="text-xs uppercase font-extrabold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">SEBUTHARGA RASMI</span>
              <p class="font-mono text-sm font-bold text-slate-900 mt-1">${quoNo}</p>
              <p class="text-slate-500 text-[11px]">Tarikh: ${quoDate}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase">Disediakan Untuk / Klien:</p>
              <p class="font-bold text-slate-900 text-sm mt-0.5">${client}</p>
            </div>
            <div class="text-right">
              <p class="text-[10px] font-bold text-slate-400 uppercase">Status Sebutharga:</p>
              <span class="inline-block mt-1 font-bold text-purple-700">${rec.status || "Approved"}</span>
            </div>
          </div>

          <table class="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <th class="p-2 border-r border-slate-300">Bil</th>
                <th class="p-2 border-r border-slate-300">Perkara / Cadangan Program</th>
                <th class="p-2 text-right">Harga Anggaran (RM)</th>
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
            <div class="w-1/2 bg-purple-50 p-3 rounded-lg border border-purple-200 text-right">
              <p class="text-xs font-bold text-slate-600">JUMLAH SEBUTHARGA:</p>
              <p class="text-xl font-black text-purple-900">${formatCurrency(rec.amount)}</p>
            </div>
          </div>

          <div class="pt-6 mt-6 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
            <p>Sah Dalam Tempoh 30 Hari Dari Tarikh Dikeluarkan</p>
            <p>Mukasurat 1 / 1</p>
          </div>
        </div>
      `,
      footerButtons: [
        { label: "Tutup", className: "px-4 py-2 border rounded-lg text-slate-700", onClick: (e, c) => c() },
        {
          label: "🖨️ Cetak Sebutharga Sekarang",
          className: "px-4 py-2 bg-purple-600 text-white rounded-lg font-bold shadow-md",
          onClick: () => window.print(),
        },
      ],
    });
  };

  window.viewQuotationRecord = (id) => {
    window.printSingleQuotation(id);
  };

  window.editQuotationRecord = (id) => {
    const rec = (db.quotations || []).find((r) => r.id === id);
    if (rec) openQuotationFormModal(db, rec, selectedYear);
  };

  window.deleteQuotationRecord = (id) => {
    const rec = (db.quotations || []).find((r) => r.id === id);
    if (!rec) return;
    showDeleteConfirmation({
      recordId: rec.id,
      description: rec.description || rec.programme,
      amount: formatCurrency(rec.amount),
      onConfirm: async () => {
        await deleteRecord("Quotation", rec.id);
        showToast("✓ Rekod sebutharga dipadam");
        if (window.appRefreshUI) window.appRefreshUI();
        else window.location.reload();
      },
    });
  };
}
