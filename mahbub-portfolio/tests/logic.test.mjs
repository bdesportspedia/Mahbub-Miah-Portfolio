import assert from 'node:assert/strict';
import { esc, safeUrl, embedUrl, csv, lines, icon, PLATFORM_KEYS } from '../src/lib/util.js';
import { renderSite, socRow } from '../src/public/view.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('PASS', name); };

t('esc escapes HTML', () => assert.equal(esc(`<img src=x onerror="a()">&'`), '&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;'));
t('safeUrl allows only http(s)', () => {
  assert.equal(safeUrl('javascript:alert(1)'), ''); assert.equal(safeUrl('data:text/html,x'), '');
  assert.equal(safeUrl('https://facebook.com/x'), 'https://facebook.com/x'); assert.equal(safeUrl(''), '');
});
t('embedUrl youtube/vimeo only', () => {
  assert.equal(embedUrl('https://www.youtube.com/watch?v=abcdefghijk'), 'https://www.youtube.com/embed/abcdefghijk');
  assert.equal(embedUrl('https://youtu.be/abcdefghijk'), 'https://www.youtube.com/embed/abcdefghijk');
  assert.equal(embedUrl('https://vimeo.com/123456789'), 'https://player.vimeo.com/video/123456789');
  assert.equal(embedUrl('https://evil.example/watch?v=abc'), '');
});
t('csv/lines', () => { assert.deepEqual(csv(' a, b ,,c'), ['a', 'b', 'c']); assert.deepEqual(lines('a\n\n b '), ['a', 'b']); });
t('every platform has an icon', () => PLATFORM_KEYS.forEach(p => assert.ok(icon(p).startsWith('<svg'))));

const model = {
  profile: { name: 'Mahbub <b>Miah</b>', titles: ['A'], bio: 'bio', phone: '', email: 'a@b.co', location: '', skills: ['X'], experience: '', education: '', photo: 'https://x.supabase.co/p.png', showSocialHero: true },
  work: [{ id: 'w1', title: '<script>x</script>', cat: 'Logo Design', desc: '', featured: true, img: 'https://x/a.png' }],
  videos: [{ id: 'v1', title: 'V', cat: 'Animation', desc: '', file: '', link: 'https://youtu.be/abcdefghijk', thumb: '' }],
  projects: [{ id: 'p1', name: 'P', desc: '', tech: ['a'], live: 'javascript:alert(1)', code: 'https://github.com/a/b', status: 'Live', cover: '', shots: [] }],
  social: [{ platform: 'facebook', name: '', url: 'https://facebook.com/x' }, { platform: 'custom', name: 'Bad', url: 'javascript:alert(1)' }],
  clients: [{ id: 'c1', name: 'Bangladesh Esports News', platform: 'Facebook News Channel', role: 'Designer', desc: 'd', descBn: 'বাংলা', url: 'https://www.facebook.com/BangladeshEshportsNews', items: [] }]
};
const html = renderSite(model);
t('no executable markup from data', () => { assert.ok(!html.includes('<script>x')); assert.ok(!/href=['"]javascript:/i.test(html)); });
t('sections present', () => ['id=\'work\'', 'id=\'videos\'', 'id=\'projects\'', 'id=\'services\'', 'id=\'about\'', 'id=\'contact\'', 'Visit Facebook Page'].forEach(s => assert.ok(html.includes(s), s)));
t('9 service cards', () => assert.equal((html.match(/class='c sv'/g) || []).length, 9));
t('hero/contact/footer socials, bad link dropped', () => { ['soc-h', 'soc-c', 'soc-f'].forEach(c => assert.ok(html.includes(c))); assert.equal((socRow(model.social, 'f').match(/<a /g) || []).length, 1); });
t('external links are safe', () => assert.ok([...html.matchAll(/<a [^>]*target='_blank'[^>]*>/g)].every(m => m[0].includes('noopener noreferrer'))));
t('hero social can be hidden', () => assert.ok(!renderSite({ ...model, profile: { ...model.profile, showSocialHero: false } }).includes('soc-h')));
t('no socials -> no empty icon row', () => assert.ok(!renderSite({ ...model, social: [] }).includes("class='soc")));
t('filter by category (non-featured item)', () => {
  const m2 = { ...model, work: [{ ...model.work[0], featured: false }] };
  assert.ok(renderSite(m2, { fw: 'Logo Design' }).includes("alt='&lt;script"));
  assert.ok(!renderSite(m2, { fw: 'Poster Design' }).includes("alt='&lt;script"));
});
console.log(`\n${n} tests passed`);
