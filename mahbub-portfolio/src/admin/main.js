import '../styles/admin.css';
import { supabase, configured, publicUrl, BUCKETS as B } from '../lib/supabase.js';
import { esc, csv, safeUrl, embedUrl, CATS, VCATS, STATUSES, PLATFORMS, PLATFORM_KEYS } from '../lib/util.js';
import { uploadFile, removeFiles } from './upload.js';

const app = document.getElementById('app');
const $ = id => document.getElementById(id);
let uid = null, tab = 'overview', ctx = null;

/* ---------- entities (what each manager edits) ---------- */
const ENT = {
  designs: {
    table: 'portfolio_items', label: 'Design', name: 'title', thumb: ['image_path', B.images],
    fields: [
      { k: 'title', l: 'Title', t: 'text', req: 1 },
      { k: 'category', l: 'Category', t: 'select', o: CATS },
      { k: 'description', l: 'Description', t: 'textarea' },
      { k: 'image_path', l: 'Image (JPG, PNG or WebP)', t: 'file', bucket: B.images, kind: 'image', req: 1 },
      { k: 'featured', l: 'Featured (shown on the home page)', t: 'check' },
      { k: 'published', l: 'Published (visible to everyone)', t: 'check' }
    ]
  },
  videos: {
    table: 'videos', label: 'Video', name: 'title', thumb: ['thumbnail_path', B.thumbs],
    fields: [
      { k: 'title', l: 'Title', t: 'text', req: 1 },
      { k: 'category', l: 'Category', t: 'select', o: VCATS },
      { k: 'description', l: 'Description', t: 'textarea' },
      { k: 'external_url', l: 'YouTube or Vimeo link (use this for very large videos)', t: 'url' },
      { k: 'video_path', l: 'OR upload an MP4 / WebM video', t: 'file', bucket: B.videos, kind: 'video' },
      { k: 'thumbnail_path', l: 'Thumbnail image (optional)', t: 'file', bucket: B.thumbs, kind: 'image' },
      { k: 'published', l: 'Published (visible to everyone)', t: 'check' }
    ],
    check(p) {
      if (!p.video_path && !p.external_url) throw new Error('Add a video file or a YouTube/Vimeo link.');
      if (p.external_url && !embedUrl(p.external_url)) throw new Error('The link must be a YouTube or Vimeo video link.');
    }
  },
  projects: {
    table: 'projects', label: 'Project', name: 'name', thumb: ['cover_path', B.images],
    fields: [
      { k: 'name', l: 'Project name', t: 'text', req: 1 },
      { k: 'description', l: 'Description', t: 'textarea' },
      { k: 'technology', l: 'Technology used (comma separated)', t: 'csv' },
      { k: 'live_url', l: 'Live project URL', t: 'url' },
      { k: 'source_url', l: 'Source code URL (optional)', t: 'url' },
      { k: 'status', l: 'Status', t: 'select', o: STATUSES },
      { k: 'cover_path', l: 'Cover image', t: 'file', bucket: B.images, kind: 'image' },
      { k: 'screenshot_paths', l: 'Screenshots (you can pick several)', t: 'files', bucket: B.images, kind: 'image' },
      { k: 'published', l: 'Published (visible to everyone)', t: 'check' }
    ]
  },
  clients: {
    table: 'featured_clients', label: 'Featured client', name: 'name', thumb: ['cover_image_path', B.images], hasItems: true,
    fields: [
      { k: 'name', l: 'Client / page name', t: 'text', req: 1 },
      { k: 'platform', l: 'Platform', t: 'text' },
      { k: 'role', l: 'My role', t: 'text' },
      { k: 'description', l: 'Description (English)', t: 'textarea' },
      { k: 'description_bn', l: 'বর্ণনা (বাংলা)', t: 'textarea' },
      { k: 'external_url', l: 'Facebook page / website link', t: 'url' },
      { k: 'cover_image_path', l: 'Cover image (optional)', t: 'file', bucket: B.images, kind: 'image' },
      { k: 'published', l: 'Published (visible to everyone)', t: 'check' }
    ]
  },
  items: {
    table: 'featured_client_items', label: 'Client design', name: 'title', thumb: ['image_path', B.images],
    fields: [
      { k: 'title', l: 'Title', t: 'text', req: 1 },
      { k: 'category', l: 'Category', t: 'select', o: CATS },
      { k: 'description', l: 'Description', t: 'textarea' },
      { k: 'image_path', l: 'Design image', t: 'file', bucket: B.images, kind: 'image', req: 1 },
      { k: 'published', l: 'Published (visible to everyone)', t: 'check' }
    ]
  },
  profile: {
    table: 'profiles', label: 'Profile', single: true,
    fields: [
      { k: 'name', l: 'Name', t: 'text', req: 1 },
      { k: 'titles', l: 'Animated titles (comma separated)', t: 'csv' },
      { k: 'bio', l: 'About me', t: 'textarea' },
      { k: 'skills', l: 'Skills (comma separated)', t: 'csv' },
      { k: 'experience', l: 'Experience (one item per line)', t: 'textarea' },
      { k: 'education', l: 'Education (one item per line)', t: 'textarea' },
      { k: 'phone', l: 'Phone', t: 'text' },
      { k: 'email', l: 'Email', t: 'email' },
      { k: 'location', l: 'Location', t: 'text' },
      { k: 'profile_photo', l: 'Profile photo (a PNG with transparent background looks best)', t: 'file', bucket: B.profile, kind: 'image', keep: true },
      { k: 'show_social_in_hero', l: 'Show social icons in the home page header', t: 'check' }
    ]
  }
};

