import './style.css'
import { StatsTab } from './dashboard/stats-tab'
import { TracesTab } from './dashboard/traces-tab'
import { TrainingTab } from './dashboard/training-tab'
import { ModelsTab } from './dashboard/models-tab'

const tabs = [
  { id: 'stats', label: 'Stats', create: () => new StatsTab() },
  { id: 'traces', label: 'Traces', create: () => new TracesTab() },
  { id: 'training', label: 'Training', create: () => new TrainingTab() },
  { id: 'models', label: 'Models', create: () => new ModelsTab() },
]

const tabNav = document.getElementById('dash-tabs')!
const content = document.getElementById('dash-content')!

let activeTab: { destroy?(): void } | null = null

function switchTab(id: string) {
  if (activeTab?.destroy) activeTab.destroy()
  content.innerHTML = ''

  // Update tab buttons
  for (const btn of tabNav.querySelectorAll('.dash-tab')) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === id)
  }

  const tab = tabs.find(t => t.id === id)
  if (!tab) return
  activeTab = tab.create()
  ;(activeTab as any).render(content)
}

// Render tab navigation
for (const tab of tabs) {
  const btn = document.createElement('button')
  btn.className = 'dash-tab'
  btn.setAttribute('data-tab', tab.id)
  btn.textContent = tab.label
  btn.addEventListener('click', () => switchTab(tab.id))
  tabNav.appendChild(btn)
}

// Start on stats tab
switchTab('stats')
