import { db } from "./firebase-init.js";
import { protectPage, setupLogoutButton } from "./auth.js";
import { qs, qsa, showStatus, clearStatus, readFileAsDataURL } from "./common.js";
import { generateFromPrompt, convertAiProjectToBuilderFormat } from "./generator.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const user = await protectPage();
setupLogoutButton();

const status = qs('#builderStatus');
const promptBox = qs('#mainPrompt');
const generateBtn = qs('#generateBtn');
const generatingEl = qs('#generatingState');
const genMsg = qs('#genStatusMsg');
const uploadWrap = qs('#uploadWrap');
const uploadTrigger = qs('#uploadTrigger');
const uploadInput = qs('#uploadedImages');
const uploadCount = qs('#uploadCount');
const advPanel = qs('#advancedPanel');
const advToggle = qs('#toggleAdvancedBtn');
const customColor = qs('#customColor');
const questionPanel = qs('#questionFlowPanel');
const questionFields = qs('#questionFields');
const continueGenerateBtn = qs('#continueGenerateBtn');
const skipQuestionsBtn = qs('#skipQuestionsBtn');

let uploadedImages = [];
let pendingPrompt = '';
let pendingAnalysis = null;

qsa('.example-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    promptBox.value = chip.dataset.example;
    promptBox.focus();
  });
});

qsa('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const input = chip.querySelector('input');
    if (!input) return;
    if (input.type === 'checkbox') {
      input.checked = !input.checked;
      chip.classList.toggle('active', input.checked);
    } else {
      qsa(`input[name="${input.name}"]`).forEach(r => r.closest('.chip')?.classList.remove('active'));
      input.checked = true;
      chip.classList.add('active');
    }
    if (input.name === 'colorMode') {
      customColor.style.display = qs('input[name="colorMode"]:checked')?.value === 'custom' ? 'block' : 'none';
    }
    if (input.name === 'imageOption') {
      uploadWrap.classList.toggle('hidden', input.value !== 'upload');
    }
  });
});

advToggle?.addEventListener('click', () => {
  advPanel.classList.toggle('hidden');
  advToggle.textContent = advPanel.classList.contains('hidden') ? '⚙ Advanced options' : '⚙ Hide options';
});

uploadTrigger?.addEventListener('click', () => uploadInput?.click());
uploadInput?.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  uploadedImages = await Promise.all(files.map(readFileAsDataURL));
  uploadCount.textContent = `${uploadedImages.length} image${uploadedImages.length !== 1 ? 's' : ''} ready`;
});

const GEN_MSGS = [
  'Understanding your prompt…',
  'Detecting website type…',
  'Asking the right questions…',
  'Generating sections and content…',
  'Choosing images…',
  'Building your website…',
  'Polishing the final layout…',
];
let msgInterval = null;

function startGeneratingAnim() {
  generatingEl.classList.remove('hidden');
  generateBtn.disabled = true;
  continueGenerateBtn.disabled = true;
  let i = 0;
  genMsg.textContent = GEN_MSGS[0];
  msgInterval = setInterval(() => {
    i = (i + 1) % GEN_MSGS.length;
    genMsg.textContent = GEN_MSGS[i];
  }, 900);
}

function stopGeneratingAnim() {
  clearInterval(msgInterval);
  generatingEl.classList.add('hidden');
  generateBtn.disabled = false;
  continueGenerateBtn.disabled = false;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function buildOptions() {
  const imageSource = qs('input[name="imageOption"]:checked')?.value || 'pexels';
  const vibes = qsa('input[name="vibes"]:checked').map(i => i.value);
  const colorMode = qs('input[name="colorMode"]:checked')?.value || 'ai';
  return {
    imageSource,
    uploadedImages,
    vibes,
    colorMode,
    customColor: colorMode === 'custom' ? (customColor?.value || '#88b79a') : null,
  };
}

function renderQuestions(analysis) {
  const questions = analysis?.missingDetails || [];
  if (!questions.length) {
    questionPanel?.classList.add('hidden');
    return;
  }
  questionFields.innerHTML = questions.map((item, index) => `
    <label class="question-card">
      <span class="question-label">${item.label || `Question ${index + 1}`}</span>
      <input class="question-input" data-question-id="${item.id || `q${index}`}" type="text" placeholder="${item.placeholder || 'Type here'}">
    </label>
  `).join('');
  questionPanel?.classList.remove('hidden');
  questionPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function collectAnswers() {
  const answers = {};
  qsa('[data-question-id]', questionFields).forEach(input => {
    if (input.value.trim()) answers[input.dataset.questionId] = input.value.trim();
  });
  return answers;
}

async function generateWithSmartFlow({ skipQuestions = false } = {}) {
  const prompt = (pendingPrompt || promptBox?.value || '').trim();
  if (!prompt || prompt.length < 8) {
    showStatus(status, 'error', 'Please describe your website in at least a few words.');
    return;
  }

  clearStatus(status);
  pendingPrompt = prompt;
  const options = buildOptions();

  try {
    if (!pendingAnalysis && !skipQuestions) {
      startGeneratingAnim();
      const analysis = await fetchJson('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }).catch(() => null);
      stopGeneratingAnim();
      pendingAnalysis = analysis;
      if (analysis?.needsQuestions && (analysis.missingDetails || []).length) {
        renderQuestions(analysis);
        showStatus(status, 'info', 'I need a few details so your website looks more specific and premium.');
        return;
      }
    }

    startGeneratingAnim();
    const answers = skipQuestions ? {} : collectAnswers();
    const imageSource = options.imageSource;
    let content;

    try {
      const aiProject = await fetchJson('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt, answers }),
      });
      content = await convertAiProjectToBuilderFormat(aiProject, {
        ...options,
        prompt,
        answers,
        analysis: pendingAnalysis,
      });
    } catch (error) {
      const enrichedPrompt = [
        prompt,
        ...Object.values(answers).map(v => `Detail: ${v}`),
      ].join('. ');
      content = generateFromPrompt(enrichedPrompt, options);
    }

    const ref = await addDoc(collection(db, 'projects'), {
      title: content.title,
      type: content.type,
      prompt,
      pages: content.pages.map(p => ({ id: p.id, name: p.name, slug: p.slug })),
      contentJson: content,
      themeSettings: content.theme,
      description: prompt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userId: user.uid,
    });

    stopGeneratingAnim();
    location.href = `preview.html?id=${ref.id}`;
  } catch (error) {
    stopGeneratingAnim();
    showStatus(status, 'error', error.message || 'Could not generate website. Please try again.');
  }
}

generateBtn?.addEventListener('click', () => {
  pendingAnalysis = null;
  questionPanel?.classList.add('hidden');
  generateWithSmartFlow({ skipQuestions: false });
});
continueGenerateBtn?.addEventListener('click', () => generateWithSmartFlow({ skipQuestions: false }));
skipQuestionsBtn?.addEventListener('click', () => generateWithSmartFlow({ skipQuestions: true }));

promptBox?.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generateBtn?.click();
});
