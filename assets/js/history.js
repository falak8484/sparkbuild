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

const list = qs('#historyList');
const empty = qs('#historyEmpty');
const statusEl = qs('#historyStatus');

function setStatus(message, type = 'info') {
  if (!statusEl) return;
  statusEl.className = `status show ${type}`;
  statusEl.textContent = message;
}

function renderHistory(projects) {
  if (!projects.length) {
    empty?.classList.remove('hidden');
    if (list) list.innerHTML = '';
    return;
  }

  empty?.classList.add('hidden');

  list.innerHTML = projects.map((project, index) => `
    <article class="history-card card fade-up" style="animation-delay:${index * 60}ms">
      <div class="project-showcase-top">
        <span class="soft-tag">${project.type || 'website'}</span>
        <span class="muted tiny">${formatDate(project.createdAt)}</span>
      </div>
      <h3>${project.title || 'Untitled project'}</h3>
      <p class="muted">${project.description || 'Generated with SparkBuild AI.'}</p>
      <div class="button-row compact">
        <a href="preview.html?id=${project.id}"><button>Open</button></a>
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
    await loadHistory();
  } catch (error) {
    console.error(error);
    setStatus('Could not delete this project.', 'error');
  }
}

async function loadHistory() {
  try {
    const projectsRef = collection(db, 'projects');
    const snap = await getDocs(query(projectsRef, where('userId', '==', user.uid)));
    const projects = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    projects.sort((a, b) => {
      const aTime = a?.createdAt?.seconds || 0;
      const bTime = b?.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    renderHistory(projects);
  } catch (error) {
    console.error(error);
    setStatus('Could not load history.', 'error');
  }
}

if (user) {
  await loadHistory();
}