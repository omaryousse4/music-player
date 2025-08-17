const LOCAL_STORAGE_KEYS = {
  lastTrackId: 'mp_lastTrackId',
  lastTime: 'mp_lastTime',
  volume: 'mp_volume',
  shuffle: 'mp_shuffle',
  repeat: 'mp_repeat',
  theme: 'mp_theme',
  lyricsVisible: 'mp_lyricsVisible'
};

const elements = {
  app: document.getElementById('app'),
  playlist: document.getElementById('playlist'),
  emptyHint: document.getElementById('emptyHint'),
  audio: document.getElementById('audio'),
  playPauseBtn: document.getElementById('playPauseBtn'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  repeatBtn: document.getElementById('repeatBtn'),
  currentTime: document.getElementById('currentTime'),
  duration: document.getElementById('duration'),
  seek: document.getElementById('seek'),
  volume: document.getElementById('volume'),
  title: document.getElementById('title'),
  artist: document.getElementById('artist'),
  cover: document.getElementById('cover'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  themeToggle: document.getElementById('themeToggle'),
  installBtn: document.getElementById('installBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  filePicker: document.getElementById('filePicker'),
  lyricsWrap: document.getElementById('lyrics'),
  lyricsPanel: document.getElementById('lyricsPanel'),
  lyricsToggle: document.getElementById('lyricsToggle'),
  themeColorMeta: document.getElementById('theme-color')
};

const state = {
  songs: [],
  currentIndex: 0,
  shuffle: false,
  repeat: 'off', // off | one | all
  volume: 1,
  theme: 'dark',
  lyrics: [],
  lyricsVisible: true,
  beforeInstallPromptEvent: null
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function saveSettings() {
  try {
    const song = state.songs[state.currentIndex];
    if (song) localStorage.setItem(LOCAL_STORAGE_KEYS.lastTrackId, song.id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.lastTime, String(elements.audio.currentTime || 0));
    localStorage.setItem(LOCAL_STORAGE_KEYS.volume, String(state.volume));
    localStorage.setItem(LOCAL_STORAGE_KEYS.shuffle, String(state.shuffle));
    localStorage.setItem(LOCAL_STORAGE_KEYS.repeat, state.repeat);
    localStorage.setItem(LOCAL_STORAGE_KEYS.theme, state.theme);
    localStorage.setItem(LOCAL_STORAGE_KEYS.lyricsVisible, String(state.lyricsVisible));
  } catch {}
}

function restoreSettings() {
  try {
    const theme = localStorage.getItem(LOCAL_STORAGE_KEYS.theme);
    if (theme) state.theme = theme;

    const vol = parseFloat(localStorage.getItem(LOCAL_STORAGE_KEYS.volume) || '0.8');
    state.volume = Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : 0.8;

    state.shuffle = localStorage.getItem(LOCAL_STORAGE_KEYS.shuffle) === 'true';
    const rep = localStorage.getItem(LOCAL_STORAGE_KEYS.repeat);
    if (rep === 'one' || rep === 'all' || rep === 'off') state.repeat = rep;

    state.lyricsVisible = localStorage.getItem(LOCAL_STORAGE_KEYS.lyricsVisible) !== 'false';
  } catch {}
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  elements.themeColorMeta?.setAttribute('content', theme === 'dark' ? '#111111' : '#ffffff');
}

async function fetchJsonSafe(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('bad');
    return await res.json();
  } catch {
    return null;
  }
}

function slugify(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/gi, '-').replace(/(^-|-$)+/g, '');
}

async function loadSongsFromManifest() {
  const data = await fetchJsonSafe('/songs/index.json');
  if (!data || !Array.isArray(data.songs)) return [];
  return data.songs.map((s) => ({
    id: s.id || slugify(s.title || s.src),
    title: s.title || 'بدون عنوان',
    artist: s.artist || 'غير معروف',
    src: s.src,
    cover: s.cover || '',
    lyrics: s.lyrics || ''
  }));
}

function addLocalFilesFromPicker(files) {
  const picked = Array.from(files || []).filter(f => f.type.startsWith('audio/'));
  if (!picked.length) return;
  const toAdd = picked.map((file) => {
    const url = URL.createObjectURL(file);
    const base = file.name.replace(/\.[^.]+$/, '');
    return {
      id: `${slugify(base)}-${Date.now()}`,
      title: base,
      artist: 'محلي',
      src: url,
      cover: '',
      lyrics: ''
    };
  });
  state.songs.push(...toAdd);
  renderPlaylist();
}

function renderPlaylist() {
  elements.playlist.innerHTML = '';
  state.songs.forEach((song, index) => {
    const li = document.createElement('li');
    li.dataset.index = String(index);
    li.innerHTML = `<span>${song.title} — <small style="color:var(--muted)">${song.artist}</small></span>`;
    if (index === state.currentIndex) li.classList.add('active');
    li.addEventListener('click', () => {
      playIndex(index, true);
    });
    elements.playlist.appendChild(li);
  });
  elements.emptyHint.style.display = state.songs.length ? 'none' : 'block';
}

function updatePlaylistActive() {
  Array.from(elements.playlist.children).forEach((li, i) => {
    li.classList.toggle('active', i === state.currentIndex);
  });
}

function pickNextIndex(direction = 1) {
  const total = state.songs.length;
  if (!total) return 0;
  if (state.shuffle) {
    let next = Math.floor(Math.random() * total);
    if (next === state.currentIndex && total > 1) next = (next + 1) % total;
    return next;
  }
  return (state.currentIndex + direction + total) % total;
}

function setRepeatMode() {
  const order = ['off', 'all', 'one'];
  const idx = order.indexOf(state.repeat);
  state.repeat = order[(idx + 1) % order.length];
  elements.repeatBtn.textContent = state.repeat === 'one' ? '🔂' : '🔁';
  elements.repeatBtn.title = state.repeat === 'one' ? 'تكرار واحد' : state.repeat === 'all' ? 'تكرار الكل' : 'بدون تكرار';
  saveSettings();
}

function setShuffle(val) {
  state.shuffle = val;
  elements.shuffleBtn.style.borderColor = val ? 'var(--primary)' : 'var(--outline)';
  saveSettings();
}

function setVolume(vol) {
  state.volume = Math.min(1, Math.max(0, vol));
  elements.audio.volume = state.volume;
  elements.volume.value = String(state.volume);
  saveSettings();
}

function setCover(coverUrl) {
  if (coverUrl) {
    elements.cover.src = coverUrl;
  } else {
    elements.cover.removeAttribute('src');
  }
}

function requestFullscreen() {
  const target = elements.app || document.documentElement;
  const el = target;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (req) req.call(el);
}

function exitFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (exit) exit.call(document);
}

function toggleFullscreen() {
  if (document.fullscreenElement) exitFullscreen(); else requestFullscreen();
}

elements.fullscreenBtn.addEventListener('click', toggleFullscreen);

elements.themeToggle.addEventListener('click', () => {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  saveSettings();
});

elements.filePicker.addEventListener('change', (e) => {
  addLocalFilesFromPicker(e.target.files);
});

elements.refreshBtn.addEventListener('click', async () => {
  const manifestSongs = await loadSongsFromManifest();
  // Keep locally added blobs as well
  const localBlobs = state.songs.filter(s => s.src.startsWith('blob:'));
  state.songs = [...manifestSongs, ...localBlobs];
  renderPlaylist();
});

elements.lyricsToggle.addEventListener('click', () => {
  state.lyricsVisible = !state.lyricsVisible;
  elements.lyricsPanel.style.display = state.lyricsVisible ? 'flex' : 'none';
  saveSettings();
});

function buildSeek() {
  const current = elements.audio.currentTime || 0;
  const dur = elements.audio.duration || 0;
  const pos = dur ? Math.floor((current / dur) * 1000) : 0;
  elements.seek.value = String(pos);
  elements.currentTime.textContent = formatTime(current);
  elements.duration.textContent = formatTime(dur);
}

elements.seek.addEventListener('input', () => {
  const dur = elements.audio.duration || 0;
  const ratio = Number(elements.seek.value) / 1000;
  elements.audio.currentTime = dur * ratio;
});

function renderLyrics() {
  elements.lyricsWrap.innerHTML = '';
  state.lyrics.forEach((line, idx) => {
    const div = document.createElement('div');
    div.className = 'line';
    div.dataset.idx = String(idx);
    div.textContent = line.text || '';
    elements.lyricsWrap.appendChild(div);
  });
}

function activateLyricsAt(time) {
  if (!state.lyrics.length) return;
  let activeIndex = 0;
  for (let i = 0; i < state.lyrics.length; i++) {
    if (time + 0.02 >= state.lyrics[i].time) activeIndex = i; else break;
  }
  const children = elements.lyricsWrap.children;
  for (let i = 0; i < children.length; i++) {
    children[i].classList.toggle('active', i === activeIndex);
  }
  const activeEl = elements.lyricsWrap.querySelector('.line.active');
  if (activeEl) activeEl.scrollIntoView({ block: 'center' });
}

function parseLRC(text) {
  const lines = (text || '').split(/\r?\n/);
  const entries = [];
  const tag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  for (const line of lines) {
    let match;
    const content = line.replace(tag, '').trim();
    tag.lastIndex = 0;
    while ((match = tag.exec(line)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = parseInt((match[3] || '0').padEnd(3, '0').slice(0,3), 10);
      const t = min * 60 + sec + ms / 1000;
      entries.push({ time: t, text: content });
    }
  }
  entries.sort((a,b) => a.time - b.time);
  return entries;
}

async function loadLyricsFor(song) {
  state.lyrics = [];
  renderLyrics();
  let url = song.lyrics;
  if (!url) {
    const baseId = song.id || slugify(song.title);
    url = `/lyrics/${baseId}.lrc`;
  }
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return;
    const text = await res.text();
    state.lyrics = parseLRC(text);
    renderLyrics();
  } catch {}
}

function attachAudioEvents() {
  elements.audio.addEventListener('loadedmetadata', () => {
    elements.duration.textContent = formatTime(elements.audio.duration);
    const savedTime = parseFloat(localStorage.getItem(LOCAL_STORAGE_KEYS.lastTime) || '0');
    const lastId = localStorage.getItem(LOCAL_STORAGE_KEYS.lastTrackId);
    const currentSong = state.songs[state.currentIndex];
    if (currentSong && lastId === currentSong.id && savedTime && savedTime < (elements.audio.duration - 2)) {
      elements.audio.currentTime = savedTime;
    }
    buildSeek();
  });

  elements.audio.addEventListener('timeupdate', () => {
    buildSeek();
    activateLyricsAt(elements.audio.currentTime || 0);
  });

  elements.audio.addEventListener('play', () => {
    elements.playPauseBtn.textContent = '⏸';
    elements.cover.classList.add('playing');
  });

  elements.audio.addEventListener('pause', () => {
    elements.playPauseBtn.textContent = '▶️';
    elements.cover.classList.remove('playing');
    saveSettings();
  });

  elements.audio.addEventListener('ended', () => {
    if (state.repeat === 'one') {
      elements.audio.currentTime = 0;
      elements.audio.play();
      return;
    }
    const next = pickNextIndex(1);
    if (next === state.currentIndex && state.repeat === 'off' && !state.shuffle) {
      elements.audio.pause();
      elements.audio.currentTime = 0;
      return;
    }
    playIndex(next, true);
  });
}

function bindControlEvents() {
  elements.playPauseBtn.addEventListener('click', () => {
    if (elements.audio.paused) elements.audio.play(); else elements.audio.pause();
  });
  elements.prevBtn.addEventListener('click', () => {
    const prev = pickNextIndex(-1);
    playIndex(prev, true);
  });
  elements.nextBtn.addEventListener('click', () => {
    const next = pickNextIndex(1);
    playIndex(next, true);
  });
  elements.shuffleBtn.addEventListener('click', () => setShuffle(!state.shuffle));
  elements.repeatBtn.addEventListener('click', setRepeatMode);
  elements.volume.addEventListener('input', () => setVolume(parseFloat(elements.volume.value || '1')));
}

async function playIndex(index, autoPlay) {
  if (!state.songs.length) return;
  state.currentIndex = ((index % state.songs.length) + state.songs.length) % state.songs.length;

  const song = state.songs[state.currentIndex];
  updatePlaylistActive();
  elements.title.textContent = song.title || '—';
  elements.artist.textContent = song.artist || '—';
  setCover(song.cover);

  elements.audio.src = song.src;
  try { await elements.audio.load(); } catch {}
  loadLyricsFor(song);

  saveSettings();
  if (autoPlay) {
    try { await elements.audio.play(); } catch {}
  }
}

function handleInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.beforeInstallPromptEvent = e;
    elements.installBtn.classList.remove('hidden');
  });
  elements.installBtn.addEventListener('click', async () => {
    if (!state.beforeInstallPromptEvent) return;
    const e = state.beforeInstallPromptEvent;
    elements.installBtn.disabled = true;
    await e.prompt();
    await e.userChoice.catch(() => {});
    elements.installBtn.classList.add('hidden');
    state.beforeInstallPromptEvent = null;
  });
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      if (reg.installing) reg.installing.onstatechange = () => {};
    } catch (err) {
      // ignore
    }
  }
}

async function init() {
  restoreSettings();
  applyTheme(state.theme);
  elements.volume.value = String(state.volume);
  elements.lyricsPanel.style.display = state.lyricsVisible ? 'flex' : 'none';

  setShuffle(state.shuffle);
  elements.repeatBtn.textContent = state.repeat === 'one' ? '🔂' : '🔁';
  bindControlEvents();
  attachAudioEvents();

  setVolume(state.volume);

  const manifestSongs = await loadSongsFromManifest();
  state.songs = manifestSongs;
  renderPlaylist();

  const lastId = localStorage.getItem(LOCAL_STORAGE_KEYS.lastTrackId);
  let indexToPlay = 0;
  if (lastId) {
    const idx = state.songs.findIndex(s => s.id === lastId);
    if (idx >= 0) indexToPlay = idx;
  }

  await playIndex(indexToPlay, false);

  handleInstallPrompt();
  registerServiceWorker();
}

window.addEventListener('online', () => document.body.classList.remove('offline'));
window.addEventListener('offline', () => document.body.classList.add('offline'));

init();