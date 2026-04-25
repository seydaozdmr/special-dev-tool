'use strict';

/* ══════════════════════════════════════════
   Utilities
══════════════════════════════════════════ */
const $ = id => document.getElementById(id);

function setStatus(id, text, type = '') {
  const el = $(id); if (!el) return;
  el.textContent = text;
  el.className = 'status-msg' + (type ? ' ' + type : '');
}

async function copyText(text) {
  try {
    if (window.electronAPI) await window.electronAPI.copyToClipboard(text);
    else await navigator.clipboard.writeText(text);
  } catch {}
}

async function readClipboard() {
  try {
    if (window.electronAPI) return await window.electronAPI.readClipboard();
    return await navigator.clipboard.readText();
  } catch { return ''; }
}

function flash(el, label, ms = 1200) {
  const orig = el.textContent;
  el.textContent = label;
  setTimeout(() => { el.textContent = orig; }, ms);
}

function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtTime(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function truncate(s, n = 80) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/* ── Split-pane resizer ── */
function makeResizer(resizerId, splitId, horizontal = false) {
  const resizer = $(resizerId), split = $(splitId);
  if (!resizer || !split) return;
  let drag = false, start = 0, baseSize = 0;

  resizer.addEventListener('mousedown', e => {
    drag = true; start = horizontal ? e.clientY : e.clientX;
    const panes = split.querySelectorAll(':scope > .pane');
    baseSize = horizontal
      ? panes[0].getBoundingClientRect().height
      : panes[0].getBoundingClientRect().width;
    resizer.classList.add('dragging');
    document.body.style.cursor = horizontal ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!drag) return;
    const delta = (horizontal ? e.clientY : e.clientX) - start;
    const total = horizontal
      ? split.getBoundingClientRect().height - resizer.offsetHeight
      : split.getBoundingClientRect().width - resizer.offsetWidth;
    const newSize = Math.max(80, Math.min(total - 80, baseSize + delta));
    const pct = (newSize / total * 100).toFixed(2);
    const panes = split.querySelectorAll(':scope > .pane');
    const prop = horizontal ? 'height' : 'width';
    panes[0].style.flex = 'none'; panes[0].style[prop] = pct + '%';
    panes[1].style.flex = '1'; panes[1].style[prop] = '';
  });
  document.addEventListener('mouseup', () => {
    if (!drag) return; drag = false;
    resizer.classList.remove('dragging');
    document.body.style.cursor = document.body.style.userSelect = '';
  });
}

/* ══════════════════════════════════════════
   Theme
══════════════════════════════════════════ */
document.body.className = (localStorage.getItem('dt-theme') || 'dark') + '-theme';

// Load persisted history after DOM is ready
window.addEventListener('DOMContentLoaded', loadHistoryFromDisk);

$('btn-theme').addEventListener('click', () => {
  const next = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
  document.body.className = next + '-theme';
  localStorage.setItem('dt-theme', next);
  setTimeout(() => allCMs().forEach(cm => cm.refresh()), 50);
});

function allCMs() { return [jsonInputCM, jsonOutputCM, xmlInputCM, xmlOutputCM].filter(Boolean); }

/* ══════════════════════════════════════════
   History
══════════════════════════════════════════ */
let historyLog = [];

/* ── Persist to electron-store via IPC ── */
async function persistHistory() {
  if (window.electronAPI?.history) {
    // ts is a Date — serialize as ISO string
    const serializable = historyLog.map(e => ({ ...e, ts: e.ts instanceof Date ? e.ts.toISOString() : e.ts }));
    await window.electronAPI.history.save(serializable);
  }
}

async function loadHistoryFromDisk() {
  if (!window.electronAPI?.history) return;
  try {
    const saved = await window.electronAPI.history.load();
    historyLog = (saved || []).map(e => ({ ...e, ts: new Date(e.ts) }));
    renderHistoryList();
  } catch {}
}

function addHistory(entry) {
  historyLog.unshift({ id: Date.now() + Math.random(), ts: new Date(), ...entry });
  if (historyLog.length > 150) historyLog.pop();
  renderHistoryList();
  persistHistory();
}

function renderHistoryList() {
  const list = $('history-list');
  if (!historyLog.length) {
    list.innerHTML = '<div class="empty-hint" style="padding:20px 14px;">No history yet.</div>';
    return;
  }
  list.innerHTML = '';
  historyLog.forEach(e => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const top = document.createElement('div');
    top.className = 'history-item-top';

    const badge = document.createElement('span');
    badge.className = 'history-tool-badge';
    badge.textContent = e.toolLabel;

    const op = document.createElement('span');
    op.className = 'history-op';
    op.textContent = e.operation;

    const time = document.createElement('span');
    time.className = 'history-time';
    time.textContent = fmtTime(e.ts);

    top.append(badge, op, time);

    const preview = document.createElement('div');
    preview.className = 'history-preview';
    preview.textContent = truncate(e.inputPreview || '');

    const actions = document.createElement('div');
    actions.className = 'history-actions';

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'history-restore';
    restoreBtn.textContent = 'Restore here';
    restoreBtn.addEventListener('click', () => restoreHistory(e, false));

    const newTabBtn = document.createElement('button');
    newTabBtn.className = 'history-restore-new';
    newTabBtn.textContent = 'Open in new tab';
    newTabBtn.addEventListener('click', () => restoreHistory(e, true));

    actions.append(restoreBtn, newTabBtn);
    item.append(top, preview, actions);
    list.appendChild(item);
  });
}

