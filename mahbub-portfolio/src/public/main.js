import '../styles/site.css';
import { supabase, configured, publicUrl, BUCKETS as B } from '../lib/supabase.js';
import { embedUrl, safeUrl, esc } from '../lib/util.js';
import { renderSite } from './view.js';

const root = document.getElementById('root');
const lb = document.getElementById('lb');
const lbc = document.getElementById('lbc');
let model = null, filt = { fw: 'All', fv: 'All' }, ri = 0, timer = null;

const ord = q => q.order('display_order', { ascending: true }).order('created_at', { ascending: false });

async function load() {
  if (!configured) throw new Error('This site is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README).');
  const [pr, w, v, p, s, c, ci] = await Promise.all([
    supabase.from('profiles').select('*').limit(1).maybeSingle(),
    ord(supabase.from('portfolio_items').select('*').eq('published', true)),
    ord(supabase.from('videos').select('*').eq('published', true)),
    ord(supabase.from('projects').select('*').eq('published', true)),
    ord(supabase.from('social_links').select('*').eq('visible', true)),
    ord(supabase.from('featured_clients').select('*').eq('published', true)),
    ord(supabase.from('featured_client_items').select('*').eq('published', true))
  ]);
  const err = [pr, w, v, p, s, c, ci].find(r => r.error);
  if (err) throw new Error(err.error.message);
  const pf = pr.data || {};
  return {
    profile: {
      name: pf.name || 'Portfolio', titles: pf.titles || [], bio: pf.bio || '', phone: pf.phone || '', email: pf.email || '', location: pf.location || '',
      skills: pf.skills || [], experience: pf.experience || '', education: pf.education || '',
      photo: publicUrl(B.profile, pf.profile_photo), showSocialHero: pf.show_social_in_hero !== false
    },
    work: w.data.map(x => ({ id: x.id, title: x.title, cat: x.category, desc: x.description, featured: x.featured, img: publicUrl(B.images, x.image_path) })).filter(x => x.img),
    videos: v.data.map(x => ({ id: x.id, title: x.title, cat: x.category, desc: x.description, file: publicUrl(B.videos, x.video_path), link: x.external_url, thumb: publicUrl(B.thumbs, x.thumbnail_path) })),
    projects: p.data.map(x => ({ id: x.id, name: x.name, desc: x.description, tech: x.technology || [], live: x.live_url, code: x.source_url, status: x.status, cover: publicUrl(B.images, x.cover_path), shots: (x.screenshot_paths || []).map(z => publicUrl(B.images, z)) })),
    social: s.data.map(x => ({ platform: x.platform, name: x.display_name, url: x.profile_url })),
    clients: c.data.map(x => ({
      id: x.id, name: x.name, platform: x.platform, role: x.role, desc: x.description, descBn: x.description_bn, url: x.external_url,
      items: ci.data.filter(i => i.client_id === x.id && i.image_path).map(i => ({ id: i.id, title: i.title, cat: i.category, desc: i.description, img: publicUrl(B.images, i.image_path) }))
    }))
  };
}

function draw() {
  const keep = ['cn', 'ce', 'cm'].map(id => (document.getElementById(id) || {}).value || '');
  root.innerHTML = renderSite(model, filt);
  ['cn', 'ce', 'cm'].forEach((id, i) => { const e = document.getElementById(id); if (e) e.value = keep[i]; });
  document.title = `${model.profile.name} — Creative Portfolio`;
  clearInterval(timer);
  const t = model.profile.titles;
  if (t.length > 1) timer = setInterval(() => {
    const e = document.getElementById('rot'); if (!e) return;
    ri = (ri + 1) % t.length; e.style.opacity = 0;
    setTimeout(() => { e.textContent = t[ri]; e.style.opacity = 1; }, 300);
  }, 2600);
}

function openLb(k, id) {
  let h = '';
  if (k === 'work') { const x = model.work.find(z => z.id === id); if (x) h = `<img src='${esc(x.img)}' alt='${esc(x.title)}'>`; }
  else if (k === 'cl') { const x = model.clients.flatMap(c => c.items).find(z => z.id === id); if (x) h = `<img src='${esc(x.img)}' alt='${esc(x.title)}'>`; }
  else if (k === 'proj') { const x = model.projects.find(z => z.id === id); if (x) h = [x.cover].concat(x.shots).filter(Boolean).map(u => `<img src='${esc(u)}' alt='${esc(x.name)}' style='margin-bottom:12px'>`).join(''); }
  else if (k === 'video') {
    const x = model.videos.find(z => z.id === id);
    if (x && x.file) h = `<video src='${esc(x.file)}' controls autoplay playsinline></video>`;
    else if (x && embedUrl(x.link)) h = `<iframe src='${esc(embedUrl(x.link))}' allow='autoplay; fullscreen; picture-in-picture' allowfullscreen title='${esc(x.title)}'></iframe>`;
    else if (x && safeUrl(x.link)) h = `<a class='btn' href='${esc(safeUrl(x.link))}' target='_blank' rel='noopener noreferrer'>Open video</a>`;
  }
  if (!h) return;
  lbc.innerHTML = h; lb.classList.add('open'); document.getElementById('lbx').focus();
}
function closeLb() { lb.classList.remove('open'); lbc.innerHTML = ''; }

function send() {
  const st = document.getElementById('cs'), say = (t, ok) => { st.textContent = t; st.className = 'fs ' + (ok ? 'ok' : 'er'); };
  const n = document.getElementById('cn').value.trim(), e = document.getElementById('ce').value.trim(), m = document.getElementById('cm').value.trim();
  if (!n || !e || !m) return say('Please fill in your name, email and message.', false);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return say('Please enter a valid email address.', false);
  const to = model.profile.email;
  if (!to) return say('The site owner has not added a contact email yet.', false);
  window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent('Portfolio enquiry from ' + n)}&body=${encodeURIComponent(m + '\n\n— ' + n + ' (' + e + ')')}`;
  say('Your email app should now open with the message filled in. Nothing has been sent yet: please press Send there.', true);
}

document.addEventListener('click', e => {
  if (e.target === lb) return closeLb();
  const t = e.target.closest('[data-a]'); if (!t) return;
  const a = t.dataset.a;
  if (a === 'filt') { if (t.dataset.k === 'work') filt.fw = t.dataset.v; else filt.fv = t.dataset.v; draw(); }
  else if (a === 'open') openLb(t.dataset.k, t.dataset.i);
  else if (a === 'send') send();
});
document.getElementById('lbx').addEventListener('click', closeLb);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLb();
  else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches("[data-a='open']")) { e.preventDefault(); e.target.click(); }
});

load().then(m => { model = m; draw(); }).catch(err => {
  console.error(err);
  root.innerHTML = `<div class='w'><div class='banner' role='alert'>Sorry, the portfolio could not be loaded right now. Please try again in a moment.</div></div>`;
});
