// Invois Module View Component with Exported Form Modal
import { formatCurrency, STATUS_STYLES } from "../data/schema.js";
import { renderModal, showDeleteConfirmation } from "../components/Modal.js";
import { addRecord, updateRecord, deleteRecord } from "../services/api.js";
import { showToast } from "../components/Toast.js";
import { canEdit } from "../services/auth.js";

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
          <p class="text-xs font-medium text-slate-500 mt-1">Pengurusan Invois Tuntutan Bayaran & Status Tunggakan</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-bold text-slate-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200">
            Jumlah Invois: <span class="text-blue-700">${formatCurrency(totalAmt)}</span>
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
                  ? `<tr><td colspan="7" class="text-center py-8 text-slate-400 font-medium">Tiada rekod invois.</td></tr>`
                  : records
                      .map((r) => {
                        const isOverdue = r.status === "Overdue";
                        return `
                    <tr class="hover:bg-slate-50">
                      <td class="font-bold text-slate-900">${r.invoice_no || r.id}</td>
                      <td>${r.invoice_date || r.month + " " + (r.year || "2025")}</td>
                      <td class="font-medium text-slate-800 max-w-xs truncate">${r.description || r.programme || "-"}</td>
                      <td class="text-slate-700 font-semibold">${r.client || "Pelanggan / Agensi"}</td>
                      <td class="text-right font-extrabold text-blue-700">${formatCurrency(r.amount)}</td>
                      <td>
                        <span class="status-badge ${STATUS_STYLES[r.status] || STATUS_STYLES.Paid}">
                          ${r.status || "Paid"}
                        </span>
                        ${isOverdue ? `<span class="block text-[10px] text-rose-600 font-extrabold mt-0.5">OVERDUE - 24 DAYS</span>` : ""}
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

export function openInvoiceFormModal(db, record = null) {
  const isEdit = !!record;
  renderModal({
    title: isEdit ? `Kemaskini Invois (${record.invoice_no || record.id})` : "Tambah Rekod Invois Baru",
    bodyHtml: `
      <form id="invoice-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">No. Rujukan Invois</label>
            <input type="text" id="inv-no" value="${record ? record.invoice_no || "" : ""}" placeholder="KKSP01/2025" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Tarikh Invois</label>
            <input type="text" id="inv-date" value="${record ? record.invoice_date || "" : ""}" placeholder="24/04/2025" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Tajuk Invois / Program</label>
          <input type="text" id="inv-desc" value="${record ? record.description || record.programme || "" : ""}" placeholder="PROGRAM JALINAN ILMU..." class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" required />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Bayaran Melalui / Klien</label>
          <input type="text" id="inv-client" value="${record ? record.client || "" : ""}" placeholder="SMK AIR MERAH" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Jumlah Tuntutan (RM)</label>
            <input type="number" step="0.01" id="inv-amount" value="${record ? record.amount || "" : ""}" placeholder="4400.00" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-700" required />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Status Invois</label>
            <select id="inv-status" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
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
        label: isEdit ? "Kemaskini" : "Simpan",
        className: "px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold",
        onClick: async (e, close) => {
          const payload = {
            id: isEdit ? record.id : `INV-2025-${String((db.invoices || []).length + 1).padStart(4, "0")}`,
            invoice_no: document.getElementById("inv-no").value,
            invoice_date: document.getElementById("inv-date").value,
            month: "APR",
            year: "2025",
            programme: document.getElementById("inv-desc").value,
            description: document.getElementById("inv-desc").value,
            client: document.getElementById("inv-client").value,
            amount: parseFloat(document.getElementById("inv-amount").value) || 0,
            status: document.getElementById("inv-status").value,
          };
          if (isEdit) await updateRecord("Invoice", payload);
          else await addRecord("Invoice", payload);
          showToast("✓ Rekod invois berjaya disimpan");
          close();
          if (window.appRefreshUI) window.appRefreshUI();
          else window.location.reload();
        },
      },
    ],
  });
}

