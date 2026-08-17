// Quotation Module View Component with Exported Form Modal
import { formatCurrency, STATUS_STYLES } from "../data/schema.js";
import { renderModal, showDeleteConfirmation } from "../components/Modal.js";
import { addRecord, updateRecord, deleteRecord } from "../services/api.js";
import { showToast } from "../components/Toast.js";
import { canEdit } from "../services/auth.js";

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
          <p class="text-xs font-medium text-slate-500 mt-1">Pengurusan Permohonan & Quotation Cadangan Program Akaun Amanah</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-bold text-slate-700 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
            Nilai Sebutharga: <span class="text-purple-700">${formatCurrency(totalAmt)}</span>
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
                <th>NO. RUJUKAN SEBUTHARGA</th>
                <th>TARIKH / BULAN</th>
                <th>TAJUK SEBUTHARGA / PROGRAM</th>
                <th>KLIEN / AGENSI</th>
                <th class="text-right">JUMLAH (RM)</th>
                <th>STATUS</th>
                <th class="text-center">TINDAKAN</th>
              </tr>
            </thead>
            <tbody>
              ${
                records.length === 0
                  ? `<tr><td colspan="7" class="text-center py-8 text-slate-400 font-medium">Tiada rekod sebutharga.</td></tr>`
                  : records
                      .map(
                        (r) => `
                    <tr class="hover:bg-slate-50">
                      <td class="font-bold text-slate-900 font-mono">${r.quotation_no || r.id}</td>
                      <td>${r.quotation_date || r.month + " " + (r.year || "2025")}</td>
                      <td class="font-medium text-slate-800 max-w-xs truncate">${r.description || r.programme || "-"}</td>
                      <td class="text-slate-700 font-semibold">${r.client || "Agensi / Sekolah"}</td>
                      <td class="text-right font-extrabold text-purple-700">${formatCurrency(r.amount)}</td>
                      <td>
                        <span class="status-badge ${STATUS_STYLES[r.status] || STATUS_STYLES.Approved}">
                          ${r.status || "Approved"}
                        </span>
                      </td>
                      <td class="text-center">
                        <div class="flex items-center justify-center gap-1">
                          <button class="p-1.5 hover:bg-purple-50 text-purple-700 rounded-lg text-xs font-bold" title="Cetak Sebutharga Rasmi" onclick="window.printSingleQuotation('${r.id}')">🖨️ Cetak</button>
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

export function openQuotationFormModal(db, record = null) {
  const isEdit = !!record;
  renderModal({
    title: isEdit ? `Kemaskini Sebutharga (${record.quotation_no || record.id})` : "Tambah Rekod Sebutharga Baru",
    bodyHtml: `
      <form id="quo-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">No. Rujukan Sebutharga</label>
            <input type="text" id="quo-no" value="${record ? record.quotation_no || "" : ""}" placeholder="KKSP/700-5/3/2 JLD.5(13)" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Tarikh Sebutharga</label>
            <input type="text" id="quo-date" value="${record ? record.quotation_date || "" : ""}" placeholder="29/04/2025" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Tajuk Sebutharga / Program</label>
          <input type="text" id="quo-desc" value="${record ? record.description || record.programme || "" : ""}" placeholder="PENINGKATAN KEMAHIRAN GURU-GURU TVET..." class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Klien / Agensi / Sekolah</label>
          <input type="text" id="quo-client" value="${record ? record.client || "" : ""}" placeholder="SMK PENDIDIKAN KHAS BUMBUNG LIMA" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Jumlah Harga (RM)</label>
            <input type="number" step="0.01" id="quo-amount" value="${record ? record.amount || "" : ""}" placeholder="27800.00" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-purple-700" required />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Status Sebutharga</label>
            <select id="quo-status" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
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
        label: isEdit ? "Kemaskini" : "Simpan",
        className: "px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold",
        onClick: async (e, close) => {
          const payload = {
            id: isEdit ? record.id : `QUO-2025-${String((db.quotations || []).length + 1).padStart(4, "0")}`,
            quotation_no: document.getElementById("quo-no").value,
            quotation_date: document.getElementById("quo-date").value,
            month: "APR",
            year: "2025",
            programme: document.getElementById("quo-desc").value,
            description: document.getElementById("quo-desc").value,
            client: document.getElementById("quo-client").value,
            amount: parseFloat(document.getElementById("quo-amount").value) || 0,
            status: document.getElementById("quo-status").value,
          };
          if (isEdit) await updateRecord("Quotation", payload);
          else await addRecord("Quotation", payload);
          showToast("✓ Rekod sebutharga berjaya disimpan");
          close();
          if (window.appRefreshUI) window.appRefreshUI();
          else window.location.reload();
        },
      },
    ],
  });
}