/* ---------- small helpers ---------- */
function toast(msg, bad) {
  const d = document.createElement('div'); d.textContent = msg; if (bad) d.className = 'er';
  $('toast').appendChild(d); setTimeout(() => d.remove(), bad ? 7000 : 3500);
}
const banner = (m, c = 'er') => `<div class='msg ${c}' role='alert'>${esc(m)}</div>`;
function fail(e) {
  const m = (e && e.message) || String(e);
  if (/jwt|expired|not authenticated|invalid token/i.test(m)) { toast('Your session has expired. Please sign in again.', true); supabase.auth.signOut(); return; }
  if (/row-level security|permission denied|violates/i.test(m)) toast('Not allowed or invalid data: ' + m, true); else toast(m, true);
}
async function isAdmin(id) {
  const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', id).maybeSingle();
  return !error && !!data;
}
async function firstOrder(table, filter) {
  let q = supabase.from(table).select('display_order').order('display_order', { ascending: true }).limit(1);
  if (filter) q = q.eq(filter[0], filter[1]);
  const { data } = await q;
  return data && data.length ? data[0].display_order - 1 : 0;
}

/* ---------- auth screens ---------- */
function showLogin(note, bad) {
  uid = null;
  history.replaceState(null, '', '/admin/login');
  app.innerHTML = `<div class='login'><div class='box'><h2>Admin sign in</h2>${note ? banner(note, bad ? 'er' : 'ok') : ''}<form id='lf'><label for='em'>Email</label><input id='em' type='email' autocomplete='username' required><label for='pw'>Password</label><input id='pw' type='password' autocomplete='current-password' required><p><button class='btn p' type='submit' style='width:100%'>Sign in</button></p></form></div></div>`;
  $('lf').addEventListener('submit', async e => {
    e.preventDefault();
    const b = e.target.querySelector('button'); b.disabled = true;
    const { data, error } = await supabase.auth.signInWithPassword({ email: $('em').value.trim(), password: $('pw').value });
    if (error || !data.user) { b.disabled = false; return showLogin('Incorrect email or password.', true); }
    if (!(await isAdmin(data.user.id))) { await supabase.auth.signOut(); return showLogin('This account is not authorised to manage the portfolio.', true); }
    uid = data.user.id; shell();
  });
}

