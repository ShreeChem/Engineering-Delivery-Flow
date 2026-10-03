(function () {
  'use strict';

  const KEY = 'edf_v24_demo';
  const roles = ['Administrator', 'Project Manager', 'Lead', 'Engineer', 'Main Contractor', 'Plant Owner'];

  function defaultState() {
    return {
      currentRole: 'Administrator',
      users: [
        { id: 'admin', name: 'Administrator', role: 'Administrator', email: 'admin@demo.local' },
        { id: 'pm1', name: 'Alicia Smith', role: 'Project Manager', email: 'pm@demo.local' },
        { id: 'lead1', name: 'Ben Moore', role: 'Lead', email: 'lead@demo.local' },
        { id: 'eng1', name: 'Chloe Patel', role: 'Engineer', email: 'engineer@demo.local' },
        { id: 'mc1', name: 'Main Contractor', role: 'Main Contractor', email: 'contractor@demo.local' },
        { id: 'po1', name: 'Plant Owner', role: 'Plant Owner', email: 'owner@demo.local' }
      ],
      projects: [
        {
          id: 'p1',
          code: 'OTS-001',
          name: 'Aromatics Unit Revamp',
          type: 'OTS',
          customer: 'Plant Owner',
          status: 'Active',
          progress: 42,
          baseline: 'Approved'
        },
        {
          id: 'p2',
          code: 'MES-021',
          name: 'MES Startup Readiness',
          type: 'MES',
          customer: 'Main Contractor',
          status: 'Active',
          progress: 66,
          baseline: 'Approved'
        }
      ],
      tasks: [
        { id: 't1', projectId: 'p1', title: 'Process model review', owner: 'eng1', status: 'In Progress', due: '2026-10-05' },
        { id: 't2', projectId: 'p1', title: 'Baseline approval', owner: 'pm1', status: 'Ready for Review', due: '2026-10-07' },
        { id: 't3', projectId: 'p2', title: 'MES test case closure', owner: 'lead1', status: 'Blocked', due: '2026-10-08' }
      ]
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    } catch (err) {
      return defaultState();
    }
  }

  function saveState(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  let state = loadState();

  function getUserById(id) {
    return state.users.find((u) => u.id === id) || { id: 'unknown', name: 'Unassigned', role: 'Engineer' };
  }

  function renderDashboard() {
    const cards = state.projects.map((project) => `
      <div class="project-card">
        <div class="project-head">
          <div>
            <div class="eyebrow">${project.type}</div>
            <h3>${project.name}</h3>
          </div>
          <span class="status-badge">${project.status}</span>
        </div>
        <div class="project-meta">
          <span>${project.code}</span>
          <span>${project.customer}</span>
        </div>
        <div class="progress-bar"><span style="width:${project.progress}%"></span></div>
        <div class="progress-label">${project.progress}% complete</div>
      </div>
    `).join('');

    const taskRows = state.tasks.map((task) => {
      const owner = getUserById(task.owner);
      return `
        <tr>
          <td>${task.title}</td>
          <td>${owner.name}</td>
          <td><span class="status-badge">${task.status}</span></td>
          <td>${task.due}</td>
        </tr>
      `;
    }).join('');

    return `
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">ED</span>
          <div>
            <strong>Engineering Delivery Flow</strong>
            <small>OTS + MES PROJECT WORKFLOW</small>
          </div>
        </div>
        <div class="top-actions">
          <select id="role-switcher" aria-label="Role selector">
            ${roles.map((role) => `<option value="${role}" ${state.currentRole === role ? 'selected' : ''}>${role}</option>`).join('')}
          </select>
        </div>
      </header>

      <div class="layout">
        <aside class="sidebar">
          <nav>
            <button class="nav active" data-view="dashboard">⌂ Dashboard</button>
            <button class="nav" data-view="projects">▦ Projects</button>
            <button class="nav" data-view="tasks">◫ Tasks</button>
            <button class="nav" data-view="reports">▤ Reports</button>
          </nav>
        </aside>

        <main class="workspace">
          <section class="hero">
            <div>
              <div class="eyebrow">Portfolio</div>
              <h1>Engineering Delivery Flow</h1>
              <p>Public-safe V24 reconstruction for OTS and MES workflow review.</p>
            </div>
            <div class="hero-metrics">
              <div><small>Projects</small><strong>${state.projects.length}</strong></div>
              <div><small>Tasks</small><strong>${state.tasks.length}</strong></div>
              <div><small>Role</small><strong>${state.currentRole}</strong></div>
            </div>
          </section>

          <section class="cards">${cards}</section>

          <section class="panel">
            <div class="panel-head">
              <h3>Task overview</h3>
              <button type="button" class="btn primary" id="add-task">Add task</button>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>${taskRows}</tbody>
            </table>
          </section>
        </main>
      </div>
    `;
  }

  function renderProjects() {
    const rows = state.projects.map((project) => `
      <tr>
        <td>${project.code}</td>
        <td>${project.name}</td>
        <td>${project.type}</td>
        <td><span class="status-badge">${project.status}</span></td>
        <td><div class="progress-bar"><span style="width:${project.progress}%"></span></div></td>
      </tr>
    `).join('');

    return `
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">ED</span>
          <div>
            <strong>Engineering Delivery Flow</strong>
            <small>Projects</small>
          </div>
        </div>
        <div class="top-actions">
          <select id="role-switcher" aria-label="Role selector">
            ${roles.map((role) => `<option value="${role}" ${state.currentRole === role ? 'selected' : ''}>${role}</option>`).join('')}
          </select>
        </div>
      </header>
      <div class="layout">
        <aside class="sidebar">
          <nav>
            <button class="nav" data-view="dashboard">⌂ Dashboard</button>
            <button class="nav active" data-view="projects">▦ Projects</button>
            <button class="nav" data-view="tasks">◫ Tasks</button>
            <button class="nav" data-view="reports">▤ Reports</button>
          </nav>
        </aside>
        <main class="workspace">
          <section class="panel">
            <div class="panel-head">
              <h3>Projects</h3>
              <button type="button" class="btn primary" id="add-project">Add project</button>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>
        </main>
      </div>
    `;
  }

  function renderTasks() {
    const rows = state.tasks.map((task) => `
      <tr>
        <td>${task.title}</td>
        <td>${getUserById(task.owner).name}</td>
        <td><span class="status-badge">${task.status}</span></td>
        <td>${task.due}</td>
      </tr>
    `).join('');

    return `
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">ED</span>
          <div>
            <strong>Engineering Delivery Flow</strong>
            <small>Tasks</small>
          </div>
        </div>
        <div class="top-actions">
          <select id="role-switcher" aria-label="Role selector">
            ${roles.map((role) => `<option value="${role}" ${state.currentRole === role ? 'selected' : ''}>${role}</option>`).join('')}
          </select>
        </div>
      </header>
      <div class="layout">
        <aside class="sidebar">
          <nav>
            <button class="nav" data-view="dashboard">⌂ Dashboard</button>
            <button class="nav" data-view="projects">▦ Projects</button>
            <button class="nav active" data-view="tasks">◫ Tasks</button>
            <button class="nav" data-view="reports">▤ Reports</button>
          </nav>
        </aside>
        <main class="workspace">
          <section class="panel">
            <div class="panel-head">
              <h3>Tasks</h3>
              <button type="button" class="btn primary" id="add-task">Add task</button>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>
        </main>
      </div>
    `;
  }

  function renderReports() {
    return `
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">ED</span>
          <div>
            <strong>Engineering Delivery Flow</strong>
            <small>Reports</small>
          </div>
        </div>
        <div class="top-actions">
          <select id="role-switcher" aria-label="Role selector">
            ${roles.map((role) => `<option value="${role}" ${state.currentRole === role ? 'selected' : ''}>${role}</option>`).join('')}
          </select>
        </div>
      </header>
      <div class="layout">
        <aside class="sidebar">
          <nav>
            <button class="nav" data-view="dashboard">⌂ Dashboard</button>
            <button class="nav" data-view="projects">▦ Projects</button>
            <button class="nav" data-view="tasks">◫ Tasks</button>
            <button class="nav active" data-view="reports">▤ Reports</button>
          </nav>
        </aside>
        <main class="workspace">
          <section class="panel">
            <h3>Weekly Report Preview</h3>
            <p>Portfolio status is healthy. Project performance is stable for the current demo cycle.</p>
            <ul>
              <li>Schedule: On track</li>
              <li>Cost: Within threshold</li>
              <li>Quality: Acceptable</li>
            </ul>
          </section>
        </main>
      </div>
    `;
  }

  function renderApp(view = 'dashboard') {
    const content = {
      dashboard: renderDashboard,
      projects: renderProjects,
      tasks: renderTasks,
      reports: renderReports
    };

    const app = document.getElementById('app');
    app.innerHTML = content[view] ? content[view]() : content.dashboard();

    document.querySelectorAll('.nav').forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.view;
        renderApp(target);
      });
    });

    const roleSwitcher = document.getElementById('role-switcher');
    if (roleSwitcher) {
      roleSwitcher.addEventListener('change', (event) => {
        state.currentRole = event.target.value;
        saveState(state);
        renderApp('dashboard');
      });
    }

    const addTaskButton = document.getElementById('add-task');
    if (addTaskButton) {
      addTaskButton.addEventListener('click', () => {
        const title = window.prompt('Task title?');
        if (!title) return;
        state.tasks.push({
          id: 't' + Date.now(),
          projectId: state.projects[0]?.id || 'p1',
          title,
          owner: 'eng1',
          status: 'In Progress',
          due: new Date().toISOString().slice(0, 10)
        });
        saveState(state);
        renderApp('tasks');
      });
    }

    const addProjectButton = document.getElementById('add-project');
    if (addProjectButton) {
      addProjectButton.addEventListener('click', () => {
        const name = window.prompt('Project name?');
        if (!name) return;
        state.projects.push({
          id: 'p' + Date.now(),
          code: 'NEW-' + state.projects.length,
          name,
          type: 'OTS',
          customer: 'Plant Owner',
          status: 'Active',
          progress: 10,
          baseline: 'Draft'
        });
        saveState(state);
        renderApp('projects');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => renderApp('dashboard'));
  } else {
    renderApp('dashboard');
  }
})();
