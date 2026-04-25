import { db } from "./firebase-init.js";
import { protectPage, setupLogoutButton } from "./auth.js";
import { qs, qsa, showStatus, clearStatus, getQueryParam, readFileAsDataURL, downloadBlob, copyText } from "./common.js";
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { createBlankSection, createPlaceholderImage, getLayoutTheme } from "./generator.js";

await protectPage();
setupLogoutButton();

const projectId = getQueryParam('id');
const duplicateMode = getQueryParam('duplicate') === '1';
const pageTabs = qs('#pageTabs');
const previewFrame = qs('#previewFrame');
const status = qs('#previewStatus');
const addSectionBtn = qs('#addSectionBtn');
const saveBtn = qs('#saveProjectBtn');
const finalizeBtn = qs('#finalizeWebsiteBtn');
const modal = qs('#sectionModal');
const fileInput = qs('#hiddenImageUpload');
const projectTitleEl = qs('#previewProjectTitle');
const imagePromptInput = qs('#imagePromptInput');

let project = null;
let currentPageId = null;
let currentImageTarget = null;

if (projectId) {
  await loadProject();
  bindUi();
} else {
  showStatus(status, 'error', 'No project id found.');
}

async function loadProject() {
  const snap = await getDoc(doc(db, 'projects', projectId));
  if (!snap.exists()) {
    showStatus(status, 'error', 'Project not found.');
    return;
  }
  const data = snap.data();
  if (duplicateMode) {
    const ref = await addDoc(collection(db, 'projects'), { ...data, title: `${data.title} Copy`, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    location.href = `preview.html?id=${ref.id}`;
    return;
  }
  project = data.contentJson;
  project.theme = project.theme || {};
  project.theme.layoutVariant = project.theme.layoutVariant || getLayoutTheme(project);
  project.prompts = project.prompts || {};
  currentPageId = project.pages?.[0]?.id;
  projectTitleEl.textContent = data.title;
  applyTheme();
  renderTabs();
  renderPreview();
}

function bindUi() {
  qsa('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    qsa('[data-view]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    previewFrame.classList.toggle('mobile', btn.dataset.view === 'mobile');
  }));
  addSectionBtn?.addEventListener('click', () => modal.classList.add('show'));
  qsa('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => modal.classList.remove('show')));
  qs('#addTextSection')?.addEventListener('click', () => addSection('text'));
  qs('#addCardsSection')?.addEventListener('click', () => addSection('cards'));
  qs('#addGallerySection')?.addEventListener('click', () => addSection('gallery'));
  saveBtn?.addEventListener('click', saveProject);
  finalizeBtn?.addEventListener('click', finalizeWebsite);
  fileInput?.addEventListener('change', onImageUpload);
  qs('#copyDeploymentText')?.addEventListener('click', async () => {
    await copyText(qs('#deploymentHelpText').textContent.trim());
  });
}

function applyTheme() {
  if (!project?.theme) return;
  const r = document.documentElement.style;
  r.setProperty('--primary', project.theme.primary || '#88b79a');
  r.setProperty('--primaryDark', shadeHex(project.theme.primary || '#88b79a', -26));
  r.setProperty('--site-bg', project.theme.bg || '#f7f5f2');
  r.setProperty('--surface', project.theme.surface || '#fffdf8');
  r.setProperty('--accent', project.theme.accent || '#eef8ef');
  r.setProperty('--text', project.theme.text || '#23332d');
}

function getCurrentPage() {
  return project.pages.find(p => p.id === currentPageId) || project.pages[0];
}

function renderTabs() {
  pageTabs.innerHTML = project.pages.map(page => `
    <button class="page-tab ${page.id === currentPageId ? 'active' : ''}" data-page-id="${page.id}">${escapeHtml(page.name)}</button>
  `).join('');
  qsa('[data-page-id]', pageTabs).forEach(btn => btn.addEventListener('click', () => {
    currentPageId = btn.dataset.pageId;
    renderTabs();
    renderPreview();
  }));
}

function renderPreview() {
  const page = getCurrentPage();
  if (!page) return;
  const layout = project.theme.layoutVariant || 'signature';
  previewFrame.innerHTML = `
    <div class="lux-site layout-${layout}">
      <div class="lux-bg-orb orb-a"></div>
      <div class="lux-bg-orb orb-b"></div>
      <header class="site-header">
        <div class="brand-line">
          <div class="brand-badge soft-glow">✦</div>
          <div>
            <strong contenteditable="true" class="contenteditable" data-project-title>${escapeHtml(project.title)}</strong>
            <div class="muted" style="font-size:.86rem">${escapeHtml(project.type)} • ${escapeHtml(layout)}</div>
          </div>
        </div>
        <nav class="site-nav">${project.pages.map(p => `<a class="nav-pill ${p.id === currentPageId ? 'current' : ''}" data-go-page="${p.id}">${escapeHtml(p.name)}</a>`).join('')}</nav>
      </header>
      <div class="lux-progress"><span style="width:${Math.max(20, Math.min(100, page.sections.length * 14))}%"></span></div>
      <main class="lux-main"></main>
    </div>
  `;

  const main = qs('.lux-main', previewFrame);
  page.sections.forEach((section, index) => {
    const shell = document.createElement('section');
    shell.className = `site-section section-animate type-${section.type} variant-${section.variant || 'default'}`;
    shell.dataset.sectionId = section.id;
    shell.innerHTML = sectionChrome(section, index) + renderSectionContent(section, layout, index);
    main.appendChild(shell);
    bindSectionEvents(shell, section);
  });

  qsa('[data-project-title]', previewFrame).forEach(el => el.addEventListener('input', () => {
    project.title = el.textContent.trim() || 'Untitled Project';
    projectTitleEl.textContent = project.title;
  }));

  qsa('[data-go-page]', previewFrame).forEach(link => link.addEventListener('click', () => {
    currentPageId = link.dataset.goPage;
    renderTabs();
    renderPreview();
  }));
}

function sectionChrome(section, index) {
  return `
    <div class="section-toolbar glassy">
      <span class="badge">${index + 1}</span>
      <button class="ghost small" data-up>↑</button>
      <button class="ghost small" data-down>↓</button>
      <button class="ghost small" data-duplicate>Copy</button>
      <button class="danger small" data-delete>Delete</button>
    </div>
  `;
}

function renderSectionContent(section, layout, index) {
  const accent = section.variant || pickVariant(section.type, layout, index);
  section.variant = accent;
  switch (section.type) {
    case 'hero':
      return renderHero(section, layout);
    case 'features':
      return renderFeatures(section);
    case 'cards':
      return renderCards(section);
    case 'products':
      return renderProducts(section, layout);
    case 'gallery':
      return renderGallery(section, layout);
    case 'testimonials':
      return renderTestimonials(section);
    case 'about':
      return renderAbout(section, layout);
    case 'contact':
      return renderContact(section);
    default:
      return renderText(section);
  }
}

function renderHero(section, layout) {
  const heroClass = `hero hero-${section.variant || pickVariant('hero', layout, 0)}`;
  return `
    <div class="${heroClass}">
      <div class="hero-copy premium-copy">
        <div class="eyebrow">Luxury web experience</div>
        <h1 contenteditable="true" class="contenteditable" data-field="title">${escapeHtml(section.title || project.title)}</h1>
        <p contenteditable="true" class="contenteditable hero-tagline" data-field="tagline">${escapeHtml(section.tagline || 'Make a striking first impression.')}</p>
        <p contenteditable="true" class="contenteditable hero-body" data-field="text">${escapeHtml(section.text || 'Edit this section to match your vision.')}</p>
        <div class="button-row">
          <button class="lux-btn" contenteditable="true" data-field="buttonText">${escapeHtml(section.buttonText || 'Get started')}</button>
          <button class="lux-btn secondary" contenteditable="true" data-field="secondaryButtonText">${escapeHtml(section.secondaryButtonText || 'Explore more')}</button>
        </div>
      </div>
      <div class="hero-visual image-edit editorial-frame">
        <img src="${section.image || createPlaceholderImage(project.title, section.title || '')}" alt="Hero image" data-image-field="image">
        <div class="floating-stat glassy">
          <strong>${escapeHtml(project.type)}</strong>
          <span>${escapeHtml(project.theme.layoutVariant || 'signature layout')}</span>
        </div>
        <div class="image-overlay">
          <button class="secondary small" data-replace-image>Replace</button>
          <button class="secondary small" data-regenerate-image>Regenerate</button>
        </div>
      </div>
    </div>
  `;
}

function renderFeatures(section) {
  const items = section.items || [];
  return `
    <div class="stack-head">
      <div>
        <div class="eyebrow">Why it stands out</div>
        <h2 contenteditable="true" class="contenteditable" data-field="heading">${escapeHtml(section.heading || 'Highlights')}</h2>
      </div>
      <p class="muted">Designed to feel polished, premium, and easy to scan.</p>
    </div>
    <div class="feature-list luxe-grid">
      ${items.map((item, i) => `
        <article class="info-tile feature-tile glassy lift-card">
          <div class="feature-icon">${escapeHtml(item.icon || '✦')}</div>
          <strong contenteditable="true" class="contenteditable" data-item-title="${i}">${escapeHtml(item.title || `Feature ${i + 1}`)}</strong>
          <p contenteditable="true" class="contenteditable" data-item-text="${i}">${escapeHtml(item.text || 'Explain the benefit here.')}</p>
        </article>
      `).join('')}
      <article class="info-tile feature-tile add-tile"><button class="ghost" data-add-card>+ Add feature</button></article>
    </div>
  `;
}

function renderCards(section) {
  const cards = section.cards || [];
  return `
    <div class="stack-head">
      <h2 contenteditable="true" class="contenteditable" data-field="heading">${escapeHtml(section.heading || 'Curated highlights')}</h2>
      <p class="muted">Use this block for services, promises, or story cards.</p>
    </div>
    <div class="feature-list luxe-grid">
      ${cards.map((card, i) => `
        <article class="info-tile lift-card soft-graphic">
          <strong contenteditable="true" class="contenteditable" data-card-title="${i}">${escapeHtml(card.title || `Card ${i + 1}`)}</strong>
          <p contenteditable="true" class="contenteditable" data-card-text="${i}">${escapeHtml(card.text || 'Add some detail here.')}</p>
          <button class="ghost small" data-remove-card="${i}">Remove</button>
        </article>
      `).join('')}
      <article class="info-tile add-tile"><button class="ghost" data-add-card>+ Add card</button></article>
    </div>
  `;
}

function renderProducts(section, layout) {
  const products = section.products || [];
  return `
    <div class="stack-head">
      <div>
        <div class="eyebrow">Shop / menu</div>
        <h2 contenteditable="true" class="contenteditable" data-field="heading">${escapeHtml(section.heading || 'Featured products')}</h2>
      </div>
      <button class="ghost small" data-add-product>+ Add product</button>
    </div>
    <div class="products-grid layout-${layout}">
      ${products.map((prod, i) => `
        <article class="product-card lift-card">
          <div class="product-img-wrap image-edit">
            <img src="${prod.image || createPlaceholderImage(prod.name || 'Product', prod.desc || '')}" alt="${escapeHtml(prod.name || 'Product')}" data-prod-image="${i}">
            <div class="image-overlay">
              <button class="secondary small" data-replace-product-img="${i}">Replace</button>
              <button class="secondary small" data-regenerate-product-img="${i}">Regenerate</button>
            </div>
          </div>
          <div class="product-info">
            <strong contenteditable="true" class="contenteditable" data-prod-name="${i}">${escapeHtml(prod.name || `Product ${i + 1}`)}</strong>
            <span class="product-price" contenteditable="true" data-prod-price="${i}">${escapeHtml(prod.price || '₹0')}</span>
            <p contenteditable="true" class="contenteditable" data-prod-desc="${i}">${escapeHtml(prod.desc || 'Product description.')}</p>
            <div class="button-row compact">
              <button class="lux-btn small">Add to cart</button>
              <button class="ghost small" data-remove-product="${i}">Remove</button>
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderGallery(section, layout) {
  const images = section.images || [];
  return `
    <div class="stack-head">
      <div>
        <div class="eyebrow">Visual story</div>
        <h2 contenteditable="true" class="contenteditable" data-field="heading">${escapeHtml(section.heading || 'Gallery')}</h2>
      </div>
      <button class="ghost small" data-add-image>+ Add image</button>
    </div>
    <div class="gallery-grid gallery-${layout}">
      ${images.map((src, i) => `
        <div class="image-edit editorial-frame ${i % 3 === 0 ? 'tall' : ''}">
          <img src="${src}" alt="Gallery image ${i + 1}">
          <div class="image-overlay">
            <button class="secondary small" data-replace-gallery="${i}">Replace</button>
            <button class="secondary small" data-regenerate-gallery="${i}">Regenerate</button>
            <button class="danger small" data-remove-gallery="${i}">Remove</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTestimonials(section) {
  const items = section.items || [];
  return `
    <div class="stack-head">
      <h2 contenteditable="true" class="contenteditable" data-field="heading">${escapeHtml(section.heading || 'Kind words')}</h2>
      <div class="eyebrow">Social proof</div>
    </div>
    <div class="testimonials-grid">
      ${items.map((item, i) => `
        <article class="testimonial-card lift-card glassy">
          <div class="stars">${'★'.repeat(item.stars || 5)}</div>
          <p contenteditable="true" class="contenteditable" data-test-text="${i}">“${escapeHtml(item.text || 'Review text.') }”</p>
          <strong contenteditable="true" class="contenteditable" data-test-name="${i}">— ${escapeHtml(item.name || `Customer ${i + 1}`)}</strong>
        </article>
      `).join('')}
    </div>
  `;
}

function renderAbout(section, layout) {
  return `
    <div class="about-layout about-${layout}">
      <div class="premium-copy">
        <div class="eyebrow">About the brand</div>
        <h2 contenteditable="true" class="contenteditable" data-field="heading">${escapeHtml(section.heading || 'Our story')}</h2>
        <p contenteditable="true" class="contenteditable" data-field="body">${escapeHtml(section.body || 'Tell your story here.')}</p>
      </div>
      <div class="image-edit editorial-frame">
        <img src="${section.image || createPlaceholderImage(project.title, 'About image')}" alt="About image" data-image-field="image">
        <div class="image-overlay">
          <button class="secondary small" data-replace-image>Replace</button>
          <button class="secondary small" data-regenerate-image>Regenerate</button>
        </div>
      </div>
    </div>
  `;
}

function renderContact(section) {
  return `
    <div class="contact-grid">
      <div class="info-tile glassy">
        <div class="eyebrow">Get in touch</div>
        <h2 contenteditable="true" class="contenteditable" data-field="heading">${escapeHtml(section.heading || 'Contact')}</h2>
        <div class="contact-row"><span class="contact-icon">📧</span><p contenteditable="true" class="contenteditable" data-field="email">${escapeHtml(section.email || 'hello@example.com')}</p></div>
        <div class="contact-row"><span class="contact-icon">📞</span><p contenteditable="true" class="contenteditable" data-field="phone">${escapeHtml(section.phone || '+91 90000 00000')}</p></div>
        <div class="contact-row"><span class="contact-icon">📍</span><p contenteditable="true" class="contenteditable" data-field="address">${escapeHtml(section.address || 'Your city, India')}</p></div>
      </div>
      <div class="info-tile soft-graphic">
        <p contenteditable="true" class="contenteditable" data-field="body">${escapeHtml(section.body || 'Invite visitors to reach out or place an order.')}</p>
        <div class="form-stack">
          <input placeholder="Your name">
          <input placeholder="Your email">
          <textarea placeholder="Message"></textarea>
          <button class="lux-btn">Send message</button>
        </div>
      </div>
    </div>
  `;
}

function renderText(section) {
  return `
    <div class="premium-copy narrow">
      <div class="eyebrow">Custom section</div>
      <h2 contenteditable="true" class="contenteditable" data-field="heading">${escapeHtml(section.heading || 'Section title')}</h2>
      <p contenteditable="true" class="contenteditable" data-field="body">${escapeHtml(section.body || 'Write a refined section description here.')}</p>
    </div>
  `;
}

function bindSectionEvents(el, section) {
  qsa('[data-field]', el).forEach(node => node.addEventListener('input', () => {
    section[node.dataset.field] = node.textContent.trim();
  }));
  qsa('[data-up]', el).forEach(btn => btn.addEventListener('click', () => moveSection(section.id, -1)));
  qsa('[data-down]', el).forEach(btn => btn.addEventListener('click', () => moveSection(section.id, 1)));
  qsa('[data-delete]', el).forEach(btn => btn.addEventListener('click', () => deleteSection(section.id)));
  qsa('[data-duplicate]', el).forEach(btn => btn.addEventListener('click', () => duplicateSection(section.id)));

  qsa('[data-replace-image]', el).forEach(btn => btn.addEventListener('click', () => { currentImageTarget = { sectionId: section.id, field: 'image', kind: 'single' }; fileInput.click(); }));
  qsa('[data-regenerate-image]', el).forEach(btn => btn.addEventListener('click', () => regenerateImage({ sectionId: section.id, field: 'image', kind: 'single' })));

  qsa('[data-item-title]', el).forEach(node => node.addEventListener('input', () => { section.items[+node.dataset.itemTitle].title = node.textContent.trim(); }));
  qsa('[data-item-text]', el).forEach(node => node.addEventListener('input', () => { section.items[+node.dataset.itemText].text = node.textContent.trim(); }));
  qsa('[data-card-title]', el).forEach(node => node.addEventListener('input', () => { section.cards[+node.dataset.cardTitle].title = node.textContent.trim(); }));
  qsa('[data-card-text]', el).forEach(node => node.addEventListener('input', () => { section.cards[+node.dataset.cardText].text = node.textContent.trim(); }));
  qsa('[data-remove-card]', el).forEach(btn => btn.addEventListener('click', () => { section.cards.splice(+btn.dataset.removeCard, 1); renderPreview(); }));
  qsa('[data-add-card]', el).forEach(btn => btn.addEventListener('click', () => {
    const key = section.items ? 'items' : 'cards';
    section[key] = section[key] || [];
    section[key].push({ title: 'New item', text: 'Add a short description.' });
    renderPreview();
  }));

  qsa('[data-prod-name]', el).forEach(node => node.addEventListener('input', () => { section.products[+node.dataset.prodName].name = node.textContent.trim(); }));
  qsa('[data-prod-price]', el).forEach(node => node.addEventListener('input', () => { section.products[+node.dataset.prodPrice].price = node.textContent.trim(); }));
  qsa('[data-prod-desc]', el).forEach(node => node.addEventListener('input', () => { section.products[+node.dataset.prodDesc].desc = node.textContent.trim(); }));
  qsa('[data-remove-product]', el).forEach(btn => btn.addEventListener('click', () => { section.products.splice(+btn.dataset.removeProduct, 1); renderPreview(); }));
  qsa('[data-add-product]', el).forEach(btn => btn.addEventListener('click', () => {
    section.products.push({ name: 'New product', price: '₹0', desc: 'Describe this item.', image: createPlaceholderImage('Product', 'Luxury product shot') });
    renderPreview();
  }));
  qsa('[data-replace-product-img]', el).forEach(btn => btn.addEventListener('click', () => { currentImageTarget = { sectionId: section.id, index: +btn.dataset.replaceProductImg, kind: 'product' }; fileInput.click(); }));
  qsa('[data-regenerate-product-img]', el).forEach(btn => btn.addEventListener('click', () => regenerateImage({ sectionId: section.id, index: +btn.dataset.regenerateProductImg, kind: 'product' })));

  qsa('[data-replace-gallery]', el).forEach(btn => btn.addEventListener('click', () => { currentImageTarget = { sectionId: section.id, index: +btn.dataset.replaceGallery, kind: 'gallery' }; fileInput.click(); }));
  qsa('[data-regenerate-gallery]', el).forEach(btn => btn.addEventListener('click', () => regenerateImage({ sectionId: section.id, index: +btn.dataset.regenerateGallery, kind: 'gallery' })));
  qsa('[data-remove-gallery]', el).forEach(btn => btn.addEventListener('click', () => { section.images.splice(+btn.dataset.removeGallery, 1); renderPreview(); }));
  qsa('[data-add-image]', el).forEach(btn => btn.addEventListener('click', () => {
    section.images.push(createPlaceholderImage(project.title, 'Editorial gallery image'));
    renderPreview();
  }));

  qsa('[data-test-text]', el).forEach(node => node.addEventListener('input', () => { section.items[+node.dataset.testText].text = node.textContent.trim().replace(/^“|”$/g, ''); }));
  qsa('[data-test-name]', el).forEach(node => node.addEventListener('input', () => { section.items[+node.dataset.testName].name = node.textContent.trim().replace(/^—\s*/, ''); }));
}

function addSection(kind) {
  const page = getCurrentPage();
  page.sections.push(createBlankSection(kind));
  modal.classList.remove('show');
  renderPreview();
}

function moveSection(id, delta) {
  const page = getCurrentPage();
  const index = page.sections.findIndex(s => s.id === id);
  const next = index + delta;
  if (index < 0 || next < 0 || next >= page.sections.length) return;
  [page.sections[index], page.sections[next]] = [page.sections[next], page.sections[index]];
  renderPreview();
}

function deleteSection(id) {
  const page = getCurrentPage();
  page.sections = page.sections.filter(s => s.id !== id);
  renderPreview();
}

function duplicateSection(id) {
  const page = getCurrentPage();
  const index = page.sections.findIndex(s => s.id === id);
  if (index < 0) return;
  const clone = JSON.parse(JSON.stringify(page.sections[index]));
  clone.id = `${clone.id}-copy-${Date.now()}`;
  page.sections.splice(index + 1, 0, clone);
  renderPreview();
}

async function onImageUpload(e) {
  const file = e.target.files?.[0];
  if (!file || !currentImageTarget) return;
  const dataUrl = await readFileAsDataURL(file);
  applyImageResult(dataUrl, currentImageTarget);
  fileInput.value = '';
}

async function regenerateImage(target) {
  clearStatus(status);
  const page = getCurrentPage();
  const section = page.sections.find(s => s.id === target.sectionId);
  if (!section) return;
  const custom = imagePromptInput?.value.trim();
  const query = custom || buildImageQuery(section, target) || `${project.title} ${project.type} luxury editorial`;
  try {
    const seed = `${Date.now()}-${Math.random()}`;
    const res = await fetch(`/api/images?q=${encodeURIComponent(query)}&count=10&seed=${encodeURIComponent(seed)}`);
    const data = await res.json();
    const images = Array.isArray(data.images) ? data.images : [];
    const pick = images[Math.floor(Math.random() * images.length)]?.original || images[0]?.original;
    if (!pick) throw new Error('No image available from API');
    applyImageResult(pick, target);
    showStatus(status, 'success', 'Image regenerated with a new visual direction.');
  } catch (error) {
    const fallback = createPlaceholderImage(project.title, query);
    applyImageResult(fallback, target);
    showStatus(status, 'info', 'Used a local fallback image because the image API did not return a result.');
  }
}

function applyImageResult(src, target = currentImageTarget) {
  const page = getCurrentPage();
  const section = page.sections.find(s => s.id === target.sectionId);
  if (!section) return;
  if (target.kind === 'gallery') section.images[target.index] = src;
  else if (target.kind === 'product') section.products[target.index].image = src;
  else section[target.field] = src;
  renderPreview();
}

async function saveProject() {
  clearStatus(status);
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      title: project.title,
      pages: project.pages.map(p => ({ id: p.id, name: p.name, slug: p.slug })),
      contentJson: project,
      themeSettings: project.theme,
      updatedAt: serverTimestamp(),
    });
    showStatus(status, 'success', 'Project saved successfully.');
  } catch (error) {
    showStatus(status, 'error', error.message || 'Save failed.');
  }
}