function restoreHistory(entry, inNewTab) {
  // Switch sidebar + panel
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-tool="${entry.tool}"]`);
  if (navBtn) navBtn.classList.add('active');
  const panel = $('tool-' + entry.tool);
  if (panel) panel.classList.add('active');

  if (inNewTab) {
    saveTab(entry.tool);
    const store = tabStore[entry.tool];
    const id = store.nextId++;
    store.tabs.push({ id, label: `Restored ${fmtTime(entry.ts)}`, data: JSON.parse(JSON.stringify(entry.tabData)) });
    store.activeId = id;
  } else {
    saveTab(entry.tool);
    const store = tabStore[entry.tool];
    const tab = store.tabs.find(t => t.id === store.activeId);
    if (tab) tab.data = JSON.parse(JSON.stringify(entry.tabData));
  }

  loadTab(entry.tool, tabStore[entry.tool].activeId);
  renderTabBar(entry.tool);
  setTimeout(() => allCMs().forEach(cm => cm.refresh()), 30);
}

$('history-clear-all').addEventListener('click', async () => {
  historyLog = [];
  renderHistoryList();
  if (window.electronAPI?.history) await window.electronAPI.history.clear();
});

/* ── History toggle ── */
const historyPanel = $('history-panel');
const historyToggleBtn = $('history-toggle');
let historyOpen = false;

historyToggleBtn.addEventListener('click', () => {
  historyOpen = !historyOpen;
  historyPanel.classList.toggle('open', historyOpen);
  historyToggleBtn.classList.toggle('active', historyOpen);
});

/* ══════════════════════════════════════════
   Tab system
══════════════════════════════════════════ */
const TOOL_LABELS = { json: 'JSON', xml: 'XML', html: 'HTML', diff: 'Diff', regex: 'Regex' };

function defaultTabData(toolId) {
  switch (toolId) {
    case 'json':  return { input: '', output: '', treeOn: false };
    case 'xml':   return { input: '', output: '' };
    case 'html':  return { input: '', output: '' };
    case 'diff':  return { original: '', modified: '' };
    case 'regex': return { pattern: '', flags: 'g', input: '' };
    default: return {};
  }
}

const tabStore = {};
['json','xml','html','diff','regex'].forEach(t => {
  tabStore[t] = { nextId: 2, activeId: 1, tabs: [{ id: 1, label: 'Tab 1', data: defaultTabData(t) }] };
});

function saveTab(toolId) {
  const store = tabStore[toolId];
  const tab = store.tabs.find(t => t.id === store.activeId);
  if (!tab) return;
  switch (toolId) {
    case 'json':
      tab.data = { input: jsonInputCM.getValue(), output: jsonOutputCM.getValue(), treeOn: jsonTreeOn };
      break;
    case 'xml':
      tab.data = { input: xmlInputCM.getValue(), output: xmlOutputCM.getValue() };
      break;
    case 'html':
      tab.data = { input: $('html-input').value, output: $('html-output').value };
      break;
    case 'diff':
      tab.data = { original: $('diff-original').value, modified: $('diff-modified').value };
      break;
    case 'regex':
      tab.data = { pattern: $('regex-pattern').value, flags: $('regex-flags').value, input: $('regex-input').value };
      break;
  }
}

function loadTab(toolId, tabId) {
  const store = tabStore[toolId];
  const tab = store.tabs.find(t => t.id === tabId);
  if (!tab) return;
  store.activeId = tabId;
  switch (toolId) {
    case 'json':
      jsonInputCM.setValue(tab.data.input || '');
      jsonOutputCM.setValue(tab.data.output || '');
      jsonTreeOn = tab.data.treeOn || false;
      $('json-tree-toggle').classList.toggle('on', jsonTreeOn);
      $('json-tree').style.display = jsonTreeOn ? '' : 'none';
      jsonOutputCM.getWrapperElement().style.display = jsonTreeOn ? 'none' : '';
      updateJSONStats();
      break;
    case 'xml':
      xmlInputCM.setValue(tab.data.input || '');
      xmlOutputCM.setValue(tab.data.output || '');
      break;
    case 'html':
      $('html-input').value = tab.data.input || '';
      $('html-output').value = tab.data.output || '';
      break;
    case 'diff':
      $('diff-original').value = tab.data.original || '';
      $('diff-modified').value = tab.data.modified || '';
      $('diff-output').innerHTML = '<div class="empty-hint">Click Compare to see the diff</div>';
      $('diff-stats').textContent = '';
      break;
    case 'regex':
      $('regex-pattern').value = tab.data.pattern || '';
      $('regex-flags').value = tab.data.flags || 'g';
      $('regex-input').value = tab.data.input || '';
      syncRegexHighlight();
      break;
  }
}

function renderTabBar(toolId) {
  const container = $(`${toolId}-tablist`);
  if (!container) return;
  container.innerHTML = '';
  const store = tabStore[toolId];
  store.tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab-item' + (tab.id === store.activeId ? ' active' : '');

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = tab.label;
    label.title = tab.label;
    label.addEventListener('dblclick', e => {
      e.stopPropagation();
      const input = document.createElement('input');
      input.value = tab.label;
      input.style.cssText = 'background:transparent;border:none;outline:none;color:inherit;font:inherit;width:100px;';
      label.replaceWith(input);
      input.focus(); input.select();
      const done = () => {
        tab.label = input.value.trim() || tab.label;
        renderTabBar(toolId);
      };
      input.addEventListener('blur', done);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') done(); if (e.key === 'Escape') renderTabBar(toolId); });
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close tab';
    closeBtn.addEventListener('click', ev => { ev.stopPropagation(); closeTab(toolId, tab.id); });

    el.append(label, closeBtn);
    el.addEventListener('click', e => {
      if (e.target === closeBtn) return;
      if (tab.id !== store.activeId) {
        saveTab(toolId);
        loadTab(toolId, tab.id);
        renderTabBar(toolId);
        setTimeout(() => allCMs().forEach(cm => cm.refresh()), 20);
      }
    });
    container.appendChild(el);
  });
}

function addTab(toolId) {
  saveTab(toolId);
  const store = tabStore[toolId];
  const id = store.nextId++;
  store.tabs.push({ id, label: `Tab ${id}`, data: defaultTabData(toolId) });
  loadTab(toolId, id);
  renderTabBar(toolId);
  setTimeout(() => allCMs().forEach(cm => cm.refresh()), 20);
}

function closeTab(toolId, tabId) {
  const store = tabStore[toolId];
  if (store.tabs.length <= 1) return;
  const idx = store.tabs.findIndex(t => t.id === tabId);
  store.tabs.splice(idx, 1);
  if (store.activeId === tabId) {
    const next = store.tabs[Math.min(idx, store.tabs.length - 1)];
    loadTab(toolId, next.id);
  }
  renderTabBar(toolId);
}

// Wire "+" buttons
document.querySelectorAll('.tab-add').forEach(btn => {
  btn.addEventListener('click', () => addTab(btn.dataset.tool));
});

/* ══════════════════════════════════════════
   Sidebar navigation
══════════════════════════════════════════ */
const TOOLS = ['json', 'xml', 'html', 'diff', 'regex'];

function switchTool(toolId) {
  const prev = document.querySelector('.nav-item.active');
  if (prev) saveTab(prev.dataset.tool);
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`.nav-item[data-tool="${toolId}"]`);
  if (btn) btn.classList.add('active');
  const panel = $('tool-' + toolId);
  if (panel) panel.classList.add('active');
  setTimeout(() => { allCMs().forEach(cm => cm.refresh()); syncRegexHighlight(); }, 30);
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchTool(btn.dataset.tool));
});

/* ══════════════════════════════════════════
   Keyboard shortcuts
══════════════════════════════════════════ */
function activeTool() {
  const btn = document.querySelector('.nav-item.active');
  return btn ? btn.dataset.tool : 'json';
}

document.addEventListener('keydown', e => {
  const cmd = e.metaKey || e.ctrlKey;
  if (!cmd) return;

  // Cmd+T — new tab
  if (e.key === 't' && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    addTab(activeTool());
    return;
  }

  // Cmd+W — close current tab
  if (e.key === 'w' && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    const tool = activeTool();
    closeTab(tool, tabStore[tool].activeId);
    return;
  }

  // Cmd+Shift+] — next tab
  if (e.key === ']' && e.shiftKey) {
    e.preventDefault();
    const tool = activeTool();
    const store = tabStore[tool];
    const idx = store.tabs.findIndex(t => t.id === store.activeId);
    const next = store.tabs[(idx + 1) % store.tabs.length];
    if (next.id !== store.activeId) { saveTab(tool); loadTab(tool, next.id); renderTabBar(tool); }
    return;
  }

  // Cmd+Shift+[ — previous tab
  if (e.key === '[' && e.shiftKey) {
    e.preventDefault();
    const tool = activeTool();
    const store = tabStore[tool];
    const idx = store.tabs.findIndex(t => t.id === store.activeId);
    const prev = store.tabs[(idx - 1 + store.tabs.length) % store.tabs.length];
    if (prev.id !== store.activeId) { saveTab(tool); loadTab(tool, prev.id); renderTabBar(tool); }
    return;
  }

  // Cmd+1…5 — switch tool
  if (!e.shiftKey && !e.altKey && e.key >= '1' && e.key <= '5') {
    const tool = TOOLS[parseInt(e.key) - 1];
    if (tool && tool !== activeTool()) { e.preventDefault(); switchTool(tool); }
    return;
  }

  // Cmd+Shift+H — toggle history
  if (e.key === 'h' && e.shiftKey) {
    e.preventDefault();
    historyToggleBtn.click();
    return;
  }
});

/* ══════════════════════════════════════════
   1. JSON Formatter
══════════════════════════════════════════ */
let jsonInputCM, jsonOutputCM, jsonTreeOn = false;

(function initJSON() {
  const cmOpts = extra => ({
    mode: { name: 'javascript', json: true }, theme: 'default',
    lineNumbers: true, lineWrapping: true, matchBrackets: true, autoCloseBrackets: true,
    foldGutter: true, gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    extraKeys: { 'Ctrl-Q': cm => cm.foldCode(cm.getCursor()) }, ...extra
  });
  jsonInputCM = CodeMirror.fromTextArea($('json-input-raw'), cmOpts({ autofocus: true }));
  jsonOutputCM = CodeMirror.fromTextArea($('json-output-raw'), cmOpts({ readOnly: true }));
  ['json-input-wrap','json-output-wrap'].forEach(id => {
    const cm = $(id)?.querySelector('.CodeMirror');
    if (cm) cm.style.height = '100%';
  });
  jsonInputCM.on('change', updateJSONStats);
  makeResizer('json-resizer', 'json-split');
  renderTabBar('json');

  // Sample JSON
  const sample = JSON.stringify({ name:'DevTools', version:'1.0.0', tools:['JSON','XML','HTML','Diff','Regex'], settings:{ theme:'dark', indent:2 }, active:true }, null, 2);
  tabStore.json.tabs[0].data.input = sample;
  loadTab('json', 1);
})();

function getJSONIndent() { const v = $('json-indent').value; return v === 'tab' ? '\t' : parseInt(v); }

function jsonFormat() {
  const raw = jsonInputCM.getValue().trim();
  if (!raw) { setStatus('json-status-text','Nothing to format',''); return; }
  try {
    const obj = JSON.parse(raw);
    const pretty = JSON.stringify(obj, null, getJSONIndent());
    jsonOutputCM.setValue(pretty);
    if (jsonTreeOn) renderJSONTree(obj);
    setStatus('json-status-text','Valid JSON','ok');
    updateJSONStats();
    addHistory({ tool:'json', toolLabel:'JSON', operation:'Format',
      inputPreview: truncate(raw.replace(/\s+/g,' ')),
      tabData: { input: raw, output: pretty, treeOn: false }
    });
  } catch (e) { setStatus('json-status-text','Error: '+e.message,'err'); }
}

function jsonMinify() {
  const raw = jsonInputCM.getValue().trim();
  if (!raw) return;
  try {
    const out = JSON.stringify(JSON.parse(raw));
    jsonOutputCM.setValue(out);
    setStatus('json-status-text','Minified','ok');
    updateJSONStats();
    addHistory({ tool:'json', toolLabel:'JSON', operation:'Minify',
      inputPreview: truncate(raw.replace(/\s+/g,' ')),
      tabData: { input: raw, output: out, treeOn: false }
    });
  } catch (e) { setStatus('json-status-text','Error: '+e.message,'err'); }
}

function jsonValidate() {
  const raw = jsonInputCM.getValue().trim();
  if (!raw) { setStatus('json-status-text','Nothing to validate',''); return; }
  try {
    const obj = JSON.parse(raw);
    const k = countKeys(obj);
    const msg = `Valid JSON · ${k} key${k!==1?'s':''}`;
    setStatus('json-status-text', msg, 'ok');
    addHistory({ tool:'json', toolLabel:'JSON', operation:'Validate ✓',
      inputPreview: truncate(raw.replace(/\s+/g,' ')),
      tabData: { input: raw, output: jsonOutputCM.getValue(), treeOn: false }
    });
  } catch (e) { setStatus('json-status-text','Invalid: '+e.message,'err'); }
}

function countKeys(o) {
  if (typeof o !== 'object' || o === null) return 0;
  let n = Object.keys(o).length;
  for (const v of Object.values(o)) n += countKeys(v);
  return n;
}

function updateJSONStats() {
  const t = jsonInputCM.getValue();
  $('json-stats').textContent = `${t.length} chars · ${t.split('\n').length} lines · ${formatBytes(new Blob([t]).size)}`;
}

function toggleJSONTree() {
  jsonTreeOn = !jsonTreeOn;
  $('json-tree-toggle').classList.toggle('on', jsonTreeOn);
  const outWrap = jsonOutputCM.getWrapperElement();
  const tree = $('json-tree');
  if (jsonTreeOn) {
    const raw = jsonInputCM.getValue().trim() || jsonOutputCM.getValue().trim();
    try { renderJSONTree(JSON.parse(raw)); outWrap.style.display='none'; tree.style.display=''; }
    catch { setStatus('json-status-text','Format JSON first','err'); jsonTreeOn=false; $('json-tree-toggle').classList.remove('on'); }
  } else { outWrap.style.display=''; tree.style.display='none'; }
}

function renderJSONTree(data) { $('json-tree').innerHTML=''; $('json-tree').appendChild(buildTreeNode(data,null)); }
function buildTreeNode(val, key) {
  const wrap = document.createElement('div'); wrap.className = 'tree-node';
  if (val !== null && typeof val === 'object') {
    const isArr=Array.isArray(val), entries=isArr?val.map((v,i)=>[i,v]):Object.entries(val);
    const open=isArr?'[':'{', close=isArr?']':'}';
    const header=document.createElement('span');
    const toggle=document.createElement('span'); toggle.className='tree-toggle'; toggle.textContent=entries.length?'▾ ':'  ';
    header.appendChild(toggle);
    if (key!==null) { const k=document.createElement('span'); k.className='tree-key'; k.textContent=JSON.stringify(key)+': '; header.appendChild(k); }
    header.appendChild(document.createTextNode(open));
    wrap.appendChild(header);
    if (entries.length) {
      const children=document.createElement('div'); children.className='tree-children';
      entries.forEach(([k,v]) => children.appendChild(buildTreeNode(v,k)));
      const closing=document.createElement('div'); closing.textContent=close;
      wrap.append(children,closing);
      toggle.style.cursor='pointer';
      toggle.addEventListener('click',e=>{ e.stopPropagation(); const c=children.classList.toggle('collapsed'); toggle.textContent=c?'▸ ':'▾ '; });
    } else header.appendChild(document.createTextNode(close));
  } else {
    const line=document.createElement('span');
    if (key!==null) { const k=document.createElement('span'); k.className='tree-key'; k.textContent=JSON.stringify(key)+': '; line.appendChild(k); }
    const v=document.createElement('span');
    if (typeof val==='string') { v.className='tree-str'; v.textContent=JSON.stringify(val); }
    else if (typeof val==='number') { v.className='tree-num'; v.textContent=val; }
    else if (typeof val==='boolean') { v.className='tree-bool'; v.textContent=val; }
    else { v.className='tree-null'; v.textContent='null'; }
    line.appendChild(v); wrap.appendChild(line);
  }
  return wrap;
}

$('json-format').addEventListener('click', jsonFormat);
$('json-minify').addEventListener('click', jsonMinify);
$('json-validate').addEventListener('click', jsonValidate);
$('json-tree-toggle').addEventListener('click', toggleJSONTree);
$('json-clear').addEventListener('click', () => { jsonInputCM.setValue(''); jsonOutputCM.setValue(''); $('json-tree').innerHTML=''; setStatus('json-status-text','Ready',''); $('json-stats').textContent=''; });
$('json-paste').addEventListener('click', async () => { jsonInputCM.setValue(await readClipboard()); jsonFormat(); });
$('json-copy').addEventListener('click', async () => { await copyText(jsonOutputCM.getValue()); flash($('json-copy'),'Copied!'); });
$('json-copy-sm').addEventListener('click', async () => { await copyText(jsonOutputCM.getValue()); flash($('json-copy-sm'),'✓'); });

/* ══════════════════════════════════════════
   2. XML Beautify
══════════════════════════════════════════ */
let xmlInputCM, xmlOutputCM;

(function initXML() {
  const opts = extra => ({ mode:'xml', theme:'default', lineNumbers:true, lineWrapping:true, foldGutter:true, gutters:['CodeMirror-linenumbers','CodeMirror-foldgutter'], extraKeys:{'Ctrl-Q':cm=>cm.foldCode(cm.getCursor())}, ...extra });
  xmlInputCM = CodeMirror.fromTextArea($('xml-input-raw'), opts({}));
  xmlOutputCM = CodeMirror.fromTextArea($('xml-output-raw'), opts({ readOnly:true }));
  makeResizer('xml-resizer','xml-split');
  renderTabBar('xml');
})();

function getXMLIndent() { const v=$('xml-indent').value; return v==='tab'?'\t':' '.repeat(parseInt(v)); }

function serializeXML(node, ind, depth) {
  const p = ind.repeat(depth);
  switch (node.nodeType) {
    case Node.DOCUMENT_NODE: return Array.from(node.childNodes).map(c=>serializeXML(c,ind,depth)).join('');
    case Node.TEXT_NODE: { const t=node.textContent.trim(); return t ? p+t+'\n' : ''; }
    case Node.COMMENT_NODE: return p+`<!--${node.textContent}-->\n`;
    case Node.PROCESSING_INSTRUCTION_NODE: return p+`<?${node.target} ${node.data}?>\n`;
    case Node.CDATA_SECTION_NODE: return p+`<![CDATA[${node.data}]]>\n`;
    case Node.ELEMENT_NODE: {
      let attrs=''; for (const a of node.attributes) attrs+=` ${a.name}="${a.value}"`;
      const kids=Array.from(node.childNodes).filter(c=>c.nodeType!==Node.TEXT_NODE||c.textContent.trim());
      if (!kids.length) return p+`<${node.tagName}${attrs}/>\n`;
      if (kids.length===1&&kids[0].nodeType===Node.TEXT_NODE) return p+`<${node.tagName}${attrs}>${kids[0].textContent.trim()}</${node.tagName}>\n`;
      let out=p+`<${node.tagName}${attrs}>\n`;
      kids.forEach(c=>{ out+=serializeXML(c,ind,depth+1); });
      return out+p+`</${node.tagName}>\n`;
    }
    default: return '';
  }
}

function beautifyXML(str, ind) {
  const doc=new DOMParser().parseFromString(str,'application/xml');
  const err=doc.querySelector('parsererror');
  if (err) throw new Error(err.textContent.trim().split('\n')[0]);
  return serializeXML(doc,ind,0).trim();
}

function minifyXML(str) {
  const doc=new DOMParser().parseFromString(str,'application/xml');
  const err=doc.querySelector('parsererror');
  if (err) throw new Error(err.textContent.trim().split('\n')[0]);
  return new XMLSerializer().serializeToString(doc).replace(/>\s+</g,'><').trim();
}

$('xml-beautify').addEventListener('click', () => {
  const raw=xmlInputCM.getValue().trim(); if (!raw) return;
  try {
    const out=beautifyXML(raw,getXMLIndent());
    xmlOutputCM.setValue(out);
    setStatus('xml-status-text','Valid XML','ok');
    addHistory({ tool:'xml', toolLabel:'XML', operation:'Beautify', inputPreview:truncate(raw.replace(/\s+/g,' ')), tabData:{input:raw,output:out} });
  } catch(e) { setStatus('xml-status-text','Error: '+e.message,'err'); }
});
$('xml-minify').addEventListener('click', () => {
  const raw=xmlInputCM.getValue().trim(); if (!raw) return;
  try {
    const out=minifyXML(raw);
    xmlOutputCM.setValue(out);
    setStatus('xml-status-text','Minified','ok');
    addHistory({ tool:'xml', toolLabel:'XML', operation:'Minify', inputPreview:truncate(raw.replace(/\s+/g,' ')), tabData:{input:raw,output:out} });
  } catch(e) { setStatus('xml-status-text','Error: '+e.message,'err'); }
});
$('xml-clear').addEventListener('click', () => { xmlInputCM.setValue(''); xmlOutputCM.setValue(''); setStatus('xml-status-text','Ready',''); });
$('xml-paste').addEventListener('click', async () => { xmlInputCM.setValue(await readClipboard()); });
$('xml-copy').addEventListener('click', async () => { await copyText(xmlOutputCM.getValue()); flash($('xml-copy'),'Copied!'); });
$('xml-copy-sm').addEventListener('click', async () => { await copyText(xmlOutputCM.getValue()); flash($('xml-copy-sm'),'✓'); });

/* ══════════════════════════════════════════
   3. HTML Encoder / Decoder
══════════════════════════════════════════ */
(function initHTML() { makeResizer('html-resizer','html-split'); renderTabBar('html'); })();

const NAMED = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','©':'&copy;','®':'&reg;','™':'&trade;','€':'&euro;','£':'&pound;','¥':'&yen;','°':'&deg;','±':'&plusmn;','×':'&times;','÷':'&divide;','½':'&frac12;','¼':'&frac14;','¾':'&frac34;','·':'&middot;','–':'&ndash;','—':'&mdash;','\u00a0':'&nbsp;' };
const NAMED_RE = new RegExp('[&<>"\'©®™€£¥°±×÷½¼¾·–—\u00a0]','g');

function encodeHTML(str, mode) {
  if (mode==='numeric') return str.replace(/[^\x20-\x7E]|[&<>"']/g, ch => ch.codePointAt(0)>127||'&<>"\''.includes(ch)?`&#${ch.codePointAt(0)};`:ch);
  return str.replace(NAMED_RE, ch => NAMED[ch]||`&#${ch.codePointAt(0)};`);
}
function decodeHTML(str) { const ta=document.createElement('textarea'); ta.innerHTML=str; return ta.value; }

