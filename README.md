# Sleek Task Manager 📋

**[🔴 View Live Demo](https://to-do.varunkulkarni.dpdns.org/)** | **[📄 View Source Code](https://github.com/VarunKulkarni15/SCT_WD_4)**

A minimalist, high-speed task management application inspired by modern productivity tools (Linear, Notion, Things3). Built with pure HTML5, modern CSS, and Vanilla JavaScript with zero external runtime dependencies.

Developed as **Task 4** for the **Skillcraft Web Development Internship**.

---

## ✨ Features

- **⚡ Natural Language Input Parser**: Type commands directly into the input bar, like:
  `Finish weekly report tomorrow 5pm !high @coding`
  The engine automatically detects dates (`tomorrow`, `today`), times (`5pm`, `10:30am`), priority flags (`!high`, `!med`, `!low`), and category tags (`@coding`, `#personal`).
- **🎛️ Expandable Options Tray**: Click the dropdown chevron to manually set dates, pick times, select priorities, or click category chips with a clean native interface.
- **🎨 Crisp White & Emerald UI**: Minimalist light theme with deep emerald green `#1b6f53` accents, high contrast, clean typography (Inter), and custom square checkboxes with smooth check animations.
- **⌨️ Keyboard-First Power Shortcuts**:
  - `N` → Instantly focus task input
  - `/` → Jump straight to search
  - `Esc` → Clear search or cancel
- **🔍 Real-Time Search & Filters**: Instant search by task title or category tag, plus filter tabs for *All*, *Pending*, and *Completed*.
- **📊 Dynamic Sorting**: Sort instantly by *Newest*, *Oldest*, *Priority* (High → Med → Low), or *Due Date*.
- **💾 LocalStorage Persistence**: Automatically saves your entire workflow locally in the browser with seed sample tasks for first-time users.
- **✏️ In-Place Task Editing**: Edit title, due date, time, priority, and category via an elegant modal dialog.

---

## 🚀 Tech Stack

- **HTML5**: Semantic markup, accessible forms, native date/time pickers.
- **Vanilla CSS3**: Modern CSS variables, flexbox, custom checkboxes, subtle micro-interactions, responsive mobile layout.
- **Vanilla JavaScript (ES6+)**: Custom date parsing engine, DOM manipulation, LocalStorage synchronization, zero external libraries.

---

## 🛠️ Usage

1. Clone the repository:
   ```bash
   git clone https://github.com/VarunKulkarni15/SCT_WD_4.git
   ```
2. Open `index.html` in your browser. No build steps, npm installs, or compilers needed!

---

*Created by Varun Kulkarni for the Skillcraft Web Development Internship.*
