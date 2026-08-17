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
const inputPriority = document.getElementById('task-priority');

// State
let tasks = [];
let currentFilter = 'all';
let notificationTimers = {}; // Store timers to clear them if tasks are deleted/updated

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
        // Empty array for a clean slate
        tasks = [];
        saveTasks();
    }
}

// -----------------------------------------
// Flatpickr Initialization
// -----------------------------------------
let datePicker = flatpickr(inputDate, {
    dateFormat: "d-m-Y", // Indian Date Format (DD-MM-YYYY)
    allowInput: true,
    disableMobile: true,
    position: "auto center"
});

let timePicker = flatpickr(inputTime, {
    enableTime: true,
    noCalendar: true,
    dateFormat: "h:i K", // 12-hour format with AM/PM
    time_24hr: false,
    allowInput: true,
    disableMobile: true,
    position: "auto center" // Center to prevent right-edge overflow
});

// -----------------------------------------
// Modal Logic
// -----------------------------------------
function openModal(isEdit = false, task = null) {
    modal.classList.remove('hidden');
    
    if (isEdit && task) {
        modalTitle.textContent = "Edit Task";
        inputId.value = task.id;
        inputTitle.value = task.title;
        inputPriority.checked = !!task.priority;
        datePicker.setDate(task.date);
        timePicker.setDate(task.time);
    } else {
        modalTitle.textContent = "New Task";
        inputId.value = "";
        taskForm.reset();
        inputPriority.checked = false;
        
        // Default to today and current time rounded to nearest hour
        const now = new Date();
        const dateStr = now.getDate().toString().padStart(2, '0') + '-' + 
                        (now.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                        now.getFullYear();
        const timeStr = `${String(now.getHours() + 1).padStart(2, '0')}:00`;
        
        datePicker.setDate(dateStr);
        timePicker.setDate(timeStr);
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
// Notifications & Toast
// -----------------------------------------
function showToast(title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
        </div>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
    
    toast.addEventListener('click', () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    });
}

function scheduleNotification(task) {
    if (notificationTimers[task.id]) {
        clearTimeout(notificationTimers[task.id]);
        delete notificationTimers[task.id];
    }
    
    if (task.completed) return;
    
    try {
        const parts = task.date.split('-');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        const timeMatch = task.time.match(/(\d+):(\d+)\s(AM|PM)/i);
        if (!timeMatch) return;
        
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3].toUpperCase();
        
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        const taskDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        const now = new Date();
        // Calculate time until due
        const timeUntilDue = taskDate.getTime() - now.getTime();
        
        // Schedule if due within next 30 days
        if (timeUntilDue > 0 && timeUntilDue <= 86400000 * 30) {
            
            // 1. Try True Offline Background Notifications (Web Triggers API)
            if ('showTrigger' in Notification.prototype && navigator.serviceWorker) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification("Sleek To-Do Reminder", {
                        body: task.title,
                        icon: "icon-192.png",
                        showTrigger: new TimestampTrigger(taskDate.getTime())
                    }).catch(e => console.warn("Trigger API failed, falling back", e));
                });
            }
            
            // 2. Fallback to in-app timer (only works if tab remains open)
            notificationTimers[task.id] = setTimeout(() => {
                showToast("Task Reminder", task.title);
                
                if ("Notification" in window && Notification.permission === "granted") {
                    try {
                        new Notification("Sleek To-Do Reminder", {
                            body: task.title,
                            icon: "icon-192.png"
                        });
                    } catch (err) {
                        if (navigator.serviceWorker) {
                            navigator.serviceWorker.ready.then(reg => {
                                reg.showNotification("Sleek To-Do Reminder", { body: task.title, icon: "icon-192.png" });
                            });
                        }
                    }
                }
            }, timeUntilDue);
        }
    } catch(e) {
        console.error("Failed to schedule notification", e);
    }
}

// -----------------------------------------
// CRUD Operations
// -----------------------------------------
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Request Notification permission on user gesture (Save button)
    try {
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            await Notification.requestPermission();
        }
    } catch (e) {
        console.warn("Notification permission error:", e);
    }
    
    const id = inputId.value;
    const title = inputTitle.value.trim();
    const date = inputDate.value;
    const time = inputTime.value;
    const priority = inputPriority.checked;
    
    if (!title) return;
    
    let isNew = false;
    let taskObj = null;

    if (id) {
        // Edit existing
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], title, date, time, priority };
            taskObj = tasks[index];
        }
    } else {
        // Create new
        taskObj = {
            id: Date.now().toString(),
            title,
            date,
            time,
            priority,
            completed: false
        };
        tasks.push(taskObj);
        isNew = true;
    }
    
    saveTasks();
    scheduleNotification(taskObj);
    renderTasks(isNew ? taskObj.id : null); // We still sort and render, but we animate intelligently
    closeModal();
});

function toggleTaskStatus(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        scheduleNotification(task);
        
        // Direct DOM update instead of full re-render
        const li = document.querySelector(`li[data-id="${id}"]`);
        if (li) {
            if (task.completed) {
                li.classList.add('completed');
                li.querySelector('input[type="checkbox"]').checked = true;
            } else {
                li.classList.remove('completed');
                li.querySelector('input[type="checkbox"]').checked = false;
            }
        }
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    if (notificationTimers[id]) {
        clearTimeout(notificationTimers[id]);
        delete notificationTimers[id];
    }
    
    // Direct DOM update instead of full re-render
    const li = document.querySelector(`li[data-id="${id}"]`);
    if (li) {
        li.style.transition = 'all 0.3s ease';
        li.style.opacity = '0';
        li.style.transform = 'scale(0.9) translateX(-20px)';
        setTimeout(() => {
            li.remove();
            if (tasks.length === 0) {
                emptyState.classList.remove('hidden');
            }
        }, 300);
    }
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
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderTasks('filter'); // Force animate all on filter
    });
});

function formatDate(dateString) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    try {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const d = new Date(parts[2], parts[1] - 1, parts[0]);
            return d.toLocaleDateString('en-US', options);
        }
        return dateString;
    } catch(e) {
        return dateString;
    }
}

function formatTime(timeString) {
    return timeString; // It's already h:i K from Flatpickr
}

let isInitialLoad = true;

function renderTasks(animateTargetId = null) {
    let filteredTasks = tasks;
    if (currentFilter === 'pending') {
        filteredTasks = tasks.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(t => t.completed);
    }
    
    // Sort by date and time
    filteredTasks.sort((a, b) => {
        try {
            const [d1, m1, y1] = a.date.split('-');
            const dateA = new Date(`${y1}-${m1}-${d1}T${a.time.replace(' PM','').replace(' AM','')}Z`);
            const [d2, m2, y2] = b.date.split('-');
            const dateB = new Date(`${y2}-${m2}-${d2}T${b.time.replace(' PM','').replace(' AM','')}Z`);
            return dateA - dateB;
        } catch(e) { return 0; }
    });
    
    taskList.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        
        filteredTasks.forEach((task, index) => {
            // Schedule notifications on initial load
            if (isInitialLoad) scheduleNotification(task);
            
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''} ${task.priority ? 'high-priority' : ''}`;
            li.setAttribute('data-id', task.id);
            
            // Only animate if it's the initial load, a filter change, or the exact newly added task
            if (isInitialLoad || animateTargetId === 'filter' || task.id === animateTargetId) {
                li.classList.add('animate-in');
                li.style.animationDelay = (animateTargetId === task.id) ? '0s' : `${index * 0.05}s`;
            }
            
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
    isInitialLoad = false;
}
