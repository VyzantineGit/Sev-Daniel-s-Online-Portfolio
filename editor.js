/*
  ============================================================
  editor.js — Portfolio Inline Editor
  ============================================================
  Drop this file in the same folder as index.html, then add:
    <script src="editor.js"></script>
  just before </body> in index.html (after script.js).

  HOW IT WORKS:
  - A floating "Edit" toolbar appears in the bottom-right corner.
  - Clicking "Edit Page" activates edit mode:
      • Editable text fields get a highlighted border.
      • Images get a click-to-replace overlay.
      • Stats (numbers + labels) become directly editable.
  - All changes are saved to localStorage and restored on page load.
  - "Save" commits changes. "Cancel" reverts unsaved changes.
  - "Reset All" clears all saved edits and restores original content.
  ============================================================
*/

(function () {
  'use strict';

  // ── CONFIG: Which elements are editable ──────────────────────
  // Each entry maps a CSS selector to its edit type.
  const EDITABLE_TEXT = [
    // Hero
    { sel: '.hero-eyebrow',   key: 'hero-eyebrow',   label: 'Hero eyebrow' },
    { sel: '.hero-name',      key: 'hero-name',      label: 'Hero name', html: true },
    { sel: '.hero-sub',       key: 'hero-sub',       label: 'Hero tagline' },

    // About
    { sel: '.about-text h2.section-title', key: 'about-title', label: 'About heading', html: true },
    { sel: '.about-text p:nth-of-type(1)', key: 'about-p1', label: 'About paragraph 1', html: true },
    { sel: '.about-text p:nth-of-type(2)', key: 'about-p2', label: 'About paragraph 2', html: true },
    { sel: '.about-text p:nth-of-type(3)', key: 'about-p3', label: 'About paragraph 3', html: true },
    { sel: '.about-text p:nth-of-type(4)', key: 'about-p4', label: 'About paragraph 4', html: true },

    // Stats
    { sel: '.stat-item:nth-child(1) .stat-number', key: 'stat1-num',   label: 'Stat 1 number' },
    { sel: '.stat-item:nth-child(1) .stat-label',  key: 'stat1-label', label: 'Stat 1 label' },
    { sel: '.stat-item:nth-child(2) .stat-number', key: 'stat2-num',   label: 'Stat 2 number' },
    { sel: '.stat-item:nth-child(2) .stat-label',  key: 'stat2-label', label: 'Stat 2 label' },
    { sel: '.stat-item:nth-child(3) .stat-number', key: 'stat3-num',   label: 'Stat 3 number' },
    { sel: '.stat-item:nth-child(3) .stat-label',  key: 'stat3-label', label: 'Stat 3 label' },

    // Press
    { sel: '#press blockquote',         key: 'press-quote',  label: 'Press quote', html: true },

    // Nav + Footer
    { sel: '.nav-logo',                 key: 'nav-logo',     label: 'Nav name' },
    { sel: '.footer-logo',              key: 'footer-logo',  label: 'Footer name' },
    { sel: '.footer-copy',              key: 'footer-copy',  label: 'Footer copyright' },
  ];

  const EDITABLE_IMAGES = [
    { sel: '.about-image img',  key: 'about-photo',  label: 'About photo' },
    // Album cards — select each img inside .album-card
  ];

  // Album cards are dynamic, handled separately
  const STORAGE_PREFIX = 'portfolio_edit_';

  // ── STATE ────────────────────────────────────────────────────
  let editMode = false;
  let snapshot = {}; // stores pre-edit values for Cancel

  // ── STORAGE HELPERS ──────────────────────────────────────────
  function save(key, value) {
    localStorage.setItem(STORAGE_PREFIX + key, value);
  }
  function load(key) {
    return localStorage.getItem(STORAGE_PREFIX + key);
  }
  function remove(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  }
  function allKeys() {
    return Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
  }

  // ── RESTORE SAVED EDITS ON PAGE LOAD ────────────────────────
  function restoreSaved() {
    // Text
    EDITABLE_TEXT.forEach(({ sel, key, html }) => {
      const saved = load(key);
      if (!saved) return;
      const el = document.querySelector(sel);
      if (!el) return;
      if (html) el.innerHTML = saved;
      else el.textContent = saved;
    });

    // Static images
    EDITABLE_IMAGES.forEach(({ sel, key }) => {
      const saved = load(key);
      if (!saved) return;
      const el = document.querySelector(sel);
      if (el) el.src = saved;
    });

    // Album card images (keyed as album-img-0, album-img-1 …)
    document.querySelectorAll('.album-card').forEach((card, i) => {
      const saved = load('album-img-' + i);
      if (!saved) return;
      let img = card.querySelector('img');
      if (img) {
        img.src = saved;
      } else {
        // Card uses div placeholder — swap to real img
        const artInner = card.querySelector('.album-art-inner');
        if (artInner) {
          const newImg = document.createElement('img');
          newImg.src = saved;
          newImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
          artInner.replaceWith(newImg);
        }
      }
    });

    // Album text fields
    document.querySelectorAll('.album-card').forEach((card, i) => {
      const title = load('album-title-' + i);
      const year  = load('album-year-' + i);
      if (title) { const el = card.querySelector('.album-title'); if (el) el.textContent = title; }
      if (year)  { const el = card.querySelector('.album-year');  if (el) el.textContent = year; }
    });

    // Tour rows
    document.querySelectorAll('.tour-row').forEach((row, i) => {
      const date  = load('tour-date-'  + i);
      const venue = load('tour-venue-' + i);
      const city  = load('tour-city-'  + i);
      const link  = load('tour-link-'  + i);
      if (date)  { const el = row.querySelector('.tour-date');   if (el) el.innerHTML = date; }
      if (venue) { const el = row.querySelector('.tour-venue');  if (el) el.textContent = venue; }
      if (city)  { const el = row.querySelector('.tour-city');   if (el) el.textContent = city; }
      if (link)  { const el = row.querySelector('.tour-ticket'); if (el) el.href = link; }
    });
  }

  // ── SNAPSHOT (for Cancel) ────────────────────────────────────
  function takeSnapshot() {
    snapshot = {};

    EDITABLE_TEXT.forEach(({ sel, key, html }) => {
      const el = document.querySelector(sel);
      if (el) snapshot[key] = html ? el.innerHTML : el.textContent;
    });

    EDITABLE_IMAGES.forEach(({ sel, key }) => {
      const el = document.querySelector(sel);
      if (el) snapshot[key] = el.src;
    });

    document.querySelectorAll('.album-card').forEach((card, i) => {
      const img = card.querySelector('img');
      if (img) snapshot['album-img-' + i] = img.src;
      const t = card.querySelector('.album-title');
      const y = card.querySelector('.album-year');
      if (t) snapshot['album-title-' + i] = t.textContent;
      if (y) snapshot['album-year-' + i]  = y.textContent;
    });

    document.querySelectorAll('.tour-row').forEach((row, i) => {
      const d = row.querySelector('.tour-date');
      const v = row.querySelector('.tour-venue');
      const c = row.querySelector('.tour-city');
      const l = row.querySelector('.tour-ticket');
      if (d) snapshot['tour-date-' + i]  = d.innerHTML;
      if (v) snapshot['tour-venue-' + i] = v.textContent;
      if (c) snapshot['tour-city-' + i]  = c.textContent;
      if (l) snapshot['tour-link-' + i]  = l.href;
    });
  }

  function restoreSnapshot() {
    EDITABLE_TEXT.forEach(({ sel, key, html }) => {
      const el = document.querySelector(sel);
      if (el && snapshot[key] !== undefined) {
        if (html) el.innerHTML = snapshot[key];
        else el.textContent = snapshot[key];
      }
    });

    EDITABLE_IMAGES.forEach(({ sel, key }) => {
      const el = document.querySelector(sel);
      if (el && snapshot[key]) el.src = snapshot[key];
    });

    document.querySelectorAll('.album-card').forEach((card, i) => {
      const img = card.querySelector('img');
      if (img && snapshot['album-img-' + i]) img.src = snapshot['album-img-' + i];
      const t = card.querySelector('.album-title');
      const y = card.querySelector('.album-year');
      if (t && snapshot['album-title-' + i]) t.textContent = snapshot['album-title-' + i];
      if (y && snapshot['album-year-' + i])  y.textContent = snapshot['album-year-' + i];
    });

    document.querySelectorAll('.tour-row').forEach((row, i) => {
      const d = row.querySelector('.tour-date');
      const v = row.querySelector('.tour-venue');
      const c = row.querySelector('.tour-city');
      const l = row.querySelector('.tour-ticket');
      if (d && snapshot['tour-date-' + i])  d.innerHTML = snapshot['tour-date-' + i];
      if (v && snapshot['tour-venue-' + i]) v.textContent = snapshot['tour-venue-' + i];
      if (c && snapshot['tour-city-' + i])  c.textContent = snapshot['tour-city-' + i];
      if (l && snapshot['tour-link-' + i])  l.href = snapshot['tour-link-' + i];
    });
  }

  // ── COMMIT SAVES ─────────────────────────────────────────────
  function commitSaves() {
    EDITABLE_TEXT.forEach(({ sel, key, html }) => {
      const el = document.querySelector(sel);
      if (el) save(key, html ? el.innerHTML : el.textContent);
    });

    EDITABLE_IMAGES.forEach(({ sel, key }) => {
      const el = document.querySelector(sel);
      if (el) save(key, el.src);
    });

    document.querySelectorAll('.album-card').forEach((card, i) => {
      const img = card.querySelector('img');
      if (img) save('album-img-' + i, img.src);
      const t = card.querySelector('.album-title');
      const y = card.querySelector('.album-year');
      if (t) save('album-title-' + i, t.textContent);
      if (y) save('album-year-' + i,  y.textContent);
    });

    document.querySelectorAll('.tour-row').forEach((row, i) => {
      const d = row.querySelector('.tour-date');
      const v = row.querySelector('.tour-venue');
      const c = row.querySelector('.tour-city');
      const l = row.querySelector('.tour-ticket');
      if (d) save('tour-date-' + i,  d.innerHTML);
      if (v) save('tour-venue-' + i, v.textContent);
      if (c) save('tour-city-' + i,  c.textContent);
      if (l) save('tour-link-' + i,  l.href);
    });
  }

  // ── ENTER EDIT MODE ──────────────────────────────────────────
  function enableEditMode() {
    takeSnapshot();
    editMode = true;
    document.body.classList.add('pf-edit-mode');

    // Make text elements contenteditable
    EDITABLE_TEXT.forEach(({ sel }) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.contentEditable = 'true';
      el.classList.add('pf-editable');
    });

    // Album card text
    document.querySelectorAll('.album-card').forEach((card) => {
      ['.album-title', '.album-year'].forEach(s => {
        const el = card.querySelector(s);
        if (el) { el.contentEditable = 'true'; el.classList.add('pf-editable'); }
      });
    });

    // Tour row text
    document.querySelectorAll('.tour-row').forEach((row) => {
      ['.tour-venue', '.tour-city'].forEach(s => {
        const el = row.querySelector(s);
        if (el) { el.contentEditable = 'true'; el.classList.add('pf-editable'); }
      });
      // Tour date (html)
      const d = row.querySelector('.tour-date');
      if (d) { d.contentEditable = 'true'; d.classList.add('pf-editable'); }
      // Ticket link
      const link = row.querySelector('.tour-ticket');
      if (link) addLinkEditor(link);
    });

    // Images
    EDITABLE_IMAGES.forEach(({ sel, label }) => {
      const el = document.querySelector(sel);
      if (el) addImageOverlay(el, label);
    });

    // Album card images
    document.querySelectorAll('.album-card').forEach((card, i) => {
      const artWrap = card.querySelector('.album-art');
      if (!artWrap) return;
      let img = artWrap.querySelector('img');
      // If no img, create placeholder
      if (!img) {
        const artInner = artWrap.querySelector('.album-art-inner');
        img = document.createElement('img');
        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><rect width="220" height="220" fill="%232a3a4a"/><text x="50%25" y="50%25" font-family="sans-serif" font-size="14" fill="%234ab8c8" text-anchor="middle" dominant-baseline="middle">No image</text></svg>';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        if (artInner) artInner.replaceWith(img);
        else artWrap.appendChild(img);
      }
      addImageOverlay(img, 'Album ' + (i + 1) + ' art');
    });

    // About photo (in case selector is div not img)
    const aboutDiv = document.querySelector('.about-image');
    if (aboutDiv) {
      let img = aboutDiv.querySelector('img');
      if (img) addImageOverlay(img, 'Your photo');
    }

    updateToolbar();
  }

  // ── EXIT EDIT MODE ───────────────────────────────────────────
  function disableEditMode(save) {
    editMode = false;
    document.body.classList.remove('pf-edit-mode');

    // Remove contenteditable
    document.querySelectorAll('.pf-editable').forEach(el => {
      el.removeAttribute('contenteditable');
      el.classList.remove('pf-editable');
    });

    // Remove image overlays
    document.querySelectorAll('.pf-img-overlay').forEach(el => el.remove());

    // Remove link editor buttons
    document.querySelectorAll('.pf-link-btn').forEach(el => el.remove());

    if (save) {
      commitSaves();
      showToast('Changes saved!');
    } else {
      restoreSnapshot();
    }

    updateToolbar();
  }

  // ── IMAGE OVERLAY ────────────────────────────────────────────
  function addImageOverlay(imgEl, label) {
    // Wrap in relative container if needed
    const parent = imgEl.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    const overlay = document.createElement('div');
    overlay.className = 'pf-img-overlay';
    overlay.innerHTML = `<span>📷 Replace ${label}</span>`;
    overlay.title = 'Click to upload a new image';

    overlay.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          imgEl.src = ev.target.result;
          // Ensure it's visible as a real img
          imgEl.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });

    parent.appendChild(overlay);
  }

  // ── LINK EDITOR (for tour ticket links) ──────────────────────
  function addLinkEditor(linkEl) {
    const btn = document.createElement('button');
    btn.className = 'pf-link-btn';
    btn.textContent = '🔗';
    btn.title = 'Edit ticket URL';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const newUrl = prompt('Ticket URL:', linkEl.href === location.href ? '#' : linkEl.href);
      if (newUrl !== null) linkEl.href = newUrl || '#';
    });
    linkEl.style.position = 'relative';
    linkEl.parentElement.style.position = 'relative';
    linkEl.insertAdjacentElement('afterend', btn);
  }

  // ── TOOLBAR ──────────────────────────────────────────────────
  function buildToolbar() {
    const bar = document.createElement('div');
    bar.id = 'pf-toolbar';
    bar.innerHTML = `
      <div id="pf-tb-inner">
        <span id="pf-tb-status">✏️ Edit Portfolio</span>
        <div id="pf-tb-buttons">
          <button id="pf-btn-edit">Edit Page</button>
          <button id="pf-btn-save" style="display:none">Save</button>
          <button id="pf-btn-cancel" style="display:none">Cancel</button>
          <button id="pf-btn-reset">Reset All</button>
        </div>
      </div>
    `;
    document.body.appendChild(bar);

    document.getElementById('pf-btn-edit').addEventListener('click', enableEditMode);
    document.getElementById('pf-btn-save').addEventListener('click', () => disableEditMode(true));
    document.getElementById('pf-btn-cancel').addEventListener('click', () => disableEditMode(false));
    document.getElementById('pf-btn-reset').addEventListener('click', () => {
      if (!confirm('Reset all edits and restore the original content?')) return;
      allKeys().forEach(k => localStorage.removeItem(k));
      location.reload();
    });
  }

  function updateToolbar() {
    const btnEdit   = document.getElementById('pf-btn-edit');
    const btnSave   = document.getElementById('pf-btn-save');
    const btnCancel = document.getElementById('pf-btn-cancel');
    const status    = document.getElementById('pf-tb-status');

    if (editMode) {
      btnEdit.style.display   = 'none';
      btnSave.style.display   = '';
      btnCancel.style.display = '';
      status.textContent = '🟡 Editing…';
    } else {
      btnEdit.style.display   = '';
      btnSave.style.display   = 'none';
      btnCancel.style.display = 'none';
      status.textContent = '✏️ Edit Portfolio';
    }
  }

  // ── TOAST NOTIFICATION ───────────────────────────────────────
  function showToast(msg) {
    const t = document.createElement('div');
    t.id = 'pf-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('pf-toast-show'), 10);
    setTimeout(() => { t.classList.remove('pf-toast-show'); setTimeout(() => t.remove(), 400); }, 2500);
  }

  // ── STYLES ───────────────────────────────────────────────────
  function injectStyles() {
    const css = `
      /* ── Toolbar ── */
      #pf-toolbar {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        font-family: 'DM Sans', system-ui, sans-serif;
      }
      #pf-tb-inner {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #1a2530;
        border: 1px solid #4ab8c8;
        border-radius: 12px;
        padding: 10px 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.45);
        backdrop-filter: blur(8px);
      }
      #pf-tb-status {
        font-size: 13px;
        color: #c0cdd8;
        white-space: nowrap;
        letter-spacing: 0.01em;
      }
      #pf-tb-buttons {
        display: flex;
        gap: 8px;
      }
      #pf-toolbar button {
        cursor: pointer;
        border: none;
        border-radius: 7px;
        padding: 6px 13px;
        font-size: 12.5px;
        font-weight: 600;
        letter-spacing: 0.02em;
        transition: opacity 0.15s, transform 0.1s;
      }
      #pf-toolbar button:hover { opacity: 0.85; transform: translateY(-1px); }
      #pf-btn-edit   { background: #4ab8c8; color: #0d1a22; }
      #pf-btn-save   { background: #5ec476; color: #0d1a22; }
      #pf-btn-cancel { background: #888; color: #fff; }
      #pf-btn-reset  { background: transparent; color: #e87070; border: 1px solid #e87070 !important; padding: 5px 10px; }

      /* ── Editable text fields ── */
      .pf-editable {
        outline: 2px dashed #4ab8c8 !important;
        outline-offset: 3px;
        border-radius: 3px;
        cursor: text;
        min-width: 20px;
        min-height: 1em;
        transition: outline-color 0.2s;
      }
      .pf-editable:focus {
        outline-color: #c8a85a !important;
        background: rgba(74,184,200,0.06);
      }
      .pf-editable:hover:not(:focus) {
        outline-color: rgba(74,184,200,0.5) !important;
      }

      /* ── Image overlay ── */
      .pf-img-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(13, 26, 34, 0.65);
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
        border-radius: inherit;
        z-index: 10;
      }
      .pf-img-overlay:hover { opacity: 1; }
      .pf-img-overlay span {
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        background: rgba(74,184,200,0.2);
        border: 1px solid #4ab8c8;
        padding: 6px 12px;
        border-radius: 8px;
        pointer-events: none;
        text-align: center;
      }

      /* ── Link editor button ── */
      .pf-link-btn {
        display: inline-block;
        margin-left: 6px;
        background: rgba(74,184,200,0.2);
        border: 1px solid #4ab8c8;
        border-radius: 6px;
        color: #4ab8c8;
        cursor: pointer;
        font-size: 14px;
        padding: 2px 6px;
        vertical-align: middle;
        line-height: 1;
        transition: background 0.15s;
      }
      .pf-link-btn:hover { background: rgba(74,184,200,0.4); }

      /* ── Toast ── */
      #pf-toast {
        position: fixed;
        bottom: 80px;
        right: 24px;
        background: #1a2530;
        border: 1px solid #5ec476;
        color: #5ec476;
        padding: 10px 18px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        z-index: 999999;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.3s, transform 0.3s;
        pointer-events: none;
      }
      #pf-toast.pf-toast-show { opacity: 1; transform: translateY(0); }

      /* ── Edit mode body indicator ── */
      body.pf-edit-mode::after {
        content: 'EDIT MODE';
        position: fixed;
        top: 0; left: 0; right: 0;
        text-align: center;
        padding: 4px;
        background: rgba(74,184,200,0.12);
        border-bottom: 1px solid rgba(74,184,200,0.3);
        color: #4ab8c8;
        font-size: 11px;
        letter-spacing: 0.2em;
        font-family: system-ui, sans-serif;
        font-weight: 700;
        z-index: 99998;
        pointer-events: none;
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    injectStyles();
    restoreSaved();
    buildToolbar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
