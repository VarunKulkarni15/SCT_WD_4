// ==========================================================
// Sleek Task Manager - Application Logic
// Zero External Dependencies | Fast | LocalStorage Persistence
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const taskCountEl = document.getElementById('task-count');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // Options Tray Elements
    const toggleOptionsBtn = document.getElementById('toggle-options-btn');
    const optionsTray = document.getElementById('options-tray');
    const optionDate = document.getElementById('option-date');
    const optionTime = document.getElementById('option-time');
    const chipBtns = document.querySelectorAll('.chip-btn');
    const priorityBtns = document.querySelectorAll('.priority-btn');
    const tagBtns = document.querySelectorAll('.tag-btn');

    // Edit Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editTaskTitle = document.getElementById('edit-task-title');
    const editTaskDate = document.getElementById('edit-task-date');
    const editTaskTime = document.getElementById('edit-task-time');
    const editTaskPriority = document.getElementById('edit-task-priority');
    const editTaskTag = document.getElementById('edit-task-tag');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // State
    let selectedPriority = 'none';
    let selectedTag = '';
    let currentFilter = 'all';
    let editingTaskId = null;

    // Sample initial seed tasks (matching the user's friend's screenshot)
    const SEED_TASKS = [
        {
            id: 'task-1',
            title: 'Finish project documentation',
            dateStr: '5 Sep · 10:30 AM',
            isoDate: '2026-09-05',
            isoTime: '10:30',
            priority: 'high',
            tag: 'Coding',
            completed: true,
            createdAt: Date.now() - 3600000 * 48
        },
        {
            id: 'task-2',
            title: 'Complete Python assignment',
            dateStr: '4 Sep · 11:00 AM',
            isoDate: '2026-09-04',
            isoTime: '11:00',
            priority: 'medium',
            tag: 'College',
            completed: false,
            createdAt: Date.now() - 3600000 * 24
        },
        {
            id: 'task-3',
            title: 'Go for evening walk',
            dateStr: '7 Sep · 6:00 AM',
            isoDate: '2026-09-07',
            isoTime: '06:00',
            priority: 'medium',
            tag: 'Personal',
            completed: false,
            createdAt: Date.now()
        }
    ];

    // Load from LocalStorage or seed defaults
    let tasks = [];
    try {
        const stored = localStorage.getItem('sleek_tasks');
        if (stored) {
            const parsed = JSON.parse(stored);
            tasks = Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_TASKS;
        } else {
            tasks = SEED_TASKS;
            saveTasks();
        }
    } catch (e) {
        console.warn('LocalStorage error:', e);
        tasks = SEED_TASKS;
    }

    function saveTasks() {
        try {
            localStorage.setItem('sleek_tasks', JSON.stringify(tasks));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    }

    function generateId() {
        return 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    }

    // --- Format Date Helpers ---
    function formatPrettyDate(dateObj, timeStr = '') {
        if (!dateObj || isNaN(dateObj.getTime())) return '';
        const day = dateObj.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[dateObj.getMonth()];
        
        let formatted = `${day} ${month}`;
        if (timeStr) {
            formatted += ` · ${formatPrettyTime(timeStr)}`;
        }
        return formatted;
    }

    function formatPrettyTime(time24) {
        if (!time24) return '';
        const parts = time24.split(':');
        let hours = parseInt(parts[0], 10);
        const mins = parts[1] || '00';
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${mins} ${ampm}`;
    }

    // --- Natural Language Parser ---
    function parseInputText(rawText) {
        let text = rawText.trim();
        let priority = selectedPriority !== 'none' ? selectedPriority : 'none';
        let tag = selectedTag || '';
        let targetDate = null;
        let targetTime = optionTime.value || '';

        // Priority matching: !high, !med, !medium, !low
        if (/!high\b/i.test(text)) {
            priority = 'high';
            text = text.replace(/!high\b/gi, '');
        } else if (/!(med|medium)\b/i.test(text)) {
            priority = 'medium';
            text = text.replace(/!(med|medium)\b/gi, '');
        } else if (/!low\b/i.test(text)) {
            priority = 'low';
            text = text.replace(/!low\b/gi, '');
        }

        // Tag matching: @coding, #coding
        const tagMatch = text.match(/[@#]([a-zA-Z0-9_-]+)/);
        if (tagMatch) {
            if (!tag) tag = tagMatch[1];
            text = text.replace(tagMatch[0], '');
        }

        // Relative dates: tomorrow, today, weekend
        const now = new Date();
        if (/\btomorrow\b/i.test(text)) {
            targetDate = new Date(now);
            targetDate.setDate(now.getDate() + 1);
            text = text.replace(/\btomorrow\b/gi, '');
        } else if (/\btoday\b/i.test(text)) {
            targetDate = new Date(now);
            text = text.replace(/\btoday\b/gi, '');
        } else if (optionDate.value) {
            const [y, m, d] = optionDate.value.split('-');
            targetDate = new Date(y, m - 1, d);
        }

        // Time parsing: e.g. 5pm, 10:30am, 9am
        const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
        if (timeMatch && !targetTime) {
            let h = parseInt(timeMatch[1], 10);
            const m = timeMatch[2] || '00';
            const meridiem = timeMatch[3].toLowerCase();
            if (meridiem === 'pm' && h < 12) h += 12;
            if (meridiem === 'am' && h === 12) h = 0;
            targetTime = `${h < 10 ? '0' : ''}${h}:${m}`;
            text = text.replace(timeMatch[0], '');
        }

        // Clean up title
        let cleanTitle = text.replace(/\s+/g, ' ').trim();
        if (!cleanTitle) cleanTitle = 'Untitled task';

        // Format Date String
        let dateStr = '';
        let isoDate = '';
        if (targetDate) {
            dateStr = formatPrettyDate(targetDate, targetTime);
            isoDate = targetDate.toISOString().split('T')[0];
        }

        return {
            id: generateId(),
            title: cleanTitle,
            dateStr,
            isoDate,
            isoTime: targetTime,
            priority,
            tag,
            completed: false,
            createdAt: Date.now()
        };
    }

    // --- Render Tasks ---
    function renderTasks() {
        const query = (searchInput.value || '').toLowerCase().trim();
        const sortBy = sortSelect.value;

        // 1. Filter
        let filtered = tasks.filter(t => {
            // Filter tab
            if (currentFilter === 'pending' && t.completed) return false;
            if (currentFilter === 'completed' && !t.completed) return false;

            // Search query
            if (query) {
                const matchesTitle = t.title.toLowerCase().includes(query);
                const matchesTag = (t.tag || '').toLowerCase().includes(query);
                return matchesTitle || matchesTag;
            }
            return true;
        });

        // 2. Sort
        filtered.sort((a, b) => {
            if (sortBy === 'newest') return b.createdAt - a.createdAt;
            if (sortBy === 'oldest') return a.createdAt - b.createdAt;
            if (sortBy === 'priority') {
                const pMap = { high: 3, medium: 2, low: 1, none: 0 };
                return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
            }
            if (sortBy === 'due') {
                if (!a.isoDate) return 1;
                if (!b.isoDate) return -1;
                return a.isoDate.localeCompare(b.isoDate);
            }
            return 0;
        });

        // 3. Update task count
        taskCountEl.textContent = `${filtered.length} task${filtered.length === 1 ? '' : 's'}`;

        // 4. Empty state
        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            taskList.innerHTML = '';
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        // 5. Render DOM
        taskList.innerHTML = '';
        filtered.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card ${task.completed ? 'completed' : ''}`;
            card.dataset.id = task.id;

            // Priority markup
            let priorityMarkup = '';
            if (task.priority === 'high') {
                priorityMarkup = `<span class="meta-priority priority-high-text"><span class="bars-icon bars-high"></span> High</span>`;
            } else if (task.priority === 'medium') {
                priorityMarkup = `<span class="meta-priority priority-med-text"><span class="bars-icon bars-med"></span> Medium</span>`;
            } else if (task.priority === 'low') {
                priorityMarkup = `<span class="meta-priority priority-low-text"><span class="bars-icon bars-low"></span> Low</span>`;
            }

            // Date markup
            let dateMarkup = '';
            if (task.dateStr) {
                dateMarkup = `<span class="meta-date">${escapeHTML(task.dateStr)}</span>`;
            }

            // Tag markup
            let tagMarkup = '';
            if (task.tag) {
                tagMarkup = `<span class="meta-tag">${escapeHTML(task.tag)}</span>`;
            }

            // Meta row exists if there's date, priority, or tag
            let metaRowHtml = '';
            if (dateMarkup || priorityMarkup || tagMarkup) {
                metaRowHtml = `
                    <div class="task-meta-row">
                        ${dateMarkup}
                        ${priorityMarkup}
                        ${tagMarkup}
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="task-main-row">
                    <button type="button" class="task-checkbox-box" title="${task.completed ? 'Mark pending' : 'Mark completed'}" aria-label="Toggle task status">
                        <svg class="checkbox-check-icon" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                    <div class="task-title-group">
                        <span class="task-title">${escapeHTML(task.title)}</span>
                        ${task.completed ? '<span class="badge-done">DONE</span>' : ''}
                    </div>
                    <div class="task-actions">
                        <button type="button" class="btn-icon-action edit" title="Edit task" aria-label="Edit task">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                        </button>
                        <button type="button" class="btn-icon-action delete" title="Delete task" aria-label="Delete task">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                ${metaRowHtml}
            `;

            taskList.appendChild(card);
        });
    }

    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // --- Add Task Handler ---
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = taskInput.value.trim();
        if (!raw) return;

        const newTask = parseInputText(raw);
        tasks.unshift(newTask); // Put at the top
        saveTasks();

        // Reset input form
        taskInput.value = '';
        optionDate.value = '';
        optionTime.value = '';
        selectedPriority = 'none';
        selectedTag = '';

        priorityBtns.forEach(btn => btn.classList.remove('active'));
        tagBtns.forEach(btn => btn.classList.remove('active'));
        optionsTray.classList.add('hidden');
        toggleOptionsBtn.classList.remove('open');

        renderTasks();
    });

    // --- Task List Interactions (Checkbox, Edit, Delete) ---
    taskList.addEventListener('click', (e) => {
        const card = e.target.closest('.task-card');
        if (!card) return;
        const taskId = card.dataset.id;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Toggle Checkbox
        if (e.target.closest('.task-checkbox-box')) {
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
            return;
        }

        // Delete Button
        if (e.target.closest('.btn-icon-action.delete')) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            card.style.transition = 'all 0.15s ease';
            setTimeout(() => {
                tasks = tasks.filter(t => t.id !== taskId);
                saveTasks();
                renderTasks();
            }, 150);
            return;
        }

        // Edit Button
        if (e.target.closest('.btn-icon-action.edit')) {
            openEditModal(task);
            return;
        }
    });

    // --- Options Tray Toggling & Chips ---
    toggleOptionsBtn.addEventListener('click', () => {
        const isHidden = optionsTray.classList.toggle('hidden');
        toggleOptionsBtn.classList.toggle('open', !isHidden);
    });

    // Quick Date Chips
    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            const now = new Date();
            let d = new Date(now);

            if (preset === 'today') {
                // Today
            } else if (preset === 'tomorrow') {
                d.setDate(now.getDate() + 1);
            } else if (preset === 'weekend') {
                const dayOfWeek = now.getDay();
                const distToSaturday = (6 - dayOfWeek + 7) % 7 || 7;
                d.setDate(now.getDate() + distToSaturday);
            }

            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            optionDate.value = `${y}-${m}-${day}`;
        });
    });

    // Priority Chips
    priorityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.priority;
            if (selectedPriority === p) {
                selectedPriority = 'none';
                btn.classList.remove('active');
            } else {
                selectedPriority = p;
                priorityBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // Tag Chips
    tagBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            if (selectedTag === tag) {
                selectedTag = '';
                btn.classList.remove('active');
            } else {
                selectedTag = tag;
                tagBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // --- Search & Filter & Sort ---
    searchInput.addEventListener('input', () => renderTasks());
    sortSelect.addEventListener('change', () => renderTasks());

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // --- Edit Modal Logic ---
    function openEditModal(task) {
        editingTaskId = task.id;
        editTaskTitle.value = task.title;
        editTaskDate.value = task.isoDate || '';
        editTaskTime.value = task.isoTime || '';
        editTaskPriority.value = task.priority || 'none';
        editTaskTag.value = task.tag || '';
        editModal.classList.remove('hidden');
        editTaskTitle.focus();
    }

    function closeEditModal() {
        editModal.classList.add('hidden');
        editingTaskId = null;
    }

    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);

    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!editingTaskId) return;

        const task = tasks.find(t => t.id === editingTaskId);
        if (!task) return;

        const title = editTaskTitle.value.trim();
        if (!title) return;

        task.title = title;
        task.isoDate = editTaskDate.value;
        task.isoTime = editTaskTime.value;
        task.priority = editTaskPriority.value;
        task.tag = editTaskTag.value.trim();

        if (task.isoDate) {
            const [y, m, d] = task.isoDate.split('-');
            const dateObj = new Date(y, m - 1, d);
            task.dateStr = formatPrettyDate(dateObj, task.isoTime);
        } else {
            task.dateStr = '';
        }

        saveTasks();
        closeEditModal();
        renderTasks();
    });

    // --- Keyboard Shortcuts (N, /, Esc) ---
    document.addEventListener('keydown', (e) => {
        // If modal is open, let Esc close it
        if (!editModal.classList.contains('hidden')) {
            if (e.key === 'Escape') closeEditModal();
            return;
        }

        const activeTag = (document.activeElement && document.activeElement.tagName) || '';
        const isInputActive = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

        if (!isInputActive) {
            if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                taskInput.focus();
                taskInput.select();
            } else if (e.key === '/') {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
        } else {
            if (e.key === 'Escape') {
                document.activeElement.blur();
                if (optionsTray && !optionsTray.classList.contains('hidden')) {
                    optionsTray.classList.add('hidden');
                    toggleOptionsBtn.classList.remove('open');
                }
            }
        }
    });

    // Initial render
    renderTasks();
});
