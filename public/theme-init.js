// Set the theme before first paint so native surfaces and the page agree.
// Kept as a separate file because the app is served with a strict CSP
// (`script-src 'self'`) that blocks inline scripts.
;(function () {
  try {
    var stored = localStorage.getItem('nekibuki.preferences')
    var data = stored ? JSON.parse(stored) : null
    var appearance = data && data.state ? data.state.appearance : 'system'
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    var dark = appearance === 'dark' || (appearance !== 'light' && prefersDark)
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  } catch {
    // Never block the page on unreadable preferences.
  }
})()