async function finalizeWebsite() {
  clearStatus(status);
  try {
    await saveProject();
    const zip = new JSZip();
    const normalized = JSON.parse(JSON.stringify(project));
    let assetIndex = 1;

    zip.file('README.md', buildReadme(normalized));
    zip.file('HOSTING-INSTRUCTIONS.md', buildHosting(normalized));
    zip.file('content/site-data.json', JSON.stringify(normalized, null, 2));
    zip.file('assets/css/styles.css', buildExportCss(normalized));
    zip.file('assets/js/site.js', buildExportJs(normalized));

    for (const page of normalized.pages) {
      for (const section of page.sections) {
        if (section.logo) section.logo = saveAsset(zip, section.logo, `logo-${assetIndex++}`);
        if (section.image) section.image = saveAsset(zip, section.image, `image-${assetIndex++}`);
        if (Array.isArray(section.images)) section.images = section.images.map(src => saveAsset(zip, src, `gallery-${assetIndex++}`));
        if (Array.isArray(section.products)) {
          section.products = section.products.map(prod => ({
            ...prod,
            image: prod.image ? saveAsset(zip, prod.image, `product-${assetIndex++}`) : prod.image,
          }));
        }
      }
    }

    normalized.pages.forEach(page => {
      const filename = page.slug === 'index' ? 'index.html' : `${page.slug}.html`;
      zip.file(filename, buildPageHtml(normalized, page));
    });

    if (['ecommerce', 'bakery', 'restaurant'].includes(normalized.type)) {
      zip.file('admin.html', buildAdminHtml(normalized));
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `${slugify(normalized.title)}-premium-v2.zip`);
    showStatus(status, 'success', 'Premium website ZIP created successfully.');
  } catch (error) {
    showStatus(status, 'error', error.message || 'Could not create ZIP.');
  }
}