$('html-encode').addEventListener('click', () => {
  const inp=$('html-input').value, out=encodeHTML(inp,$('html-mode').value);
  $('html-output').value=out;
  setStatus('html-status-text','Encoded','ok');
  $('html-stats').textContent=out.length+' chars';
  addHistory({ tool:'html', toolLabel:'HTML', operation:'Encode', inputPreview:truncate(inp), tabData:{input:inp,output:out} });
});
$('html-decode').addEventListener('click', () => {
  const inp=$('html-input').value, out=decodeHTML(inp);
  $('html-output').value=out;
  setStatus('html-status-text','Decoded','ok');
  $('html-stats').textContent=out.length+' chars';
  addHistory({ tool:'html', toolLabel:'HTML', operation:'Decode', inputPreview:truncate(inp), tabData:{input:inp,output:out} });
});
$('html-clear').addEventListener('click', () => { $('html-input').value=''; $('html-output').value=''; setStatus('html-status-text','Ready',''); $('html-stats').textContent=''; });
$('html-paste').addEventListener('click', async () => { $('html-input').value=await readClipboard(); });
$('html-copy').addEventListener('click', async () => { await copyText($('html-output').value); flash($('html-copy'),'Copied!'); });
$('html-copy-sm').addEventListener('click', async () => { await copyText($('html-output').value); flash($('html-copy-sm'),'✓'); });

