const MUTED_KEY = 'mistral-maker-music-muted'
const VOLUME_KEY = 'mistral-maker-music-volume'

let audio: HTMLAudioElement | null = null
let muted = localStorage.getItem(MUTED_KEY) === 'true'
let volume = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '0.35')

interface MusicControl {
  wrapper: HTMLElement
  btn: HTMLButtonElement
  slider: HTMLInputElement
}

const controls: MusicControl[] = []

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio('/music.wav')
    audio.loop = true
    audio.volume = volume
    audio.muted = muted
  }
  return audio
}

function updateAllControls(): void {
  for (const { btn, slider } of controls) {
    btn.innerHTML = muted
      ? '<span class="music-icon">&#9835;</span><span class="music-slash">/</span>'
      : '<span class="music-icon">&#9835;</span>'
    btn.title = muted ? 'Unmute Music' : 'Mute Music'
    btn.classList.toggle('music-muted', muted)
    slider.value = String(volume)
  }
}

function toggleMute(): void {
  muted = !muted
  localStorage.setItem(MUTED_KEY, String(muted))
  const a = getAudio()
  a.muted = muted
  if (!muted && a.paused) {
    a.play().catch(() => {})
  }
  updateAllControls()
}

function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v))
  localStorage.setItem(VOLUME_KEY, String(volume))
  const a = getAudio()
  a.volume = volume
  if (muted && volume > 0) {
    muted = false
    localStorage.setItem(MUTED_KEY, 'false')
    a.muted = false
    if (a.paused) a.play().catch(() => {})
  }
  updateAllControls()
}

export function startMusic(): void {
  const a = getAudio()
  if (a.paused) {
    a.play().catch(() => {})
  }
}

export function createMusicButton(): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'music-control'

  const btn = document.createElement('button')
  btn.className = 'music-btn'
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleMute()
    startMusic()
    btn.blur()
  })
  btn.addEventListener('keydown', (e) => {
    if (e.key === ' ') e.preventDefault()
  })

  const popup = document.createElement('div')
  popup.className = 'music-volume-popup'

  const slider = document.createElement('input')
  slider.type = 'range'
  slider.className = 'music-volume-slider'
  slider.min = '0'
  slider.max = '1'
  slider.step = '0.01'
  slider.value = String(volume)
  slider.addEventListener('input', () => {
    setVolume(parseFloat(slider.value))
    startMusic()
  })
  slider.addEventListener('click', (e) => e.stopPropagation())

  const inner = document.createElement('div')
  inner.className = 'music-volume-inner'
  inner.appendChild(slider)
  popup.appendChild(inner)
  wrapper.appendChild(btn)
  wrapper.appendChild(popup)

  controls.push({ wrapper, btn, slider })
  updateAllControls()
  return wrapper
}

export function removeMusicButton(el: HTMLElement): void {
  const idx = controls.findIndex(c => c.wrapper === el)
  if (idx !== -1) controls.splice(idx, 1)
}