const TABS = [['overview', 'Overview'], ['designs', 'Designs'], ['videos', 'Videos'], ['projects', 'Projects'], ['clients', 'Featured Client'], ['social', 'Social Media'], ['profile', 'Profile'], ['import', 'Import']];
function shell() {
  history.replaceState(null, '', '/admin');
  app.innerHTML = `<div class='top'><b>Portfolio Admin</b><span><a class='btn s' href='/' target='_blank' rel='noopener'>View site</a> <button class='btn s' data-act='logout'>Sign out</button></span></div><nav class='tabs' aria-label='Sections'>${TABS.map(([k, l]) => `<button class='btn s${k === tab ? ' on' : ''}' data-tab='${k}'>${l}</button>`).join('')}</nav><main id='main'></main><div id='modal' class='modal' hidden></div>`;
  app.querySelector('main').addEventListener('click', onMain);
  app.querySelector('.tabs').addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) go(t.dataset.tab); });
  app.querySelector('.top').addEventListener('click', e => { if (e.target.closest('[data-act=logout]')) supabase.auth.signOut(); });
  go(tab);
}
function go(t) {
  tab = t; ctx = null;
  document.querySelectorAll('.tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  const m = $('main'); m.innerHTML = '<p class="hint">Loading…</p>';
  const v = { overview, designs: () => list('designs'), videos: () => list('videos'), projects: () => list('projects'), clients: () => list('clients'), social, profile, import: importView }[t];
  Promise.resolve(v()).catch(fail);
}

/* ---------- overview ---------- */
async function overview() {
  const n = (t, f) => { let q = supabase.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); return q.then(r => r.count ?? 0); };
  const [d, dp, v, p, c] = await Promise.all([n('portfolio_items'), n('portfolio_items', q => q.eq('published', true)), n('videos'), n('projects'), n('featured_clients')]);
  const st = [['Total designs', d], ['Published designs', dp], ['Draft designs', d - dp], ['Total videos', v], ['Total projects', p], ['Featured clients', c]];
  $('main').innerHTML = `<h2>Overview</h2><div class='stats'>${st.map(([l, x]) => `<div class='stat'><b>${x}</b>${l}</div>`).join('')}</div><p class='hint'>New uploads start as drafts. Open a section and press Publish when you are ready. Visitors see changes straight away, with no redeploy.</p>`;
}