function saveAsset(zip, src, name) {
  if (!src) return "assets/images/placeholder.jpg";

  if (typeof src !== "string") {
    console.warn("Invalid image source:", src);
    return "assets/images/placeholder.jpg";
  }

  if (src.startsWith("data:image/svg+xml")) {
    try {
      const text = decodeURIComponent(src.split(",")[1] || "");
      const file = `assets/images/${name}.svg`;
      zip.file(file, text);
      return file;
    } catch (error) {
      console.error("SVG decode failed:", error);
      return "assets/images/placeholder.jpg";
    }
  }

  if (src.startsWith("data:image/")) {
    try {
      const [header, data] = src.split(",");
      const ext = header.includes("png")
        ? "png"
        : header.includes("jpeg") || header.includes("jpg")
        ? "jpg"
        : "png";

      const file = `assets/images/${name}.${ext}`;
      zip.file(file, data, { base64: true });
      return file;
    } catch (error) {
      console.error("Base64 image processing failed:", error);
      return "assets/images/placeholder.jpg";
    }
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  if (src.startsWith("assets/")) {
    return src;
  }

  console.warn("Unknown image format:", src);
  return "assets/images/placeholder.jpg";
}

function buildExportCss(site) {
  const palette = site.theme || {};
  return `:root{--primary:${palette.primary || '#88b79a'};--primary-dark:${shadeHex(palette.primary || '#88b79a',-28)};--bg:${palette.bg || '#f7f5f2'};--surface:${palette.surface || '#fffdf8'};--accent:${palette.accent || '#eef8ef'};--text:${palette.text || '#23332d'};--shadow:0 24px 80px rgba(35,51,45,.12);--radius:28px}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Inter,Arial,sans-serif;background:radial-gradient(circle at 10% 10%,color-mix(in srgb,var(--primary) 16%, white),transparent 24%),radial-gradient(circle at 90% 20%,color-mix(in srgb,var(--accent) 78%, white),transparent 28%),linear-gradient(180deg,#fcfcfb,var(--bg));color:var(--text)}a{text-decoration:none;color:inherit}img{max-width:100%;display:block}.shell{position:relative;overflow:hidden}.orb{position:absolute;border-radius:50%;filter:blur(10px);opacity:.6;pointer-events:none}.orb.a{width:280px;height:280px;top:-80px;left:-80px;background:color-mix(in srgb,var(--primary) 30%, white)}.orb.b{width:380px;height:380px;top:12%;right:-120px;background:color-mix(in srgb,var(--accent) 90%, white)}.container{width:min(1180px,calc(100vw - 28px));margin:0 auto}.header{position:sticky;top:0;z-index:30;background:rgba(255,253,248,.72);backdrop-filter:blur(22px);border-bottom:1px solid rgba(35,51,45,.08)}.nav{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 0;flex-wrap:wrap}.brand{display:flex;align-items:center;gap:14px;font-weight:800;letter-spacing:-.03em}.brand-mark{width:42px;height:42px;border-radius:16px;background:linear-gradient(145deg,var(--primary),var(--primary-dark));color:#fff;display:grid;place-items:center;box-shadow:var(--shadow)}.nav-links{display:flex;gap:10px;flex-wrap:wrap}.nav-pill{padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.74);border:1px solid rgba(35,51,45,.06)}.nav-pill:hover,.nav-pill.current{background:rgba(255,255,255,.96)}.section{position:relative;padding:84px 0;border-bottom:1px solid rgba(35,51,45,.06);animation:rise .7s ease both}.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:999px;background:rgba(255,255,255,.7);border:1px solid rgba(35,51,45,.06);font-size:.85rem;font-weight:700;margin-bottom:18px}.hero{display:grid;grid-template-columns:1.04fr .96fr;gap:28px;align-items:center;min-height:72vh}.hero-storybook{grid-template-columns:.95fr 1.05fr}.hero-showcase{grid-template-columns:1fr}.hero-immersive .hero-visual img{height:560px}.hero-copy h1{font-size:clamp(3rem,7vw,6rem);line-height:.92;letter-spacing:-.08em;margin:0 0 12px}.hero-tag{font-size:1.1rem;font-weight:700;opacity:.84}.hero-copy p{line-height:1.8;color:rgba(35,51,45,.78)}.button-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.btn{padding:14px 20px;border-radius:999px;border:0;cursor:pointer;background:linear-gradient(145deg,var(--primary),var(--primary-dark));color:#fff;box-shadow:0 20px 42px color-mix(in srgb,var(--primary) 36%, transparent);transition:transform .22s ease,box-shadow .22s ease}.btn:hover{transform:translateY(-3px);box-shadow:0 24px 46px color-mix(in srgb,var(--primary) 42%, transparent)}.btn.secondary{background:rgba(255,255,255,.88);color:var(--text);border:1px solid rgba(35,51,45,.08);box-shadow:none}.visual-card,.card,.product-card,.testimonial,.admin-card{background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(250,252,250,.92));border:1px solid rgba(35,51,45,.08);border-radius:var(--radius);box-shadow:var(--shadow)}.visual-card{padding:14px}.visual-card img{width:100%;height:100%;min-height:420px;object-fit:cover;border-radius:22px}.visual-card.tall img{min-height:520px}.floating-chip{position:absolute;right:18px;bottom:18px;padding:12px 14px;border-radius:20px;background:rgba(255,255,255,.8);backdrop-filter:blur(14px);border:1px solid rgba(35,51,45,.08)}.grid{display:grid;gap:20px}.cards{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.card{padding:24px;transition:transform .22s ease}.card:hover,.product-card:hover,.testimonial:hover{transform:translateY(-6px)}.products{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px}.product-card{overflow:hidden}.product-card img{width:100%;height:220px;object-fit:cover}.product-body{padding:18px}.price{display:inline-flex;padding:5px 10px;border-radius:999px;background:color-mix(in srgb,var(--accent) 86%, white);font-weight:800;color:var(--primary-dark);margin:10px 0}.gallery{display:grid;grid-template-columns:repeat(12,1fr);gap:18px}.gallery-item{grid-column:span 4;border-radius:26px;overflow:hidden;box-shadow:var(--shadow)}.gallery-item.tall{grid-row:span 2}.gallery-item img{width:100%;height:100%;min-height:220px;object-fit:cover}.about{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center}.contact{display:grid;grid-template-columns:1fr 1fr;gap:20px}.form-stack{display:grid;gap:12px}.form-stack input,.form-stack textarea{width:100%;padding:14px 16px;border-radius:18px;border:1px solid rgba(35,51,45,.1);background:#fff;font:inherit}.testimonials{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}.testimonial{padding:22px}.stars{color:#f0a500}.footer{padding:34px 0;text-align:center;color:rgba(35,51,45,.68)}.admin-shell{padding:42px 0}.admin-grid{display:grid;grid-template-columns:280px 1fr;gap:20px}.admin-list{display:grid;gap:12px}.admin-stat{padding:18px}.table{width:100%;border-collapse:collapse}.table th,.table td{padding:12px 10px;border-bottom:1px solid rgba(35,51,45,.08);text-align:left}@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@media(max-width:980px){.hero,.about,.contact,.admin-grid{grid-template-columns:1fr}.gallery{grid-template-columns:repeat(2,1fr)}.gallery-item{grid-column:span 1}}@media(max-width:640px){.hero-copy h1{font-size:clamp(2.5rem,12vw,4rem)}.container{width:min(1180px,calc(100vw - 20px))}.section{padding:68px 0}}`;
}

function buildPageHtml(site, page) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${escapeHtml(page.name === 'Home' ? site.title : `${page.name} | ${site.title}`)}</title><link rel="stylesheet" href="assets/css/styles.css"></head><body><div class="shell"><div class="orb a"></div><div class="orb b"></div><header class="header"><div class="container nav"><a class="brand" href="index.html"><div class="brand-mark">✦</div><span>${escapeHtml(site.title)}</span></a><nav class="nav-links">${site.pages.map(p => `<a class="nav-pill ${p.slug === page.slug ? 'current' : ''}" href="${p.slug === 'index' ? 'index.html' : `${p.slug}.html`} ">${escapeHtml(p.name)}</a>`).join('')}${['ecommerce','bakery','restaurant'].includes(site.type) ? '<a class="nav-pill" href="admin.html">Admin</a>' : ''}</nav></div></header><main class="container">${page.sections.map((section, index) => renderExportSection(site, section, index)).join('')}</main><footer class="footer container"><p>Built with SparkBuild Premium v2 ✦</p></footer></div><script src="assets/js/site.js"></script></body></html>`;
}

function renderExportSection(site, section, index) {
  const variant = section.variant || pickVariant(section.type, site.theme.layoutVariant || 'signature', index);
  if (section.type === 'hero') return `<section class="section hero hero-${variant}"><div class="hero-copy"><div class="eyebrow">Luxury digital presence</div><h1>${escapeHtml(section.title || site.title)}</h1><p class="hero-tag">${escapeHtml(section.tagline || '')}</p><p>${escapeHtml(section.text || '')}</p><div class="button-row"><a class="btn" href="#contact">${escapeHtml(section.buttonText || 'Get started')}</a><a class="btn secondary" href="#about">${escapeHtml(section.secondaryButtonText || 'Explore')}</a></div></div><div class="visual-card"><img src="${section.image || ''}" alt="${escapeHtml(section.title || site.title)}"><div class="floating-chip"><strong>${escapeHtml(site.type)}</strong><div>${escapeHtml(site.theme.layoutVariant || 'signature')} layout</div></div></div></section>`;
  if (section.type === 'features') return `<section class="section"><div class="eyebrow">Highlights</div><h2>${escapeHtml(section.heading || 'Highlights')}</h2><div class="grid cards">${(section.items || []).map(item => `<article class="card"><div style="font-size:1.7rem;margin-bottom:8px">${escapeHtml(item.icon || '✦')}</div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></article>`).join('')}</div></section>`;
  if (section.type === 'cards') return `<section class="section"><div class="eyebrow">Curated details</div><h2>${escapeHtml(section.heading || 'Highlights')}</h2><div class="grid cards">${(section.cards || []).map(card => `<article class="card"><strong>${escapeHtml(card.title)}</strong><p>${escapeHtml(card.text)}</p></article>`).join('')}</div></section>`;
  if (section.type === 'products') return `<section class="section"><div class="eyebrow">Shop / menu</div><h2>${escapeHtml(section.heading || 'Products')}</h2><div class="products">${(section.products || []).map(prod => `<article class="product-card"><img src="${prod.image || ''}" alt="${escapeHtml(prod.name || 'Product')}"><div class="product-body"><strong>${escapeHtml(prod.name)}</strong><div class="price">${escapeHtml(prod.price || '')}</div><p>${escapeHtml(prod.desc || '')}</p><div class="button-row"><button class="btn" data-add-cart='${escapeAttribute(JSON.stringify({ name: prod.name, price: prod.price }))}'>Add to cart</button></div></div></article>`).join('')}</div></section>`;
  if (section.type === 'gallery') return `<section class="section"><div class="eyebrow">Gallery</div><h2>${escapeHtml(section.heading || 'Gallery')}</h2><div class="gallery">${(section.images || []).map((src, i) => `<div class="gallery-item ${i % 3 === 0 ? 'tall' : ''}"><img src="${src}" alt="Gallery image"></div>`).join('')}</div></section>`;
  if (section.type === 'testimonials') return `<section class="section"><div class="eyebrow">Loved by people</div><h2>${escapeHtml(section.heading || 'Testimonials')}</h2><div class="testimonials">${(section.items || []).map(item => `<article class="testimonial"><div class="stars">${'★'.repeat(item.stars || 5)}</div><p>“${escapeHtml(item.text || '')}”</p><strong>— ${escapeHtml(item.name || '')}</strong></article>`).join('')}</div></section>`;
  if (section.type === 'about') return `<section class="section about" id="about"><div><div class="eyebrow">About</div><h2>${escapeHtml(section.heading || 'Our story')}</h2><p>${escapeHtml(section.body || '')}</p></div><div class="visual-card"><img src="${section.image || ''}" alt="About image"></div></section>`;
  if (section.type === 'contact') return `<section class="section" id="contact"><div class="eyebrow">Contact</div><h2>${escapeHtml(section.heading || 'Contact')}</h2><div class="contact"><div class="card"><p>📧 ${escapeHtml(section.email || '')}</p><p>📞 ${escapeHtml(section.phone || '')}</p><p>📍 ${escapeHtml(section.address || '')}</p></div><div class="card"><p>${escapeHtml(section.body || '')}</p><div class="form-stack"><input placeholder="Your name"><input placeholder="Your email"><textarea placeholder="Your message"></textarea><button class="btn">Send message</button></div></div></div></section>`;
  return `<section class="section"><div class="eyebrow">Section</div><h2>${escapeHtml(section.heading || 'Section')}</h2><p>${escapeHtml(section.body || '')}</p></section>`;
}

function buildAdminHtml(site) {
  const products = collectProducts(site);
  const tableRows = products.map((prod, i) => `<tr><td>#${i + 1}</td><td>${escapeHtml(prod.name || 'Product')}</td><td>${escapeHtml(prod.price || '')}</td><td>${escapeHtml(prod.desc || '')}</td></tr>`).join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Admin | ${escapeHtml(site.title)}</title><link rel="stylesheet" href="assets/css/styles.css"></head><body><div class="shell"><div class="orb a"></div><div class="orb b"></div><header class="header"><div class="container nav"><a class="brand" href="index.html"><div class="brand-mark">✦</div><span>${escapeHtml(site.title)} Admin</span></a><nav class="nav-links"><a class="nav-pill" href="index.html">View site</a><a class="nav-pill current" href="admin.html">Admin</a></nav></div></header><main class="container admin-shell"><section class="section" style="padding-top:36px"><div class="eyebrow">Real-life style management</div><h1 style="font-size:clamp(2.3rem,5vw,4rem);letter-spacing:-.06em;margin:0 0 14px">Store dashboard</h1><p>Use this built-in admin page to manage inventory, glance at orders, and make the site feel like a complete real product.</p><div class="admin-grid" style="margin-top:28px"><aside class="admin-list"><article class="admin-card admin-stat"><strong>Today's orders</strong><div style="font-size:2rem;font-weight:800;margin-top:8px">18</div><p>Demo data stored locally in the browser.</p></article><article class="admin-card admin-stat"><strong>Total revenue</strong><div style="font-size:2rem;font-weight:800;margin-top:8px">₹24,860</div><p>Snapshot of mock analytics for the exported static site.</p></article><article class="admin-card admin-stat"><strong>Active products</strong><div style="font-size:2rem;font-weight:800;margin-top:8px">${products.length}</div><p>Based on the products generated in your website.</p></article></aside><section class="admin-card" style="padding:24px"><h2 style="margin-top:0">Inventory</h2><table class="table"><thead><tr><th>ID</th><th>Product</th><th>Price</th><th>Description</th></tr></thead><tbody>${tableRows}</tbody></table></section></div></section></main><footer class="footer container"><p>Admin panel included by SparkBuild Premium v2 ✦</p></footer></div><script src="assets/js/site.js"></script></body></html>`;
}