export function attachQuotationEvents(db) {
  window.openQuotationFormModal = (dbRef, rec) => openQuotationFormModal(dbRef || db, rec);

  const addBtn = document.getElementById("btn-add-quotation");
  if (addBtn) {
    addBtn.onclick = () => openQuotationFormModal(db);
  }

  // Printable Official Quotation Document Generator Modal
  window.printSingleQuotation = (id) => {
    const rec = (db.quotations || []).find((r) => r.id === id);
    if (!rec) return;

    const orgName = db.settings.organisation_name || "KOLEJ KOMUNITI SUNGAI PETANI";
    const quoNo = rec.quotation_no || rec.id;
    const quoDate = rec.quotation_date || rec.month + " 2025";
    const client = rec.client || "SMK Pendidikan Khas Bumbung Lima / Agensi Pelanggan";
    const title = rec.description || rec.programme || "Program Cadangan Peningkatan Kemahiran TVET";
    const amount = Number(rec.amount) || 0;

    renderModal({
      title: `Cetakan Sebutharga Rasmi - ${quoNo}`,
      bodyHtml: `
        <div id="single-quotation-print" class="bg-white p-6 text-slate-900 border border-slate-200 rounded-2xl flex flex-col justify-between">
          <!-- Top Content Section -->
          <div class="quo-top-section space-y-4 flex-1">
            <!-- Institutional Header with Official SVG Logo -->
            <div class="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div class="flex items-center gap-3">
                <img src="/logo.svg" alt="Kolej Komuniti Sungai Petani Logo" class="h-12 w-auto object-contain" />
                <div>
                  <h2 class="text-base font-black text-slate-900 uppercase tracking-wider">${orgName}</h2>
                  <p class="text-xs font-bold text-slate-700 mt-0.5">Unit Penyelarasan Amanah & Program UPB</p>
                  <p class="text-[11px] text-slate-600">77, Lengkok Cempaka 1, Pusat Bandar Amanjaya, 08000 Sungai Petani, Kedah • Tel: 04-441 2909</p>
                </div>
              </div>
              <div class="text-right space-y-1">
                <span class="px-3 py-1 bg-purple-900 text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-sm">SEBUTHARGA RASMI</span>
                <p class="text-xs font-bold text-slate-900 mt-2">No. Rujukan: <span class="font-mono text-purple-700">${quoNo}</span></p>
                <p class="text-[11px] font-medium text-slate-600">Tarikh: ${quoDate}</p>
              </div>
            </div>

            <!-- Quotation Client Box & Terms -->
            <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <p class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">DIKEMUKAKAN KEPADA (AGENSI / KLIEN):</p>
                <p class="text-sm font-black text-slate-900 mt-0.5">${client}</p>
                <p class="text-[11px] text-slate-600 mt-0.5">Jabatan Pendidikan / Agensi Awam / Swasta</p>
              </div>
              <div class="text-right space-y-1 text-xs">
                <p><span class="font-bold text-slate-500">Status Sebutharga:</span> <span class="font-black text-purple-700 uppercase px-2 py-0.5 bg-purple-100 rounded-md">${rec.status || "APPROVED"}</span></p>
                <p><span class="font-bold text-slate-500">Sah Sehingga:</span> <span class="font-extrabold text-slate-800">31 Disember 2025</span></p>
                <p><span class="font-bold text-slate-500">Pegawai Penyelaras:</span> <span class="font-extrabold text-slate-900">Penyelaras UPB / Amanah</span></p>
              </div>
            </div>

            <!-- Itemized Quotation Table -->
            <div class="pt-1">
              <table class="inst-table">
                <thead>
                  <tr>
                    <th class="w-12 text-center">BIL</th>
                    <th>PERIHAL CADANGAN PROGRAM / SKOP PERKHIDMATAN</th>
                    <th class="text-center w-24">KUANTITI</th>
                    <th class="text-right w-32">KADAR (RM)</th>
                    <th class="text-right w-36">JUMLAH (RM)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="font-bold text-center py-3">1</td>
                    <td class="py-3">
                      <p class="font-black text-slate-900 text-sm">${title}</p>
                      <p class="text-xs text-slate-600 mt-0.5">Cadangan pelaksanaan program latihan kemahiran, modul perkhidmatan & kepakaran Kolej Komuniti Sungai Petani.</p>
                    </td>
                    <td class="text-center font-bold text-slate-800 py-3">1 Program</td>
                    <td class="text-right font-bold text-slate-800 py-3">${formatCurrency(amount)}</td>
                    <td class="text-right font-black text-purple-900 text-base py-3">${formatCurrency(amount)}</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-100 font-black text-sm border-t-2 border-slate-900">
                  <tr>
                    <td colspan="4" class="text-right uppercase py-2.5">JUMLAH KESELURUHAN TAWARAN SEBUTHARGA:</td>
                    <td class="text-right text-purple-900 text-base py-2.5 font-black">${formatCurrency(amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Bottom Section: Signature & Terms -->
          <div class="quo-bottom-section pt-5 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs mt-auto">
            <div class="space-y-1.5">
              <p class="font-extrabold text-slate-900 uppercase">Terma & Syarat Sebutharga (Terms & Conditions):</p>
              <ol class="list-decimal pl-4 text-slate-700 text-[11px] leading-relaxed space-y-0.5">
                <li>Harga sebutharga adalah sah sehingga tarikh yang dinyatakan di atas.</li>
                <li>Pesanan Kerajaan (PO) / Local Order (LO) perlu dikemukakan sebelum pelaksanaan.</li>
              </ol>
            </div>
            <div class="text-center">
              <p class="font-extrabold text-slate-900 uppercase">Disediakan & Dikemukakan Oleh:</p>
              <div class="h-16 sig-line border-b-2 border-slate-900 mx-auto w-3/4 my-2"></div>
              <p class="mt-1 font-black text-slate-900 uppercase text-xs">Penyelaras UPB / Setiausaha Amanah</p>
              <p class="text-slate-600 text-[10px] font-semibold">Cop Rasmi Jabatan & Tarikh</p>
            </div>
          </div>
        </div>
      `,
      footerButtons: [
        { label: "Tutup", className: "px-4 py-2 border rounded-lg text-slate-700", onClick: (e, c) => c() },
        {
          label: "🖨️ Cetak Sebutharga Rasmi",
          className: "px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md transition",
          onClick: () => {
            window.print();
          },
        },
      ],
    });
  };

  window.viewQuotationRecord = (id) => {
    window.printSingleQuotation(id);
  };

  window.editQuotationRecord = (id) => {
    const rec = (db.quotations || []).find((r) => r.id === id);
    if (rec) openQuotationFormModal(db, rec);
  };

  window.deleteQuotationRecord = (id) => {
    showDeleteConfirmation({
      recordId: id,
      description: "Sebutharga",
      amount: "RM 0.00",
      onConfirm: async () => {
        await deleteRecord("Quotation", id);
        showToast("✓ Rekod telah dipadam");
        if (window.appRefreshUI) window.appRefreshUI();
        else window.location.reload();
      },
    });
  };
}
