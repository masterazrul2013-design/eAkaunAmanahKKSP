// Toast Notification Component

export function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full no-print";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  const bgColors = {
    success: "bg-emerald-900 text-emerald-100 border-emerald-700",
    error: "bg-rose-900 text-rose-100 border-rose-700",
    warning: "bg-amber-900 text-amber-100 border-amber-700",
    info: "bg-slate-900 text-slate-100 border-slate-700",
  };

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  toast.className = `flex items-center justify-between p-4 rounded-xl border shadow-xl text-sm font-medium animate-fade-in ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 font-bold">${icons[type] || "ℹ"}</span>
      <span>${message}</span>
    </div>
    <button class="ml-4 opacity-70 hover:opacity-100 text-lg leading-none" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4000);
}