function buildExportJs(site) {
  return `(() => {
  const cartKey = 'sparkbuild-demo-cart';
  const orderKey = 'sparkbuild-demo-orders';
  function read(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}}
  function write(key,val){localStorage.setItem(key, JSON.stringify(val))}
  document.querySelectorAll('[data-add-cart]').forEach(btn => btn.addEventListener('click', () => {
    const item = JSON.parse(btn.getAttribute('data-add-cart'));
    const cart = read(cartKey);
    cart.push(item);
    write(cartKey, cart);
    btn.textContent = 'Added';
    setTimeout(() => btn.textContent = 'Add to cart', 1400);
  }));
  if (location.pathname.endsWith('admin.html')) {
    const orders = read(orderKey);
    if (!orders.length) {
      write(orderKey, [
        {id:'ORD-1001', customer:'Aarav', total:'₹2,400'},
        {id:'ORD-1002', customer:'Siya', total:'₹1,180'},
        {id:'ORD-1003', customer:'Isha', total:'₹3,950'}
      ]);
    }
  }
})();`;
}

function buildReadme(site) {
  return `# ${site.title}\n\nExported from SparkBuild Premium v2.\n\n## What's included\n- Multi-page static website\n- Premium styles and animation\n- Cart-ready product buttons for demo behavior\n- Admin panel for store/order style websites\n\n## Edit content\n- Open the HTML files in any editor.\n- Replace text, sections, and links directly.\n\n## Replace images\n- Put your new image in assets/images and reuse the same filename.\n\n## Publish\n- Upload the entire folder to any static host.\n`;
}