export function attachInvoiceEvents(db) {
  window.openInvoiceFormModal = (dbRef, rec) => openInvoiceFormModal(dbRef || db, rec);

  const addBtn = document.getElementById("btn-add-invoice");
  if (addBtn) {
    addBtn.onclick = () => openInvoiceFormModal(db);
  }

  // Printable Official Invoice Generator Modal
  window.printSingleInvoice = (id) => {
    const rec = (db.invoices || []).find((r) => r.id === id);
    if (!rec) return;

    const orgName = db.settings.organisation_name || "KOLEJ KOMUNITI SUNGAI PETANI";
    const invNo = rec.invoice_no || rec.id;
    const invDate = rec.invoice_date || rec.month + " 2025";
    const client = rec.client || "SMK Air Merah / Agensi Pelanggan";
    const title = rec.description || rec.programme || "Program Latihan Amanah";
    const amount = Number(rec.amount) || 0;

    renderModal({
      title: `Cetakan Invois Rasmi - ${invNo}`,
      bodyHtml: `
        <div id="single-invoice-print" class="bg-white p-6 text-slate-900 border border-slate-200 rounded-2xl flex flex-col justify-between">
          <!-- Top Content Section -->
          <div class="inv-top-section space-y-4 flex-1">
            <!-- Institutional Header with Official SVG Logo -->
            <div class="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div class="flex items-center gap-3">
                <img src="/logo.svg" alt="Kolej Komuniti Sungai Petani Logo" class="h-12 w-auto object-contain" />
                <div>
                  <h2 class="text-base font-black text-slate-900 uppercase tracking-wider">${orgName}</h2>
                  <p class="text-xs font-bold text-slate-700 mt-0.5">Unit Akaun Amanah & Pembangunan Kerjaya</p>
                  <p class="text-[11px] text-slate-600">77, Lengkok Cempaka 1, Pusat Bandar Amanjaya, 08000 Sungai Petani, Kedah • Tel: 04-441 2909</p>
                </div>
              </div>
              <div class="text-right space-y-1">
                <span class="px-3 py-1 bg-blue-900 text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-sm">INVOIS RASMI</span>
                <p class="text-xs font-bold text-slate-900 mt-2">No. Invois: <span class="font-mono text-blue-700">${invNo}</span></p>
                <p class="text-[11px] font-medium text-slate-600">Tarikh: ${invDate}</p>
              </div>
            </div>

            <!-- Bill To Box & Details -->
            <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <p class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">DIBILKAN KEPADA (AGENSI / KLIEN):</p>
                <p class="text-sm font-black text-slate-900 mt-0.5">${client}</p>
                <p class="text-[11px] text-slate-600 mt-0.5">Jabatan Pendidikan / Agensi Kerajaan / Sekolah</p>
              </div>
              <div class="text-right space-y-1 text-xs">
                <p><span class="font-bold text-slate-500">Status Bayaran:</span> <span class="font-black text-emerald-700 uppercase px-2 py-0.5 bg-emerald-100 rounded-md">${rec.status || "PAID"}</span></p>
                <p><span class="font-bold text-slate-500">Terma Pembayaran:</span> <span class="font-extrabold text-slate-800">30 Hari</span></p>
                <p><span class="font-bold text-slate-500">No. Akaun Bank:</span> <span class="font-extrabold text-slate-900 font-mono">BIMB 02021010045928</span></p>
              </div>
            </div>

            <!-- Itemized Table -->
            <div class="pt-1">
              <table class="inst-table">
                <thead>
                  <tr>
                    <th class="w-12 text-center">BIL</th>
                    <th>PERIHAL PROGRAM / PERKHIDMATAN TUNTUTAN</th>
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
                      <p class="text-xs text-slate-600 mt-0.5">Tuntutan Bayaran Pelaksanaan Program Latihan & Perkhidmatan Akaun Amanah Kolej Komuniti Sungai Petani.</p>
                    </td>
                    <td class="text-center font-bold text-slate-800 py-3">1 Pakej</td>
                    <td class="text-right font-bold text-slate-800 py-3">${formatCurrency(amount)}</td>
                    <td class="text-right font-black text-blue-900 text-base py-3">${formatCurrency(amount)}</td>
                  </tr>
                </tbody>
                <tfoot class="bg-slate-100 font-black text-sm border-t-2 border-slate-900">
                  <tr>
                    <td colspan="4" class="text-right uppercase py-2.5">JUMLAH KESELURUHAN PERLU DIBAYAR:</td>
                    <td class="text-right text-blue-900 text-base py-2.5 font-black">${formatCurrency(amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Bottom Section: Signature & Payment Notes -->
          <div class="inv-bottom-section pt-5 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs mt-auto">
            <div class="space-y-1.5">
              <p class="font-extrabold text-slate-900 uppercase">Arahan Pembayaran (Payment Terms):</p>
              <ul class="list-disc pl-4 text-slate-700 text-[11px] leading-relaxed space-y-0.5">
                <li>Sila buat bayaran melalui Cek / EFT atas nama <strong class="text-slate-900">AKAMANAH KOLEJ KOMUNITI SUNGAI PETANI</strong>.</li>
                <li>Sila simpan bukti pembayaran bagi tujuan pengesahan resit rasmi.</li>
              </ul>
            </div>
            <div class="text-center">
              <p class="font-extrabold text-slate-900 uppercase">Disediakan & Disahkan Oleh:</p>
              <div class="h-16 sig-line border-b-2 border-slate-900 mx-auto w-3/4 my-2"></div>
              <p class="mt-1 font-black text-slate-900 uppercase text-xs">Setiausaha / Bendahari Amanah</p>
              <p class="text-slate-600 text-[10px] font-semibold">Cop Rasmi Jabatan & Tarikh</p>
            </div>
          </div>
        </div>
      `,
      footerButtons: [
        { label: "Tutup", className: "px-4 py-2 border rounded-lg text-slate-700", onClick: (e, c) => c() },
        {
          label: "🖨️ Cetak Invois Rasmi",
          className: "px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition",
          onClick: () => {
            window.print();
          },
        },
      ],
    });
  };

  window.viewInvoiceRecord = (id) => {
    window.printSingleInvoice(id);
  };

  window.editInvoiceRecord = (id) => {
    const rec = (db.invoices || []).find((r) => r.id === id);
    if (rec) openInvoiceFormModal(db, rec);
  };

  window.deleteInvoiceRecord = (id) => {
    showDeleteConfirmation({
      recordId: id,
      description: "Invois Tuntutan",
      amount: "RM 0.00",
      onConfirm: async () => {
        await deleteRecord("Invoice", id);
        showToast("✓ Rekod telah dipadam");
        if (window.appRefreshUI) window.appRefreshUI();
        else window.location.reload();
      },
    });
  };
}