/* ══════════════════════════════════════════
   4. Text Diff
══════════════════════════════════════════ */
(function initDiff() {
  makeResizer('diff-resizer','diff-inputs');
  renderTabBar('diff');
})();

function lcsBacktrack(a, b) {
  const m=a.length, n=b.length;
  const dp=Array.from({length:m+1},()=>new Uint32Array(n+1));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);
  const r=[]; let i=m,j=n;
  while (i>0||j>0) {
    if (i>0&&j>0&&a[i-1]===b[j-1]) { r.push({type:'equal',value:a[i-1]}); i--;j--; }
    else if (j>0&&(i===0||dp[i][j-1]>=dp[i-1][j])) { r.push({type:'add',value:b[j-1]}); j--; }
    else { r.push({type:'remove',value:a[i-1]}); i--; }
  }
  return r.reverse();
}

function renderDiff(original, modified, mode) {
  const container=$('diff-output'); container.innerHTML='';
  if (mode==='line') {
    const aL=original.split('\n'), bL=modified.split('\n');
    if (aL.length>5000||bL.length>5000) { container.innerHTML='<div class="empty-hint">Too many lines (max 5000)</div>'; return; }
    const ops=lcsBacktrack(aL,bL); let adds=0,rms=0,aNum=0,bNum=0;
    ops.forEach(op=>{
      const div=document.createElement('div'); div.className='diff-line '+(op.type==='add'?'add':op.type==='remove'?'remove':'equal');
      const num=document.createElement('span'); num.className='diff-line-num';
      const sign=document.createElement('span'); sign.className='diff-sign';
      const text=document.createElement('span'); text.className='diff-line-text'; text.textContent=op.value;
      if (op.type==='add') { sign.textContent='+'; bNum++; num.textContent=bNum; adds++; }
      else if (op.type==='remove') { sign.textContent='−'; aNum++; num.textContent=aNum; rms++; }
      else { sign.textContent=' '; aNum++;bNum++; num.textContent=aNum; }
      div.append(num,sign,text); container.appendChild(div);
    });
    $('diff-stats').textContent=`+${adds} −${rms}`;
    setStatus('diff-status-text',`${adds} addition${adds!==1?'s':''}, ${rms} deletion${rms!==1?'s':''}`,adds+rms?'err':'ok');
    addHistory({ tool:'diff', toolLabel:'Diff', operation:`Line diff  +${adds} −${rms}`,
      inputPreview: truncate(original.split('\n')[0]||''),
      tabData:{original,modified}
    });
  } else {
    const tokens=mode==='word'?[original.match(/\S+|\s+/g)||[],modified.match(/\S+|\s+/g)||[]]:[...[...original],[...modified]];
    const ops=lcsBacktrack(tokens[0],tokens[1]);
    const div=document.createElement('div'); div.className='diff-line'; div.style.flexWrap='wrap';
    let adds=0,rms=0;
    ops.forEach(op=>{ const s=document.createElement('span'); s.textContent=op.value; if(op.type==='add'){s.className='diff-word-add';adds++;}else if(op.type==='remove'){s.className='diff-word-rm';rms++;} div.appendChild(s); });
    container.appendChild(div);
    const unit=mode==='word'?'word':'char';
    $('diff-stats').textContent=`+${adds} −${rms} ${unit}s`;
    setStatus('diff-status-text',`${adds} added, ${rms} removed ${unit}s`,adds+rms?'err':'ok');
    addHistory({ tool:'diff', toolLabel:'Diff', operation:`${mode==='word'?'Word':'Char'} diff  +${adds} −${rms}`,
      inputPreview:truncate(original), tabData:{original,modified}
    });
  }
}