/* ---------- generic list manager ---------- */
async function list(key, opts = {}) {
  const ent = ENT[key];
  let q = supabase.from(ent.table).select('*');
  if (opts.filter) q = q.eq(opts.filter[0], opts.filter[1]);
  const { data, error } = await q.order('display_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) { $('main').innerHTML = banner(error.message); return; }
  ctx = { key, opts, rows: data };
  const pub = ent.fields.some(f => f.k === 'published');
  $('main').innerHTML = `${opts.back ? `<button class='btn s' data-act='back'>← Back to featured clients</button>` : ''}<h2>${opts.title || ent.label + 's'}</h2><div class='bar'><button class='btn p' data-act='new'>+ Add ${ent.label.toLowerCase()}</button>${key === 'designs' ? `<button class='btn' data-act='multi'>Upload many images</button><input id='multi' type='file' accept='image/jpeg,image/png,image/webp' multiple hidden>` : ''}</div><div id='prog' class='prog'></div>${data.length ? data.map((r, i) => {
    const th = ent.thumb && r[ent.thumb[0]] ? `<img src='${esc(publicUrl(ent.thumb[1], r[ent.thumb[0]]))}' alt='' loading='lazy'>` : 'No image';
    return `<div class='row'><div class='th'>${th}</div><div><b>${esc(r[ent.name])}</b>${pub ? `<span class='pill ${r.published ? 'ok' : 'dr'}'>${r.published ? 'Published' : 'Draft'}</span>` : ''}${r.featured ? `<span class='pill'>Featured</span>` : ''}${r.category ? `<span class='pill'>${esc(r.category)}</span>` : ''}</div><div class='acts'><button class='btn s' data-act='edit' data-id='${r.id}'>Edit</button>${pub ? `<button class='btn s' data-act='pub' data-id='${r.id}'>${r.published ? 'Unpublish' : 'Publish'}</button>` : ''}${ent.hasItems ? `<button class='btn s' data-act='items' data-id='${r.id}'>Designs</button>` : ''}<button class='btn s' data-act='up' data-i='${i}' aria-label='Move up'>↑</button><button class='btn s' data-act='dn' data-i='${i}' aria-label='Move down'>↓</button><button class='btn s d' data-act='del' data-id='${r.id}'>Delete</button></div></div>`;
  }).join('') : `<p class='hint'>Nothing here yet.</p>`}`;
  const mi = $('multi'); if (mi) mi.addEventListener('change', () => multiUpload(mi.files));
}

async function onMain(e) {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act, id = t.dataset.id;
  try {
    if (a === 'new') return openForm(ctx.key, null, ctx.opts);
    if (a === 'multi') return $('multi').click();
    if (a === 'back') return go('clients');
    const row = ctx && ctx.rows.find(r => r.id === id);
    if (a === 'edit') return openForm(ctx.key, row, ctx.opts);
    if (a === 'items') return list('items', { filter: ['client_id', id], extra: { client_id: id }, title: 'Designs for ' + row.name, back: true });
    if (a === 'pub') { const { error } = await supabase.from(ENT[ctx.key].table).update({ published: !row.published }).eq('id', id); if (error) throw error; toast(row.published ? 'Unpublished' : 'Published'); return list(ctx.key, ctx.opts); }
    if (a === 'up' || a === 'dn') return move(+t.dataset.i, a === 'up' ? -1 : 1);
    if (a === 'del') return remove(row);
    if (a === 'sadd' || a === 'sdel' || a === 'sup' || a === 'sdn' || a === 'ssave') return socialAction(a, +t.dataset.j);
    if (a === 'runimport') return runImport();
  } catch (err) { fail(err); }
}

async function move(i, d) {
  const { key, rows } = ctx, j = i + d; if (j < 0 || j >= rows.length) return;
  const a = rows.slice(); [a[i], a[j]] = [a[j], a[i]];
  const res = await Promise.all(a.map((r, n) => r.display_order === n ? null : supabase.from(ENT[key].table).update({ display_order: n }).eq('id', r.id)).filter(Boolean));
  const bad = res.find(r => r.error); if (bad) throw bad.error;
  list(key, ctx.opts);
}

async function remove(row) {
  const { key } = ctx, ent = ENT[key];
  if (!confirm(`Delete "${row[ent.name]}" permanently? This also deletes its uploaded files.`)) return;
  const files = [];
  ent.fields.forEach(f => { if (f.t === 'file' && row[f.k]) files.push([f.bucket, row[f.k]]); if (f.t === 'files') (row[f.k] || []).forEach(p => files.push([f.bucket, p])); });
  if (ent.hasItems) { const { data } = await supabase.from('featured_client_items').select('image_path').eq('client_id', row.id); (data || []).forEach(x => files.push([B.images, x.image_path])); }
  const { error } = await supabase.from(ent.table).delete().eq('id', row.id);
  if (error) throw error;
  await removeFiles(files);
  toast('Deleted'); list(key, ctx.opts);
}

/* ---------- add / edit form ---------- */
function fieldHtml(f, row) {
  const v = row ? row[f.k] : undefined, id = 'f_' + f.k;
  const lab = `<label for='${id}'>${esc(f.l)}${f.req ? ' *' : ''}</label>`;
  if (f.t === 'check') return `<label class='k'><input type='checkbox' id='${id}' name='${f.k}' ${(row ? v : f.k !== 'published' && f.k !== 'featured') ? 'checked' : ''}> ${esc(f.l)}</label>`;
  if (f.t === 'select') return `${lab}<select id='${id}' name='${f.k}'>${f.o.map(o => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  if (f.t === 'textarea') return `${lab}<textarea id='${id}' name='${f.k}' rows='${f.k === 'bio' || f.k === 'experience' || f.k === 'education' ? 6 : 3}'>${esc(v)}</textarea>`;
  if (f.t === 'csv') return `${lab}<input id='${id}' name='${f.k}' value='${esc((v || []).join(', '))}'>`;
  if (f.t === 'url') return `${lab}<input id='${id}' name='${f.k}' type='url' inputmode='url' placeholder='https://' value='${esc(v)}'>`;
  if (f.t === 'email') return `${lab}<input id='${id}' name='${f.k}' type='email' value='${esc(v)}'>`;
  if (f.t === 'file') return `${lab}<input id='${id}' name='${f.k}' type='file' accept='${f.kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'}'>${v ? (f.kind === 'video' ? `<p class='hint'>A video is already uploaded. Choose a file to replace it.</p>` : `<div class='prev'><img src='${esc(publicUrl(f.bucket, v))}' alt='Current'></div><p class='hint'>Current file shown. Choose a new one to replace it.</p>`) : ''}`;
  if (f.t === 'files') return `${lab}<input id='${id}' name='${f.k}' type='file' accept='image/jpeg,image/png,image/webp' multiple>${(v || []).length ? `<div class='prev'>${v.map(p => `<label><img src='${esc(publicUrl(f.bucket, p))}' alt=''><br><input type='checkbox' data-rm='${f.k}' value='${esc(p)}'> remove</label>`).join('')}</div>` : ''}`;
  return `${lab}<input id='${id}' name='${f.k}' value='${esc(v)}'>`;
}

