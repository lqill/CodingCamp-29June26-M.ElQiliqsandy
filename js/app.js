// Initialize storage and state
let tasks = [];
let links = [];
let timerMinutes = 25;
let timerSeconds = 0;
let timerIntervalId = null;
let timerStatus = 'idle'; // 'idle', 'running', 'paused'
let currentSort = localStorage.getItem('todoSort') || 'pending';

let previousGreetingCategory = null;
let themeToggleBtn = null;

// Theme
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.classList.toggle('dark', saved === 'dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  }
  updateThemeIcon();
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeIcon();
}

function updateThemeIcon() {
  if (!themeToggleBtn) {
    themeToggleBtn = document.getElementById('theme-toggle');
  }
  if (themeToggleBtn) {
    const isDark = document.documentElement.classList.contains('dark');
    themeToggleBtn.textContent = isDark ? '\u2600' : '\uD83C\uDF19';
    themeToggleBtn.setAttribute('aria-pressed', isDark);
  }
}

// Clock
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const clockElement = document.getElementById('clock');
  if (clockElement) clockElement.textContent = `${hours}:${minutes}:${seconds}`;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const dateStr = `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  const dateElement = document.getElementById('date');
  if (dateElement) dateElement.textContent = dateStr;

  // Update greeting each tick to handle hour transitions
  const hourCategory = getGreetingCategory(now.getHours());
  if (hourCategory !== previousGreetingCategory) {
    previousGreetingCategory = hourCategory;
    updateGreetingDisplay(hourCategory);
  }
}

function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

// Greeting
function initGreeting() {
  const now = new Date();
  const currentHour = now.getHours();
  const hourCategory = getGreetingCategory(currentHour);
  updateGreetingDisplay(hourCategory);
}

function getGreetingCategory(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function updateGreetingDisplay(category) {
  const greetingElement = document.getElementById('greeting');
  if (greetingElement) {
    const messages = {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
      night: 'Good night'
    };
    greetingElement.textContent = messages[category] || 'Hello';
  }
}

// Timer display
function initTimerDisplay() {
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) timerDisplay.textContent = formatTime(timerMinutes, timerSeconds);
}

function formatTime(min, sec) {
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Storage
function storageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

function showStorageWarning() {
  if (document.getElementById('storage-warning')) return;
  const banner = document.createElement('div');
  banner.id = 'storage-warning';
  banner.textContent = 'Storage unavailable \u2014 data will not be saved this session';
  banner.style.cssText = 'background:#fef3c7;color:#92400e;padding:0.75rem 1rem;text-align:center;font-size:0.875rem;border-radius:6px;margin-bottom:1rem;';
  const dashboard = document.querySelector('.dashboard');
  if (dashboard) dashboard.before(banner);
}

function saveToStorage(key, data) {
  if (!storageAvailable()) {
    console.warn('localStorage not available');
    showStorageWarning();
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
    showStorageWarning();
  }
}

function loadFromStorage() {
  if (!storageAvailable()) {
    console.warn('localStorage not available');
    showStorageWarning();
    return;
  }
  try {
    const storedTasks = localStorage.getItem('tasks');
    const storedLinks = localStorage.getItem('links');

    if (storedTasks) {
      const parsedTasks = JSON.parse(storedTasks);
      if (Array.isArray(parsedTasks)) {
        tasks = parsedTasks;
      }
    }

    if (storedLinks) {
      const parsedLinks = JSON.parse(storedLinks);
      if (Array.isArray(parsedLinks)) {
        links = parsedLinks;
      }
    }
  } catch (e) {
    console.error('Error loading from localStorage:', e);
    tasks = [];
    links = [];
  }
}

// To-Do List
function showTodoWarning(message) {
  let warning = document.getElementById('todo-warning');
  if (!warning) {
    warning = document.createElement('div');
    warning.id = 'todo-warning';
    document.querySelector('.todo-input-row').after(warning);
  }
  warning.textContent = message;
  warning.style.cssText = 'color:var(--danger);font-size:0.8rem;margin-top:0.25rem;';
  clearTimeout(warning._timeout);
  warning._timeout = setTimeout(() => { warning.textContent = ''; }, 2000);
}

function addTodo(text) {
  if (!text || text.trim() === '') return;
  const trimmed = text.trim();
  const isDuplicate = tasks.some(
    t => t.text.toLowerCase() === trimmed.toLowerCase()
  );
  if (isDuplicate) {
    showTodoWarning('Task already exists');
    return;
  }
  const newTask = {
    id: crypto.randomUUID(),
    text: trimmed,
    done: false
  };
  tasks.push(newTask);
  renderTodos();
  saveToStorage('tasks', tasks);
}

function toggleTodo(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    renderTodos();
    saveToStorage('tasks', tasks);
  }
}

function editTodo(id, newText) {
  if (!newText || newText.trim() === '') return;
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.text = newText.trim();
    renderTodos();
    saveToStorage('tasks', tasks);
  }
}

function deleteTodo(id) {
  tasks = tasks.filter(t => t.id !== id);
  renderTodos();
  saveToStorage('tasks', tasks);
}

function sortTasks(arr) {
  const sorted = [...arr];
  switch (currentSort) {
    case 'pending':
      sorted.sort((a, b) => a.done - b.done);
      break;
    case 'alpha':
      sorted.sort((a, b) => a.text.localeCompare(b.text));
      break;
    case 'newest':
      sorted.reverse();
      break;
    case 'oldest':
    default:
      break;
  }
  return sorted;
}

function renderTodos() {
  const todoListElement = document.getElementById('todo-items');
  if (!todoListElement) return;

  todoListElement.innerHTML = '';
  const sorted = sortTasks(tasks);
  sorted.forEach(task => {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.innerHTML = `
      <input type="checkbox" class="todo-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
      <span class="todo-text ${task.done ? 'done' : ''}" contenteditable="false" data-id="${task.id}"></span>
      <button class="edit-btn" data-id="${task.id}">Edit</button>
      <button class="delete-btn" data-id="${task.id}">Delete</button>
    `;
    li.querySelector('.todo-text').textContent = task.text;
    todoListElement.appendChild(li);
  });

  todoListElement.querySelectorAll('.todo-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      toggleTodo(e.target.dataset.id);
    });
  });

  todoListElement.querySelectorAll('.todo-text').forEach(span => {
    span.addEventListener('blur', (e) => {
      const id = e.target.dataset.id;
      const newText = e.target.textContent.trim();
      if (newText) editTodo(id, newText);
    });

    span.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        span.blur();
      }
    });
  });

  todoListElement.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const textSpan = todoListElement.querySelector(`.todo-text[data-id="${id}"]`);
      if (textSpan) {
        textSpan.contentEditable = true;
        textSpan.focus();
      }
    });
  });

  todoListElement.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      deleteTodo(e.target.dataset.id);
    });
  });
}

// Quick Links
function addLink(name, url) {
  if (!name || !url || name.trim() === '' || url.trim() === '') return;
  links.push({
    id: crypto.randomUUID(),
    name: name.trim(),
    url: url.trim()
  });
  renderLinks();
  saveToStorage('links', links);
}

function editLink(id, newName, newUrl) {
  if (!newName || !newUrl || newName.trim() === '' || newUrl.trim() === '') return;
  const link = links.find(l => l.id === id);
  if (link) {
    link.name = newName.trim();
    link.url = newUrl.trim();
    renderLinks();
    saveToStorage('links', links);
  }
}

function deleteLink(id) {
  links = links.filter(l => l.id !== id);
  renderLinks();
  saveToStorage('links', links);
}

function renderLinks() {
  const linksGridElement = document.getElementById('links-grid');
  if (!linksGridElement) return;

  linksGridElement.innerHTML = '';
  links.forEach(link => {
    const linkButton = document.createElement('button');
    linkButton.className = 'link-button';
    linkButton.dataset.linkId = link.id;
    linkButton.innerHTML = `
      <span>${link.name}</span>
      <div class="link-card-controls">
        <button class="small-edit-btn" data-id="${link.id}" title="Edit link">\u270E</button>
        <button class="small-delete-btn" data-id="${link.id}" title="Delete link">\u00d7</button>
      </div>
    `;
    linkButton.addEventListener('click', (e) => {
      if (e.target.closest('.link-card-controls')) return;
      window.open(link.url, '_blank', 'noopener,noreferrer');
    });

    linkButton.querySelector('.small-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      startEditLink(link.id);
    });

    linkButton.querySelector('.small-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLink(link.id);
    });

    linksGridElement.appendChild(linkButton);
  });
}

function startEditLink(id) {
  const link = links.find(l => l.id === id);
  if (!link) return;

  const linksGridElement = document.getElementById('links-grid');
  const existingForm = linksGridElement.querySelector('.link-edit-form');
  if (existingForm) existingForm.remove();

  const form = document.createElement('div');
  form.className = 'link-edit-form';
  form.innerHTML = `
    <input type="text" class="edit-name-input" value="${link.name}" placeholder="Name">
    <input type="url" class="edit-url-input" value="${link.url}" placeholder="https://">
    <div class="edit-form-buttons">
      <button class="edit-save-btn">Save</button>
      <button class="edit-cancel-btn">Cancel</button>
    </div>
  `;

  const card = linksGridElement.querySelector(`[data-link-id="${id}"]`);
  if (card) {
    card.replaceWith(form);
  }

  form.querySelector('.edit-name-input').focus();

  form.querySelector('.edit-save-btn').addEventListener('click', () => {
    const newName = form.querySelector('.edit-name-input').value.trim();
    const newUrl = form.querySelector('.edit-url-input').value.trim();
    if (newName && newUrl) {
      editLink(id, newName, newUrl);
    }
  });

  form.querySelector('.edit-cancel-btn').addEventListener('click', () => {
    renderLinks();
  });

  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        form.querySelector('.edit-save-btn').click();
      } else if (e.key === 'Escape') {
        renderLinks();
      }
    });
  });
}

// Focus Timer
function startTimer() {
  if (timerStatus === 'running') return;

  timerStatus = 'running';
  timerIntervalId = setInterval(timerTick, 1000);
  updateTimerButtons();
}

function stopTimer() {
  if (timerIntervalId !== null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  if (timerStatus === 'running') {
    timerStatus = 'paused';
  }
  updateTimerButtons();
}

function resetTimer() {
  stopTimer();
  timerMinutes = 25;
  timerSeconds = 0;
  timerStatus = 'idle';

  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(timerMinutes, timerSeconds);
  }
  updateTimerButtons();
}

function timerTick() {
  if (timerSeconds === 0) {
    if (timerMinutes === 0) {
      timerComplete();
      return;
    }
    timerMinutes--;
    timerSeconds = 59;
  } else {
    timerSeconds--;
  }

  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(timerMinutes, timerSeconds);
  }
}

function timerComplete() {
  stopTimer();
  timerStatus = 'idle';

  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    timerDisplay.textContent = '00:00';
    timerDisplay.classList.add('flash');
    setTimeout(() => {
      timerDisplay.classList.remove('flash');
      resetTimer();
    }, 3000);
  }

  if (Notification && Notification.permission === 'granted') {
    new Notification('Focus Timer', { body: 'Time is up!' });
  } else if (Notification && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

function updateTimerButtons() {
  const startBtn = document.getElementById('timer-start');
  const stopBtn = document.getElementById('timer-stop');

  if (startBtn && stopBtn) {
    if (timerStatus === 'running') {
      startBtn.textContent = 'Pause';
      stopBtn.disabled = false;
    } else if (timerStatus === 'paused') {
      startBtn.textContent = 'Resume';
      stopBtn.disabled = false;
    } else {
      startBtn.textContent = 'Start';
      stopBtn.disabled = true;
    }
  }
}

// Event Listeners
function initEventListeners() {
  const todoAddBtn = document.getElementById('todo-add');
  const todoInput = document.getElementById('todo-input');
  const linkAddBtn = document.getElementById('link-add');
  const linkNameInput = document.getElementById('link-name');
  const linkUrlInput = document.getElementById('link-url');
  const timerStartBtn = document.getElementById('timer-start');
  const timerStopBtn = document.getElementById('timer-stop');
  const timerResetBtn = document.getElementById('timer-reset');

  if (todoAddBtn && todoInput) {
    todoAddBtn.addEventListener('click', () => {
      const text = todoInput.value;
      if (text.trim()) {
        addTodo(text);
        todoInput.value = '';
      }
    });

    todoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const text = todoInput.value;
        if (text.trim()) {
          addTodo(text);
          todoInput.value = '';
        }
      }
    });
  }

  const todoSortSelect = document.getElementById('todo-sort');
  if (todoSortSelect) {
    todoSortSelect.value = currentSort;
    todoSortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      localStorage.setItem('todoSort', currentSort);
      renderTodos();
    });
  }

  if (linkAddBtn && linkNameInput && linkUrlInput) {
    linkAddBtn.addEventListener('click', () => {
      const name = linkNameInput.value;
      const url = linkUrlInput.value;
      if (name.trim() && url.trim()) {
        addLink(name, url);
        linkNameInput.value = '';
        linkUrlInput.value = '';
      }
    });

    linkNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && linkUrlInput.value) {
        linkAddBtn.click();
      }
    });

    linkUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && linkNameInput.value) {
        linkAddBtn.click();
      }
    });
  }

  if (timerStartBtn) {
    timerStartBtn.addEventListener('click', () => {
      if (timerStatus === 'running') {
        stopTimer();
      } else {
        startTimer();
      }
    });
  }

  if (timerStopBtn) {
    timerStopBtn.addEventListener('click', stopTimer);
  }

  if (timerResetBtn) {
    timerResetBtn.addEventListener('click', resetTimer);
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadFromStorage();
  initClock();
  initGreeting();
  initTimerDisplay();
  renderTodos();
  renderLinks();
  initEventListeners();

  const themeToggleBtnEl = document.getElementById('theme-toggle');
  if (themeToggleBtnEl) {
    themeToggleBtnEl.addEventListener('click', toggleTheme);
  }
});
