// DOM Elements
const addBtn = document.getElementById('add-btn');
const modal = document.getElementById('task-modal');
const closeModalBtn = document.getElementById('close-modal');
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const filterTabs = document.querySelectorAll('.filter-tab');
const modalTitle = document.getElementById('modal-title');

// Form Inputs
const inputId = document.getElementById('task-id');
const inputTitle = document.getElementById('task-title');
const inputDate = document.getElementById('task-date');
const inputTime = document.getElementById('task-time');

// State
let tasks = [];
let currentFilter = 'all';

// Boot up
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderTasks();
});

// -----------------------------------------
// Local Storage Persistence
// -----------------------------------------
function saveTasks() {
    localStorage.setItem('sct_todo_tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const saved = localStorage.getItem('sct_todo_tasks');
    if (saved) {
        try {
            tasks = JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse tasks", e);
            tasks = [];
        }
    } else {
        // Default example task if brand new
        tasks = [
            {
                id: Date.now().toString(),
                title: "Buy groceries for dinner",
                date: new Date().toISOString().split('T')[0],
                time: "17:00",
                completed: true
            }
        ];
        saveTasks();
    }
}

// -----------------------------------------
// Modal Logic
// -----------------------------------------
function openModal(isEdit = false, task = null) {
    modal.classList.remove('hidden');
    
    if (isEdit && task) {
        modalTitle.textContent = "Edit Task";
        inputId.value = task.id;
        inputTitle.value = task.title;
        inputDate.value = task.date;
        inputTime.value = task.time;
    } else {
        modalTitle.textContent = "New Task";
        inputId.value = "";
        taskForm.reset();
        
        // Default to today and current time rounded to nearest hour
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = `${String(now.getHours() + 1).padStart(2, '0')}:00`;
        
        inputDate.value = dateStr;
        inputTime.value = timeStr;
    }
    
    setTimeout(() => inputTitle.focus(), 100);
}

function closeModal() {
    modal.classList.add('hidden');
}

addBtn.addEventListener('click', () => openModal(false));
closeModalBtn.addEventListener('click', closeModal);

// Close on outside click
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// -----------------------------------------
// CRUD Operations
// -----------------------------------------
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = inputId.value;
    const title = inputTitle.value.trim();
    const date = inputDate.value;
    const time = inputTime.value;
    
    if (!title) return;
    
    if (id) {
        // Edit existing
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], title, date, time };
        }
    } else {
        // Create new
        const newTask = {
            id: Date.now().toString(),
            title,
            date,
            time,
            completed: false
        };
        tasks.push(newTask);
    }
    
    saveTasks();
    renderTasks();
    closeModal();
});

function toggleTaskStatus(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

function startEditTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        openModal(true, task);
    }
}

// -----------------------------------------
// Filtering & Rendering
// -----------------------------------------
filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Update active class
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        currentFilter = tab.dataset.filter;
        renderTasks();
    });
});

function formatDate(dateString) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    try {
        const d = new Date(dateString);
        // Fix timezone offset issue for pure dates
        const userTimezoneOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() + userTimezoneOffset).toLocaleDateString('en-US', options);
    } catch(e) {
        return dateString;
    }
}

function formatTime(timeString) {
    try {
        const [hours, minutes] = timeString.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHours = h % 12 || 12;
        return `${formattedHours}:${minutes} ${ampm}`;
    } catch(e) {
        return timeString;
    }
}

function renderTasks() {
    // Filter
    let filteredTasks = tasks;
    if (currentFilter === 'pending') {
        filteredTasks = tasks.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(t => t.completed);
    }
    
    // Sort by date and time
    filteredTasks.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
        return dateA - dateB;
    });
    
    // Render
    taskList.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        
        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            // Build inner HTML
            li.innerHTML = `
                <label class="checkbox-container">
                    <input type="checkbox" onchange="toggleTaskStatus('${task.id}')" ${task.completed ? 'checked' : ''}>
                    <div class="checkmark">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </label>
                
                <div class="task-content">
                    <h3 class="task-title" title="${task.title}">${task.title}</h3>
                    <div class="task-meta">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${formatDate(task.date)} • ${formatTime(task.time)}
                    </div>
                </div>
                
                <div class="task-actions">
                    <button class="action-btn edit" onclick="startEditTask('${task.id}')" title="Edit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="deleteTask('${task.id}')" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            `;
            
            taskList.appendChild(li);
        });
    }
}