function buildHosting(site) {
  return `# Hosting Instructions\n\n## Run locally\n1. Extract the ZIP.\n2. Start a small local server in this folder.\n3. Open index.html through the server.\n\n## Publish online\n1. Upload every file and folder to Netlify, Vercel, GitHub Pages, or any static host.\n2. Keep index.html in the root.\n3. For store-style sites, admin.html gives you a separate dashboard page.\n\n## Notes\n- This export is static, so cart and admin behavior are demo-level and browser-local.\n- For real payments or database orders, connect a backend later.\n`;
}

function buildImageQuery(section, target) {
  if (target.kind === 'product') {
    const product = section.products?.[target.index];
    return `${product?.name || project.type} premium product photography ${project.prompts?.imageDirection || ''}`.trim();
  }
  if (target.kind === 'gallery') {
    return `${section.heading || project.title} editorial gallery ${project.type} ${project.prompts?.imageDirection || ''}`.trim();
  }
  return `${section.title || section.heading || project.title} ${project.type} luxury editorial ${project.prompts?.imageDirection || ''}`.trim();
}

function collectProducts(site) {
  return site.pages.flatMap(page => page.sections.flatMap(section => section.products || []));
}

function pickVariant(type, layout, index) {
  const map = {
    hero: { editorial: ['editorial', 'split'], storybook: ['storybook', 'split'], immersive: ['immersive'], showcase: ['showcase', 'centered'], catalog: ['split'], signature: ['split', 'editorial'] },
  };
  const list = map[type]?.[layout] || ['default'];
  return list[index % list.length] || 'default';
}

function shadeHex(hex, percent) {
  const h = (hex || '#88b79a').replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function slugify(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'website';
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>\"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}

function escapeAttribute(str = '') {
  return String(str).replace(/[&<>\"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}
