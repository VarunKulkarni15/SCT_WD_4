document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const taskForm = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');
    const taskCountEl = document.getElementById('task-count');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    const editModal = document.getElementById('edit-modal');
    const editInput = document.getElementById('edit-input');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const saveEditBtn = document.getElementById('save-edit');

    let tasks = JSON.parse(localStorage.getItem('sleek_tasks')) || [];
    let editingTaskId = null;

    // --- Core Functions ---
    function saveTasks() {
        localStorage.setItem('sleek_tasks', JSON.stringify(tasks));
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // --- NLP Parser ---
    function parseTaskInput(rawText) {
        let title = rawText;
        let priority = 'none';
        let dateStr = '';
        let tag = '';

        // Extract Priority
        if (title.toLowerCase().includes('!high')) { priority = 'high'; title = title.replace(/!high/i, ''); }
        else if (title.toLowerCase().includes('!medium')) { priority = 'medium'; title = title.replace(/!medium/i, ''); }
        else if (title.toLowerCase().includes('!low')) { priority = 'low'; title = title.replace(/!low/i, ''); }

        // Extract Date (Basic Simulation)
        if (title.toLowerCase().includes('tomorrow')) {
            const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
            dateStr = tmrw.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            title = title.replace(/tomorrow/i, '');
        } else if (title.toLowerCase().includes('today')) {
            const today = new Date();
            dateStr = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            title = title.replace(/today/i, '');
        }

        // Extract Tag (e.g., @coding, @personal)
        const tagMatch = title.match(/@(\w+)/);
        if (tagMatch) {
            tag = tagMatch[1];
            title = title.replace(tagMatch[0], '');
        }

        return {
            id: generateId(),
            title: title.trim(),
            priority,
            dateStr,
            tag,
            completed: false,
            createdAt: Date.now()
        };
    }

    // --- Render ---
    function renderTasks() {
        const searchTerm = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;

        let filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm));

        if (sortValue === 'newest') {
            filteredTasks.sort((a, b) => b.createdAt - a.createdAt);
        } else {
            filteredTasks.sort((a, b) => a.createdAt - b.createdAt);
        }

        taskList.innerHTML = '';
        taskCountEl.textContent = `${filteredTasks.length} task${filteredTasks.length !== 1 ? 's' : ''}`;

        filteredTasks.forEach(task => {
            const div = document.createElement('div');
            div.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            // Generate Badges HTML
            let badgesHtml = '';
            if (task.completed) {
                badgesHtml += `<span class="badge badge-done">DONE</span>`;
            }
            if (task.dateStr) {
                badgesHtml += `<span class="badge badge-date">${task.dateStr}</span>`;
            }
            if (task.priority === 'high') {
                badgesHtml += `<span class="badge badge-priority-high"><i class="fa-solid fa-arrow-up"></i> High</span>`;
            } else if (task.priority === 'medium') {
                badgesHtml += `<span class="badge badge-priority-medium"><i class="fa-solid fa-minus"></i> Medium</span>`;
            }
            if (task.tag) {
                badgesHtml += `<span class="badge badge-tag">${task.tag.charAt(0).toUpperCase() + task.tag.slice(1)}</span>`;
            }

            div.innerHTML = `
                <div class="task-checkbox" data-id="${task.id}">
                    <i class="fa-solid fa-check"></i>
                </div>
                <div class="task-content">
                    <span class="task-title">${task.title}</span>
                    ${badgesHtml}
                </div>
                <div class="task-actions">
                    <button class="btn-icon edit-btn" data-id="${task.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete delete-btn" data-id="${task.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            taskList.appendChild(div);
        });
    }

    // --- Events ---
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = taskInput.value.trim();
        if (!val) return;
        
        const newTask = parseTaskInput(val);
        tasks.push(newTask);
        saveTasks();
        taskInput.value = '';
        renderTasks();
    });

    taskList.addEventListener('click', (e) => {
        const target = e.target.closest('.task-checkbox, .delete-btn, .edit-btn');
        if (!target) return;

        const id = target.dataset.id;
        
        if (target.classList.contains('task-checkbox')) {
            const task = tasks.find(t => t.id === id);
            if (task) task.completed = !task.completed;
            saveTasks();
            renderTasks();
        } 
        else if (target.classList.contains('delete-btn')) {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
        }
        else if (target.classList.contains('edit-btn')) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                editingTaskId = id;
                editInput.value = task.title;
                editModal.classList.remove('hidden');
                editInput.focus();
            }
        }
    });

    // Edit Modal Events
    cancelEditBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
        editingTaskId = null;
    });

    saveEditBtn.addEventListener('click', () => {
        if (!editingTaskId) return;
        const task = tasks.find(t => t.id === editingTaskId);
        if (task && editInput.value.trim() !== '') {
            task.title = editInput.value.trim();
            saveTasks();
            renderTasks();
        }
        editModal.classList.add('hidden');
        editingTaskId = null;
    });

    // Search and Sort
    searchInput.addEventListener('input', renderTasks);
    sortSelect.addEventListener('change', renderTasks);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts if user is typing in edit modal
        if (!editModal.classList.contains('hidden')) {
            if (e.key === 'Escape') cancelEditBtn.click();
            if (e.key === 'Enter') saveEditBtn.click();
            return;
        }

        // Only trigger N or / if not currently focused on an input
        const isInputFocused = document.activeElement.tagName === 'INPUT';
        
        if (!isInputFocused) {
            if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                taskInput.focus();
            }
            if (e.key === '/') {
                e.preventDefault();
                searchInput.focus();
            }
        }

        if (e.key === 'Escape') {
            taskInput.blur();
            taskInput.value = '';
            searchInput.blur();
            searchInput.value = '';
            renderTasks();
        }
    });

    // Initial render
    renderTasks();
});