$('diff-compare').addEventListener('click', () => { renderDiff($('diff-original').value,$('diff-modified').value,$('diff-mode').value); });
$('diff-clear').addEventListener('click', () => {
  $('diff-original').value=''; $('diff-modified').value='';
  $('diff-output').innerHTML='<div class="empty-hint">Click Compare to see the diff</div>';
  $('diff-stats').textContent=''; setStatus('diff-status-text','Ready','');
});

/* ══════════════════════════════════════════
   5. Regex Tester
══════════════════════════════════════════ */
(function initRegex() {
  makeResizer('regex-resizer','regex-split');
  renderTabBar('regex');
  const ta=$('regex-input'), hl=$('regex-hl-layer');
  ta.addEventListener('scroll',()=>{ hl.scrollTop=ta.scrollTop; hl.scrollLeft=ta.scrollLeft; });
  ta.addEventListener('input', syncRegexHighlight);
  $('regex-pattern').addEventListener('input', syncRegexHighlight);
  $('regex-flags').addEventListener('input', syncRegexHighlight);
})();

function syncRegexHighlight() {
  const ta=$('regex-input'), hl=$('regex-hl-layer'), err=$('regex-error');
  const text=ta.value; err.style.display='none';
  const patStr=$('regex-pattern').value;
  if (!patStr) { hl.textContent=text; updateMatchPanel([]); return; }
  let re;
  try {
    const flags=$('regex-flags').value.replace(/[^gimsuy]/g,'');
    re=new RegExp(patStr,flags.includes('g')?flags:flags+'g');
  } catch(e) { err.textContent=e.message; err.style.display=''; hl.textContent=text; return; }

  const matches=[]; let m; re.lastIndex=0;
  while ((m=re.exec(text))!==null) {
    matches.push({index:m.index,end:m.index+m[0].length,value:m[0],groups:[...m].slice(1)});
    if (m[0].length===0) re.lastIndex++;
  }

  let html='',cursor=0;
  for (const match of matches) { html+=escapeHtml(text.slice(cursor,match.index)); html+=`<mark class="hl-match">${escapeHtml(match.value)}</mark>`; cursor=match.end; }
  html+=escapeHtml(text.slice(cursor));
  hl.innerHTML=html;

  $('regex-match-count').textContent=matches.length?`(${matches.length})`:'';
  setStatus('regex-status-text', matches.length?`${matches.length} match${matches.length!==1?'es':''} found`:'No matches', matches.length?'ok':'');
  updateMatchPanel(matches);

  if (matches.length) {
    addHistory({ tool:'regex', toolLabel:'Regex', operation:`${matches.length} match${matches.length!==1?'es':''}  /${$('regex-pattern').value}/${$('regex-flags').value}`,
      inputPreview: truncate(text),
      tabData:{pattern:$('regex-pattern').value,flags:$('regex-flags').value,input:text}
    });
  }
}

