// Initialize storage and state
let tasks = [];
let links = [];
let timerMinutes = 25;
let timerSeconds = 0;
let timerIntervalId = null;
let timerStatus = 'idle'; // 'idle', 'running', 'paused'

let previousGreetingCategory = null;

// Clock
function updateClock() {
  const now = new Date();
  const hours = now.getHours() % 12 || 12;
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
function addTodo(text) {
  if (!text || text.trim() === '') return;
  const newTask = {
    id: crypto.randomUUID(),
    text: text.trim(),
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

function renderTodos() {
  const todoListElement = document.getElementById('todo-items');
  if (!todoListElement) return;

  todoListElement.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.innerHTML = `
      <input type="checkbox" class="todo-checkbox" data-id="${task.id}" ${task.done ? 'checked' : ''}>
      <span class="todo-text ${task.done ? 'done' : ''}" contenteditable="false" data-id="${task.id}">${task.text}</span>
      <button class="edit-btn" data-id="${task.id}">Edit</button>
      <button class="delete-btn" data-id="${task.id}">Delete</button>
    `;
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

function saveTodos() {
  saveToStorage('tasks', tasks);
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
    linkButton.innerHTML = `
      <span>${link.name}</span>
      <button class="small-delete-btn" data-id="${link.id}">\u00d7</button>
    `;
    linkButton.addEventListener('click', (e) => {
      if (e.target.classList.contains('small-delete-btn')) return;
      window.open(link.url, '_blank', 'noopener,noreferrer');
    });

    const deleteBtn = linkButton.querySelector('.small-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLink(link.id);
    });

    linksGridElement.appendChild(linkButton);
  });
}

function saveLinks() {
  saveToStorage('links', links);
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

  alert('Time is up!');
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
  loadFromStorage();
  initClock();
  initGreeting();
  initTimerDisplay();
  renderTodos();
  renderLinks();
  initEventListeners();
});
