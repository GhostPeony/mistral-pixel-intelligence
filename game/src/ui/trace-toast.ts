export function showTraceToast(message: string): void {
  const existing = document.querySelector('.trace-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.className = 'trace-toast'
  toast.innerHTML = `<span style="font-family:var(--font-mono);font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent)">TRACE</span> ${message}`
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(20px);
    background:var(--surface); border:1px solid var(--border); border-left:3px solid var(--accent);
    border-radius:var(--radius); padding:12px 20px; box-shadow:var(--shadow);
    font-family:var(--font-body); font-size:14px; color:var(--text-primary);
    opacity:0; transition:all 0.3s ease; z-index:1000; pointer-events:none;
  `
  document.body.appendChild(toast)
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateX(-50%) translateY(0)'
  })
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(-50%) translateY(20px)'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}
