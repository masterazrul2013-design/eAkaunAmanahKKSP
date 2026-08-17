// Universal Modal Component with Pinned Header & Footer
export function renderModal({ title, bodyHtml, footerButtons = [], onClose }) {
  let backdrop = document.getElementById("app-modal-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "app-modal-backdrop";
    document.body.appendChild(backdrop);
  }

  backdrop.className = "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in";

  backdrop.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden my-auto animate-fade-in" onclick="event.stopPropagation()">
      <!-- Modal Header Bar (Pinned at Top) -->
      <div class="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 modal-header-bar shrink-0">
        <h3 class="text-sm font-bold tracking-tight text-white">${title}</h3>
        <div class="flex items-center gap-2">
          <button onclick="window.print()" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm no-print">
            <span>🖨️</span> Cetak
          </button>
          <button id="modal-close-btn" class="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition">
            ✕
          </button>
        </div>
      </div>

      <!-- Modal Body Content (Scrollable Middle) -->
      <div class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-slate-700 text-sm modal-body-content">
        ${bodyHtml}
      </div>

      <!-- Modal Footer Bar (Pinned at Bottom) -->
      <div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 modal-footer-bar shrink-0" id="modal-footer-container">
      </div>
    </div>
  `;

  const footerContainer = backdrop.querySelector("#modal-footer-container");
  footerButtons.forEach((btn) => {
    const buttonEl = document.createElement("button");
    buttonEl.className = btn.className || "px-4 py-2 rounded-lg text-sm font-semibold transition";
    buttonEl.innerText = btn.label;
    buttonEl.onclick = (e) => {
      btn.onClick(e, closeModal);
    };
    footerContainer.appendChild(buttonEl);
  });

  const closeBtn = backdrop.querySelector("#modal-close-btn");
  closeBtn.onclick = () => closeModal();
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal();
  };

  function closeModal() {
    backdrop.remove();
    if (onClose) onClose();
  }

  return { closeModal };
}

/**
 * Confirmation dialog before record deletion
 */
export function showDeleteConfirmation({ recordId, description, amount, onConfirm }) {
  renderModal({
    title: `Pengesahan Padam Rekod (${recordId})`,
    bodyHtml: `
      <div class="space-y-4 text-center py-2">
        <div class="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
          ⚠
        </div>
        <h4 class="text-sm font-bold text-slate-900">Adakah anda pasti mahu memadam rekod ini?</h4>
        <div class="bg-slate-100 p-3.5 rounded-xl text-left border border-slate-200 space-y-1 text-xs">
          <p><span class="font-semibold text-slate-500">ID Rekod:</span> <span class="font-bold text-slate-900">${recordId}</span></p>
          <p><span class="font-semibold text-slate-500">Keterangan:</span> <span class="text-slate-800">${description || "-"}</span></p>
          <p><span class="font-semibold text-slate-500">Jumlah:</span> <span class="font-bold text-emerald-700">${amount}</span></p>
        </div>
        <p class="text-[11px] text-rose-600 font-medium">Rekod ini akan ditanda sebagai "DELETED" (Soft Delete) bagi tujuan pematuhan audit kewangan.</p>
      </div>
    `,
    footerButtons: [
      {
        label: "Batal",
        className: "px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs",
        onClick: (e, close) => close(),
      },
      {
        label: "Ya, Padam Rekod",
        className: "px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-semibold shadow-md text-xs",
        onClick: async (e, close) => {
          await onConfirm();
          close();
        },
      },
    ],
  });
}
