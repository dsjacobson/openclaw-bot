const STORAGE_KEY = 'mission-control.scaffold.v1';

const DEFAULT_STATE = {
  activeTab: 'dashboard',
  priorities: [
    { id: uid(), label: 'Confirm weekly goals', done: false },
    { id: uid(), label: 'Review project blockers', done: false },
    { id: uid(), label: 'Send status recap', done: true }
  ],
  activity: [
    { id: uid(), text: 'Scaffold initialized', createdAt: new Date().toISOString() }
  ],
  notes: ''
};

let state = loadState();

const els = {
  tabs: [...document.querySelectorAll('.tab-btn')],
  panels: [...document.querySelectorAll('.tab-panel')],
  prioritiesList: document.getElementById('prioritiesList'),
  activityList: document.getElementById('activityList'),
  notesInput: document.getElementById('notesInput'),
  addActivityBtn: document.getElementById('addActivityBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput')
};

init();

function init() {
  bindEvents();
  render();
}

function bindEvents() {
  els.tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeTab = btn.dataset.tab;
      saveState();
      renderTabs();
    });
  });

  els.notesInput.addEventListener('input', () => {
    state.notes = els.notesInput.value;
    saveState();
  });

  els.addActivityBtn.addEventListener('click', () => {
    const text = window.prompt('Add activity entry:');
    if (!text) return;
    state.activity.unshift({ id: uid(), text: text.trim(), createdAt: new Date().toISOString() });
    saveState();
    renderActivity();
  });

  els.exportBtn.addEventListener('click', exportJson);
  els.importInput.addEventListener('change', importJson);
}

function render() {
  renderTabs();
  renderPriorities();
  renderActivity();
  els.notesInput.value = state.notes || '';
}

function renderTabs() {
  const active = state.activeTab || 'dashboard';
  els.tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === active));
  els.panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === active));
}

function renderPriorities() {
  els.prioritiesList.innerHTML = '';

  state.priorities.forEach((item) => {
    const li = document.createElement('li');

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(item.done);
    checkbox.addEventListener('change', () => {
      item.done = checkbox.checked;
      saveState();
      text.style.textDecoration = item.done ? 'line-through' : 'none';
    });

    const text = document.createElement('span');
    text.textContent = item.label;
    text.style.textDecoration = item.done ? 'line-through' : 'none';

    label.appendChild(checkbox);
    label.appendChild(text);
    li.appendChild(label);
    els.prioritiesList.appendChild(li);
  });
}

function renderActivity() {
  els.activityList.innerHTML = '';

  state.activity
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((item) => {
      const li = document.createElement('li');
      const text = document.createElement('span');
      const time = document.createElement('span');

      text.textContent = item.text;
      time.className = 'activity-time';
      time.textContent = new Date(item.createdAt).toLocaleString();

      li.appendChild(text);
      li.appendChild(time);
      els.activityList.appendChild(li);
    });
}

function exportJson() {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mission-control-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      state = sanitizeState(parsed);
      saveState();
      render();
      window.alert('State imported successfully.');
    } catch {
      window.alert('Invalid JSON file.');
    } finally {
      els.importInput.value = '';
    }
  };

  reader.readAsText(file);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    return sanitizeState(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sanitizeState(input) {
  const base = structuredClone(DEFAULT_STATE);

  if (input && typeof input === 'object') {
    if (typeof input.activeTab === 'string') {
      base.activeTab = input.activeTab;
    }

    if (Array.isArray(input.priorities)) {
      base.priorities = input.priorities
        .filter((item) => item && typeof item.label === 'string')
        .map((item) => ({
          id: String(item.id || uid()),
          label: item.label,
          done: Boolean(item.done)
        }));
    }

    if (Array.isArray(input.activity)) {
      base.activity = input.activity
        .filter((item) => item && typeof item.text === 'string')
        .map((item) => ({
          id: String(item.id || uid()),
          text: item.text,
          createdAt: validIso(item.createdAt) ? item.createdAt : new Date().toISOString()
        }));
    }

    if (typeof input.notes === 'string') {
      base.notes = input.notes;
    }
  }

  return base;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function validIso(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