function openForm(key, row, opts = {}) {
  const ent = ENT[key], m = $('modal');
  m.innerHTML = `<div class='box'><h3>${row || ent.single ? 'Edit' : 'Add'} ${ent.label.toLowerCase()}</h3><form id='ef' novalidate>${ent.fields.map(f => fieldHtml(f, row)).join('')}<div class='prog' id='fp' aria-live='polite'></div><div class='bar'><button class='btn p' type='submit'>Save</button><button class='btn' type='button' data-close>Cancel</button></div></form></div>`;
  m.hidden = false; m.scrollTop = 0;
  m.querySelector('[data-close]').onclick = closeForm;
  $('ef').addEventListener('submit', async e => { e.preventDefault(); await submitForm(ent, key, row, e.target, opts); });
}
function closeForm() { const m = $('modal'); if (m) { m.hidden = true; m.innerHTML = ''; } }

function progress(el) {
  return (pct, name) => { el.innerHTML = `Uploading ${esc(name)}… ${pct}%<progress max='100' value='${pct}'></progress>`; };
}

async function submitForm(ent, key, row, form, opts) {
  const btn = form.querySelector('[type=submit]'), fp = $('fp'), onP = progress(fp);
  btn.disabled = true; fp.textContent = '';
  const uploaded = [], old = []; let dbDone = false;
  try {
    const p = Object.assign({}, opts.extra || {});
    for (const f of ent.fields) {
      const el = form.elements[f.k];
      if (f.t === 'check') p[f.k] = el.checked;
      else if (f.t === 'csv') p[f.k] = csv(el.value);
      else if (f.t === 'select') p[f.k] = el.value;
      else if (f.t === 'url') { const v = el.value.trim(); if (v && !safeUrl(v)) throw new Error(`${f.l}: please enter a full link starting with https://`); p[f.k] = v ? safeUrl(v) : null; }
      else if (f.t === 'email') { const v = el.value.trim(); if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error('Please enter a valid email address.'); p[f.k] = v || null; }
      else if (f.t === 'file') {
        const file = el.files[0];
        if (file) { const path = await uploadFile(f.bucket, file, { kind: f.kind, keep: f.keep, onProgress: onP }); uploaded.push([f.bucket, path]); if (row && row[f.k]) old.push([f.bucket, row[f.k]]); p[f.k] = path; }
        else if (f.req && !(row && row[f.k])) throw new Error(`${f.l} is required.`);
      }
      else if (f.t === 'files') {
        const rm = [...form.querySelectorAll(`input[data-rm='${f.k}']:checked`)].map(i => i.value);
        const keepList = ((row && row[f.k]) || []).filter(x => !rm.includes(x)); rm.forEach(x => old.push([f.bucket, x]));
        for (const file of el.files) { const path = await uploadFile(f.bucket, file, { kind: f.kind, onProgress: onP }); uploaded.push([f.bucket, path]); keepList.push(path); }
        p[f.k] = keepList;
      }
      else { const v = el.value.trim(); if (f.req && !v) throw new Error(`${f.l} is required.`); p[f.k] = v || null; }
    }
    if (ent.check) ent.check(p);
    fp.textContent = 'Saving…';
    let res;
    if (ent.single) res = await supabase.from(ent.table).upsert(Object.assign({ id: 1 }, p));
    else if (row) res = await supabase.from(ent.table).update(p).eq('id', row.id);
    else { p.display_order = await firstOrder(ent.table, opts.filter); res = await supabase.from(ent.table).insert(p); }
    if (res.error) throw res.error;
    dbDone = true;
    await removeFiles(old);
    closeForm(); toast('Saved');
    if (opts.filter) list(key, opts); else go(tab);
  } catch (err) {
    if (!dbDone) await removeFiles(uploaded);
    fp.innerHTML = banner(err.message || String(err));
    btn.disabled = false; if (/jwt|expired|not authenticated/i.test(err.message || '')) fail(err);
  }
}

