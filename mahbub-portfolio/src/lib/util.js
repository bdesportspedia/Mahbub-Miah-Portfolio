export const CATS = ['Graphic Design', 'Logo Design', 'Poster Design', 'Banner Design', 'YouTube Thumbnail', 'Social Media Design', 'UI/UX Design', 'Photo Editing', 'AI Image Creation', 'Other Creative Works'];
export const VCATS = ['Video Editing', 'Promotional Videos', 'Motion Graphics', 'Animation', 'AI Videos', 'Social Media Videos', 'Other Video Projects'];
export const STATUSES = ['Live', 'In progress', 'Concept', 'Archived'];

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const csv = s => (Array.isArray(s) ? s : String(s || '').split(',')).map(x => String(x).trim()).filter(Boolean);
export const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);

// Only http(s) links are ever rendered as links.
export function safeUrl(u) {
  try {
    const x = new URL(String(u || '').trim());
    return /^https?:$/.test(x.protocol) ? x.href : '';
  } catch (e) { return ''; }
}

export function embedUrl(u) {
  u = String(u || '');
  let m = u.match(/(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (m) return 'https://www.youtube.com/embed/' + m[1];
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? 'https://player.vimeo.com/video/' + m[1] : '';
}

export const PLATFORMS = { facebook: 'Facebook', youtube: 'YouTube', instagram: 'Instagram', linkedin: 'LinkedIn', behance: 'Behance', dribbble: 'Dribbble', tiktok: 'TikTok', x: 'X (Twitter)', github: 'GitHub', whatsapp: 'WhatsApp', pinterest: 'Pinterest', website: 'Website', custom: 'Custom Link' };
export const PLATFORM_KEYS = Object.keys(PLATFORMS);

const IP = {
  facebook: `<path d='M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z'/>`,
  youtube: `<path d='M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17'/><path d='m10 15 5-3-5-3z'/>`,
  instagram: `<rect width='20' height='20' x='2' y='2' rx='5'/><path d='M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z'/><path d='M17.5 6.5h.01'/>`,
  linkedin: `<path d='M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z'/><rect width='4' height='12' x='2' y='9'/><circle cx='4' cy='4' r='2'/>`,
  github: `<path d='M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4'/><path d='M9 18c-4.51 2-5-2-7-2'/>`,
  x: `<path d='M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z'/>`,
  dribbble: `<circle cx='12' cy='12' r='10'/><path d='M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94'/><path d='M21.75 12.84c-6.62-1.41-12.14 1-16.38 6.32'/><path d='M8.56 2.75c4.37 6 6 9.42 8 17.72'/>`,
  website: `<circle cx='12' cy='12' r='10'/><path d='M2 12h20'/><path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/>`,
  custom: `<path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/><path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/>`
};
const LT = { behance: 'Be', tiktok: 'Tk', whatsapp: 'Wa', pinterest: 'Pi' };

export function icon(p) {
  if (LT[p]) return `<svg viewBox='0 0 24 24' aria-hidden='true'><text x='12' y='16' text-anchor='middle' font-size='11' font-weight='700' fill='currentColor' font-family='Inter,sans-serif'>${LT[p]}</text></svg>`;
  return `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>${IP[p] || IP.custom}</svg>`;
}

export const SERVICES = [
  ['🎨', 'Graphic Design', 'Professional graphic design, creative visual content, branding materials and digital graphics.', ['Branding', 'Visual content', 'Digital graphics']],
  ['📱', 'Social Media Design', 'Facebook posts, social media creatives, promotional banners and branded content.', ['Facebook posts', 'Creatives', 'Banners']],
  ['🖼️', 'Poster & Banner Design', 'Event posters, promotional banners, educational posters and advertising materials.', ['Event posters', 'Promo banners', 'Ad materials']],
  ['🎬', 'Video Editing', 'Professional video editing, storytelling, transitions, effects and social media video content.', ['Storytelling', 'Transitions', 'Effects']],
  ['✨', 'Motion Graphics', 'Animated titles, motion visuals, promotional animations and engaging video elements.', ['Animated titles', 'Promo animation', 'Motion visuals']],
  ['🤖', 'AI Image & Video Creation', 'AI-powered visual creation, image generation, creative concepts and AI video content.', ['AI images', 'AI video', 'Concepts']],
  ['📷', 'Photo Editing', 'Image enhancement, retouching, background removal and creative photo manipulation.', ['Retouching', 'Background removal', 'Enhancement']],
  ['🌐', 'Digital Content Creation', 'Creative content for digital platforms, online campaigns and media publishing.', ['Online campaigns', 'Media publishing', 'Platform content']],
  ['💻', 'Computer & Office Support', 'Microsoft Office, document formatting, computer operations and basic IT support.', ['Microsoft Office', 'Formatting', 'Basic IT support']]
];