function updateMatchPanel(matches) {
  const panel=$('regex-matches');
  if (!matches.length) { panel.innerHTML='<div class="empty-hint" style="padding:16px;">No matches found</div>'; return; }
  panel.innerHTML='';
  matches.forEach((m,i)=>{
    const item=document.createElement('div'); item.className='match-item';
    const header=document.createElement('div'); header.className='match-header'; header.textContent=`Match ${i+1}  ·  index ${m.index}–${m.end}`;
    const val=document.createElement('div'); val.className='match-value'; val.textContent=JSON.stringify(m.value);
    item.append(header,val);
    if (m.groups?.length) {
      const gw=document.createElement('div'); gw.className='match-groups';
      m.groups.forEach((g,gi)=>{ const e=document.createElement('div'); e.className='match-group'; e.textContent=`Group ${gi+1}: ${g!==undefined?JSON.stringify(g):'undefined'}`; gw.appendChild(e); });
      item.appendChild(gw);
    }
    panel.appendChild(item);
  });
}

$('regex-test').addEventListener('click', syncRegexHighlight);
$('regex-clear').addEventListener('click', () => {
  $('regex-pattern').value=''; $('regex-flags').value='g'; $('regex-input').value='';
  $('regex-hl-layer').innerHTML='';
  $('regex-matches').innerHTML='<div class="empty-hint" style="padding:16px;">Enter a pattern and click Test</div>';
  $('regex-match-count').textContent=''; $('regex-error').style.display='none';
  setStatus('regex-status-text','Ready','');
});