async function multiUpload(files) {
  const el = $('prog'), onP = progress(el); let n = 0, base = await firstOrder('portfolio_items');
  for (const file of files) {
    try {
      const path = await uploadFile(B.images, file, { kind: 'image', onProgress: onP });
      const { error } = await supabase.from('portfolio_items').insert({ title: file.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Untitled', category: 'Graphic Design', image_path: path, published: false, display_order: base - n });
      if (error) { await removeFiles([[B.images, path]]); throw error; }
      n++;
    } catch (err) { toast(err.message || String(err), true); }
  }
  toast(`${n} draft design(s) created. Edit titles and categories, then Publish.`); list('designs');
}

/* ---------- profile ---------- */
async function profile() {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', 1).maybeSingle();
  if (error) { $('main').innerHTML = banner(error.message); return; }
  const ent = ENT.profile;
  $('main').innerHTML = `<h2>Profile</h2><form id='pf' novalidate>${ent.fields.map(f => fieldHtml(f, data || { show_social_in_hero: true })).join('')}<div class='prog' id='fp' aria-live='polite'></div><div class='bar'><button class='btn p' type='submit'>Save profile</button></div></form>`;
  $('pf').addEventListener('submit', async e => { e.preventDefault(); await submitForm(ent, 'profile', data, e.target, {}); });
}

/* ---------- social media manager ---------- */
let D = [], origIds = [];
async function social() {
  const { data, error } = await supabase.from('social_links').select('*').order('display_order').order('created_at');
  if (error) { $('main').innerHTML = banner(error.message); return; }
  D = data.map(r => ({ id: r.id, platform: r.platform, name: r.display_name || '', url: r.profile_url, show: r.visible })); origIds = D.map(r => r.id);
  socialDraw();
}
function socialDraw() {
  $('main').innerHTML = `<h2>Social media</h2><p class='hint'>Hidden links are not shown on the public site.</p><div id='sl'>${D.length ? D.map((s, j) => `<div class='sr'><select data-sf='platform' data-j='${j}' aria-label='Platform'>${PLATFORM_KEYS.map(p => `<option value='${p}' ${s.platform === p ? 'selected' : ''}>${PLATFORMS[p]}</option>`).join('')}</select><input data-sf='name' data-j='${j}' placeholder='Display name (optional)' value='${esc(s.name)}' aria-label='Display name'><input class='full' data-sf='url' data-j='${j}' type='url' inputmode='url' placeholder='https://…' value='${esc(s.url)}' aria-label='Profile URL'><div class='acts'><label class='k'><input type='checkbox' data-sf='show' data-j='${j}' ${s.show ? 'checked' : ''}> Show</label><button class='btn s' data-act='sup' data-j='${j}' aria-label='Move up'>↑</button><button class='btn s' data-act='sdn' data-j='${j}' aria-label='Move down'>↓</button><button class='btn s d' data-act='sdel' data-j='${j}'>Delete</button></div></div>`).join('') : `<p class='hint'>No social links yet.</p>`}</div><div class='bar'><button class='btn' data-act='sadd'>+ Add link</button><button class='btn p' data-act='ssave'>Save changes</button></div><div id='fp'></div>`;
  $('sl').addEventListener('input', e => { const f = e.target.dataset.sf; if (!f) return; const s = D[+e.target.dataset.j]; if (s) s[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; });
}
async function socialAction(a, j) {
  if (a === 'sadd') { D.push({ id: null, platform: 'facebook', name: '', url: '', show: true }); return socialDraw(); }
  if (a === 'sdel') { D.splice(j, 1); return socialDraw(); }
  if (a === 'sup' || a === 'sdn') { const n = a === 'sup' ? j - 1 : j + 1; if (n >= 0 && n < D.length) { [D[j], D[n]] = [D[n], D[j]]; socialDraw(); } return; }
  const rows = [];
  for (let i = 0; i < D.length; i++) {
    let u = String(D[i].url || '').trim();
    if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
    const su = safeUrl(u);
    if (!su) { $('fp').innerHTML = banner(`Link ${i + 1}: enter a valid https:// address (or delete the row).`); return; }
    rows.push({ id: D[i].id, p: { platform: D[i].platform, display_name: D[i].name.trim() || null, profile_url: su, icon: D[i].platform, visible: !!D[i].show, display_order: i } });
  }
  const del = origIds.filter(id => !rows.some(r => r.id === id));
  for (const id of del) { const { error } = await supabase.from('social_links').delete().eq('id', id); if (error) throw error; }
  for (const r of rows) { const { error } = r.id ? await supabase.from('social_links').update(r.p).eq('id', r.id) : await supabase.from('social_links').insert(r.p); if (error) throw error; }
  toast('Social links saved'); social();
}

/* ---------- import of the old Claude page content ---------- */
function importView() {
  $('main').innerHTML = `<h2>Import existing content</h2><p>This copies the text and profile photo from your old Claude Artifact page, and adds the Bangladesh Esports News featured client. It asks before overwriting anything and never deletes data.</p><p class='hint'>Designs, videos or projects uploaded to the old page cannot be copied automatically. Download those files from the old page and add them with the Designs / Videos / Projects sections.</p><div class='bar'><button class='btn p' data-act='runimport'>Run import</button></div><pre class='log' id='lg'>Ready.</pre>`;
}
async function runImport() {
  const lg = $('lg'), say = t => { lg.textContent += '\n' + t; };
  lg.textContent = 'Starting…';
  const res = await fetch('/import/existing-data.json'); if (!res.ok) throw new Error('Import data file not found (public/import/existing-data.json).');
  const d = await res.json(), p = d.profile;
  const { data: cur, error: ce } = await supabase.from('profiles').select('*').eq('id', 1).maybeSingle(); if (ce) throw ce;
  if (!cur || !cur.name || confirm(`A profile named "${cur.name}" already exists. Overwrite its text with the old page text?`)) {
    const { error } = await supabase.from('profiles').upsert({ id: 1, name: p.name, titles: p.titles || [], bio: p.bio || null, phone: p.phone || null, email: p.email || null, location: p.location || null, skills: csv(p.skills), experience: p.exp || null, education: p.edu || null });
    if (error) throw error; say('✔ Profile text imported.');
  } else say('– Profile text kept as it is.');
  if (!cur || !cur.profile_photo || confirm('A profile photo already exists. Replace it with the old page photo?')) {
    const r = await fetch('/import/profile.png');
    if (r.ok) {
      const file = new File([await r.blob()], 'profile.png', { type: 'image/png' });
      const path = await uploadFile(B.profile, file, { kind: 'image', keep: true });
      const { error } = await supabase.from('profiles').update({ profile_photo: path }).eq('id', 1);
      if (error) { await removeFiles([[B.profile, path]]); throw error; }
      if (cur && cur.profile_photo) await removeFiles([[B.profile, cur.profile_photo]]);
      say('✔ Profile photo uploaded.');
    } else say('✖ Profile photo file not found.');
  } else say('– Profile photo kept as it is.');
  const c = d.client;
  const { data: ex } = await supabase.from('featured_clients').select('id').eq('external_url', c.external_url).limit(1);
  if (ex && ex.length) say('– Featured client already exists, skipped.');
  else {
    const { error } = await supabase.from('featured_clients').insert({ name: c.name, platform: c.platform, role: c.role, description: c.description, description_bn: c.description_bn, external_url: c.external_url, published: true, display_order: 0 });
    if (error) throw error; say('✔ Featured client added (published). Add your designs under Featured Client > Designs.');
  }
  const extra = ['work', 'videos', 'projects'].map(k => `${(d[k] || []).length} ${k}`).join(', ');
  say(`ℹ Old page had: ${extra}. Re-upload media for any of these manually.`);
  say('Done.'); toast('Import finished');
}

/* ---------- boot ---------- */
async function boot() {
  if (!configured) { app.innerHTML = `<div class='login'>${banner('Not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README), then rebuild.')}</div>`; return; }
  supabase.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && uid) showLogin('You have been signed out.', false); });
  const { data: { session } } = await supabase.auth.getSession();
  if (session && await isAdmin(session.user.id)) { uid = session.user.id; shell(); }
  else { if (session) await supabase.auth.signOut(); showLogin(); }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('modal') && !$('modal').hidden) closeForm(); });
boot();
