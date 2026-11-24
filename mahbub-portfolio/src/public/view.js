// Pure HTML rendering for the public site (no DOM, no Supabase) so it can be tested in Node.
import { esc, safeUrl, csv, lines, CATS, VCATS, SERVICES, PLATFORMS, icon } from '../lib/util.js';

export function socRow(list, k) {
  const L = (list || []).filter(s => safeUrl(s.url));
  if (!L.length) return '';
  return `<div class='soc soc-${k}'>${L.map(s => {
    const n = esc(s.name || PLATFORMS[s.platform] || 'Link');
    return `<a href='${esc(safeUrl(s.url))}' target='_blank' rel='noopener noreferrer' aria-label='${n}' data-tip='${n}'>${icon(s.platform)}${k === 'c' ? `<span>${n}</span>` : ''}</a>`;
  }).join('')}</div>`;
}

const chips = (list, cur, k) => `<div class='chips'>${['All'].concat(list).map(c => `<button class='chip${c === cur ? ' on' : ''}' data-a='filt' data-k='${k}' data-v='${esc(c)}'>${esc(c)}</button>`).join('')}</div>`;
const btnAttr = (k, id) => `data-a='open' data-k='${k}' data-i='${esc(id)}' tabindex='0' role='button'`;

export function renderSite(m, f = {}) {
  const p = m.profile, fw = f.fw || 'All', fv = f.fv || 'All';
  const wl = m.work.filter(x => fw === 'All' || x.cat === fw);
  const vl = m.videos.filter(x => fv === 'All' || x.cat === fv);
  const feat = m.work.filter(x => x.featured && x.img).slice(0, 4);
  const sk = csv(p.skills), ct = [];
  if (p.phone) ct.push(`<p><b>Phone</b><br>${esc(p.phone)}</p>`);
  if (p.email) ct.push(`<p><b>Email</b><br><a href='mailto:${esc(p.email)}'>${esc(p.email)}</a></p>`);
  if (p.location) ct.push(`<p><b>Location</b><br>${esc(p.location)}</p>`);
  const so = socRow(m.social, 'c');
  const exp = lines(p.experience), edu = lines(p.education);

  const hero = `<header class='hero' id='top'><div class='w'><div class='hg'><div><div class='eyebrow'>Creative Portfolio</div><h1>${esc(p.name)}</h1><div class='rot' id='rot'>${esc((p.titles && p.titles[0]) || '')}</div>${p.showSocialHero ? socRow(m.social, 'h') : ''}<p class='head'>Creative Vision. Digital Innovation. Endless Possibilities.</p><a class='btn' href='#work'>View Portfolio</a> <a class='btn g' href='#contact'>Contact</a></div>${p.photo ? `<div class='pt'><span class='glow'></span><span class='orb'></span><div class='disc'><svg class='geo' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid slice'><g fill='none' stroke='rgba(56,189,248,.35)' stroke-width='.35'><path d='M-5 78 L40 20 L70 78 Z'/><path d='M55 -5 L105 35 L70 60 Z'/><circle cx='82' cy='22' r='10'/><circle cx='14' cy='30' r='5'/><path d='M0 50 H30 M70 90 H100'/></g><g fill='rgba(56,189,248,.55)'><circle cx='20' cy='62' r='.9'/><circle cx='26' cy='62' r='.9'/><circle cx='32' cy='62' r='.9'/><circle cx='88' cy='70' r='.9'/><circle cx='94' cy='70' r='.9'/></g></svg><i class='st s1'></i><i class='st s2'></i><img src='${esc(p.photo)}' alt='${esc(p.name)}'></div><span class='ring'></span></div>` : ''}</div>${feat.length ? `<div class='feat'>${feat.map(x => `<div class='c'><img class='t' src='${esc(x.img)}' alt='${esc(x.title)}' ${btnAttr('work', x.id)}></div>`).join('')}</div>` : ''}</div></header>`;

  const work = `<section id='work'><div class='w'><div class='eyebrow'>Portfolio</div><h2>My Creative Work</h2>${chips(CATS, fw, 'work')}<div class='mas'>${wl.map(x => `<div class='c'>${x.featured ? `<span class='ft'>Featured</span>` : ''}<img class='t' loading='lazy' src='${esc(x.img)}' alt='${esc(x.title)}' ${btnAttr('work', x.id)}><div class='m'><b>${esc(x.title)}</b><small>${esc(x.cat)}</small></div></div>`).join('')}</div>${wl.length ? '' : `<div class='empty'>${m.work.length ? 'Nothing in this category yet.' : 'New work is coming soon.'}</div>`}</div></section>`;

  const clients = m.clients.map(c => {
    const u = safeUrl(c.url);
    return `<section class='client'><div class='w'><div class='eyebrow'>Featured Client</div><div class='cc'><span class='tag'>${esc(c.platform)}</span><h2>${esc(c.name)}</h2><p><b>My role:</b> ${esc(c.role)}</p><p>${esc(c.desc)}</p>${c.descBn ? `<p class='bn'>${esc(c.descBn)}</p>` : ''}${u ? `<a class='btn' href='${esc(u)}' target='_blank' rel='noopener noreferrer'>Visit Facebook Page</a>` : ''}</div>${c.items.length ? `<div class='cg'>${c.items.map(x => `<div class='c'><img class='t' loading='lazy' src='${esc(x.img)}' alt='${esc(x.title)}' ${btnAttr('cl', x.id)}><div class='m'><b>${esc(x.title)}</b><small>${esc(x.cat)}</small><div class='d'>${esc(x.desc)}</div></div></div>`).join('')}</div>` : ''}</div></section>`;
  }).join('');

  const videos = `<section id='videos' style='background:var(--bg2)'><div class='w'><div class='eyebrow'>Video</div><h2>Video Portfolio</h2>${chips(VCATS, fv, 'videos')}<div class='vg'>${vl.map(x => `<div class='c'><div class='vt' ${btnAttr('video', x.id)} aria-label='Play ${esc(x.title)}'>${x.thumb ? `<img src='${esc(x.thumb)}' alt='' loading='lazy'>` : ''}<span class='play'>▶</span></div><div class='m'><b>${esc(x.title)}</b><small>${esc(x.cat)}</small><div class='d'>${esc(x.desc)}</div></div></div>`).join('')}</div>${vl.length ? '' : `<div class='empty'>${m.videos.length ? 'Nothing in this category yet.' : 'Videos are coming soon.'}</div>`}</div></section>`;

  const projects = `<section id='projects'><div class='w'><div class='eyebrow'>Build</div><h2>My Projects</h2><div class='pg'>${m.projects.map(x => {
    const live = safeUrl(x.live), code = safeUrl(x.code);
    return `<div class='c'>${x.cover ? `<img class='t' loading='lazy' src='${esc(x.cover)}' alt='${esc(x.name)}' ${btnAttr('proj', x.id)}>` : ''}<div class='m'><b>${esc(x.name)}</b> <span class='tag'>${esc(x.status)}</span><div class='d'>${esc(x.desc)}</div>${csv(x.tech).map(t => `<span class='tag'>${esc(t)}</span>`).join('')}<div style='margin-top:8px'>${live ? `<a class='btn s' href='${esc(live)}' target='_blank' rel='noopener noreferrer'>Live</a> ` : ''}${code ? `<a class='btn g s' href='${esc(code)}' target='_blank' rel='noopener noreferrer'>Source</a>` : ''}</div></div></div>`;
  }).join('')}</div>${m.projects.length ? '' : `<div class='empty'>Projects are coming soon.</div>`}</div></section>`;

  const services = `<section id='services' style='background:var(--bg2)'><div class='w'><div class='eyebrow'>Services</div><h2>What I Do</h2><div class='sg'>${SERVICES.map(s => `<div class='c sv'><div class='ico' aria-hidden='true'>${s[0]}</div><h3>${esc(s[1])}</h3><p>${esc(s[2])}</p><ul>${s[3].map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('')}</div></div></section>`;

  const about = `<section id='about'><div class='w'><div class='eyebrow'>About</div><h2>About Me</h2><div class='two'><div><p>${esc(p.bio)}</p>${sk.map(s => `<span class='tag'>${esc(s)}</span>`).join('')}</div><div>${exp.length ? `<div class='panel'><b>Experience</b><ul>${exp.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div><br>` : ''}${edu.length ? `<div class='panel'><b>Education</b><ul>${edu.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>` : ''}</div></div></div></section>`;

  const contact = `<section id='contact' style='background:var(--bg2)'><div class='w'><div class='eyebrow'>Contact</div><h2>Let’s work together</h2><div class='two'><div>${ct.join('')}${so ? `<p><b>${esc(p.name)}</b></p>` : ''}${so}</div><div class='panel'><label for='cn'>Name</label><input id='cn' autocomplete='name'><label for='ce'>Your email</label><input id='ce' type='email' autocomplete='email'><label for='cm'>Message</label><textarea id='cm' rows='4'></textarea><p><button class='btn' data-a='send'>Open in my email app</button></p><div class='fs' id='cs' role='status' aria-live='polite'></div></div></div></div></section>`;

  const nav = `<nav><div class='w'><a class='brand' href='#top'>${esc(p.name)}</a><div class='links'><a href='#work'>Work</a><a href='#videos'>Videos</a><a href='#projects'>Projects</a><a href='#services'>Services</a><a href='#about'>About</a><a href='#contact'>Contact</a></div></div></nav>`;
  const foot = `<footer><div class='w'><span>© ${new Date().getFullYear()} ${esc(p.name)}</span>${socRow(m.social, 'f')}</div></footer>`;
  return nav + hero + work + clients + videos + projects + services + about + contact + foot;
}
