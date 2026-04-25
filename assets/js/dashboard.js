import { db } from "./firebase-init.js";
import { protectPage, setupLogoutButton } from "./auth.js";
import { qs, formatDate } from "./common.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const user = await protectPage();
setupLogoutButton();

const list = qs('#dashboardProjects');
const empty = qs('#dashboardEmpty');
const countEl = qs('#projectCount');
const statusEl = qs('#dashboardStatus');
const welcomeEl = qs('#dashboardWelcome');
const latestTitle = qs('#latestProjectTitle');
const latestMeta = qs('#latestProjectMeta');
const latestLink = qs('#latestProjectLink');
const loadingEl = qs('#dashboardLoading');

function setStatus(message, type = 'info') {
  if (!statusEl) return;
  statusEl.className = `status show ${type}`;
  statusEl.textContent = message;
}

function renderProjects(projects) {
  const latestThree = projects.slice(0, 3);

  if (countEl) countEl.textContent = String(projects.length);
  if (welcomeEl) welcomeEl.textContent = user?.email || 'your workspace';

  if (!projects.length) {
    empty?.classList.remove('hidden');
    if (list) list.innerHTML = '';
    if (latestTitle) latestTitle.textContent = 'No project yet';
    if (latestMeta) latestMeta.textContent = 'Create your first premium website from the Create page.';
    if (latestLink) latestLink.href = 'create.html';
    return;
  }

  empty?.classList.add('hidden');

  const latest = projects[0];
  if (latestTitle) latestTitle.textContent = latest.title || 'Untitled project';
  if (latestMeta) latestMeta.textContent = `${latest.type || 'website'} • ${formatDate(latest.createdAt)}`;
  if (latestLink) latestLink.href = `preview.html?id=${latest.id}`;

  list.innerHTML = latestThree.map((project, index) => `
    <article class="project-showcase card fade-up" style="animation-delay:${index * 70}ms">
      <div class="project-showcase-top">
        <span class="soft-tag">${project.type || 'website'}</span>
        <span class="muted tiny">${formatDate(project.createdAt)}</span>
      </div>
      <h3>${project.title || 'Untitled project'}</h3>
      <p class="muted">${project.description || 'Generated with SparkBuild AI.'}</p>
      <div class="project-mini-preview">
        <div class="project-mini-bar"></div>
        <div class="project-mini-grid">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="button-row compact">
        <a href="preview.html?id=${project.id}"><button>Open</button></a>
        <a href="history.html"><button class="secondary">History</button></a>
        <button class="danger" data-delete-id="${project.id}">Delete</button>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await deleteProject(btn.dataset.deleteId);
    });
  });
}

async function deleteProject(projectId) {
  const ok = confirm('Delete this project permanently?');
  if (!ok) return;

  try {
    await deleteDoc(doc(db, 'projects', projectId));
    setStatus('Project deleted successfully.', 'success');
    await loadDashboardProjects();
  } catch (error) {
    console.error(error);
    setStatus('Could not delete this project.', 'error');
  }
}

async function loadDashboardProjects() {
  try {
    const projectsRef = collection(db, 'projects');
    const snap = await getDocs(query(projectsRef, where('userId', '==', user.uid)));
    const projects = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    projects.sort((a, b) => {
      const aTime = a?.createdAt?.seconds || 0;
      const bTime = b?.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    renderProjects(projects);
    statusEl?.classList.remove('show');
  } catch (error) {
    console.error(error);
    setStatus('Dashboard could not load your projects. Firebase is connected, but Firestore query permissions or indexes may need a refresh.', 'error');
  } finally {
    loadingEl?.classList.add('hidden');
  }
}

if (user) {
  await loadDashboardProjects();
}