const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/profile-form/profile-form.component.html');
let html = fs.readFileSync(filePath, 'utf8');

const icon = (paths) =>
  `<span class="bg-pink-100 w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-pink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`;

const smallIcon = (paths) =>
  `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-pink-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const icons = {
  user: icon('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  pin: icon('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
  grad: icon('<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/>'),
  family: icon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  lock: icon('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  chat: icon('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  star: icon('<circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>'),
  camera: smallIcon('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>')
};

const stepIconPattern =
  /<span class="bg-pink-100 w-10 h-10 rounded-full flex items-center justify-center mr-3[^"]*">[\s\S]*?<\/span>/g;

const replacements = [
  { after: 'Basic information', icon: icons.user },
  { after: 'Contact & location', icon: icons.pin },
  { after: 'Education & career', icon: icons.grad },
  { after: 'Personal & spiritual information', icon: icons.star },
  { after: 'Family information', icon: icons.family },
  { after: 'About Yourself', icon: icons.chat },
  { after: 'Account security', icon: icons.lock }
];

for (const { after, icon: svg } of replacements) {
  const re = new RegExp(
    stepIconPattern.source +
      `\\s*\\n\\s*${after.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g'
  );
  html = html.replace(re, `${svg}\n          ${after}`);
}

html = html.replace(
  /\{\{\s*gender\s*===\s*'Male'\s*\?\s*'[^']*'\s*:\s*'[^']*'\s*\}\}\s*\{\{\s*gender\s*\}\}/g,
  '{{ gender }}'
);

html = html.replace(/<span class="text-xl">[\s\S]*?<\/span>/g, icons.camera);

html = html.replace(/â€¢/g, '·');
html = html.replace(/[^\x00-\x7F]+(?=\s*A thoughtful description)/g, 'Tip:');

html = html.replace(
  /<span class="text-2xl">[\s\S]*?<\/span>\s*\n\s*<label class="text-lg font-semibold text-pink-900">Smoking/g,
  `${smallIcon('<path d="M12 2v2"/><path d="M9 8h6l-1 12H10L9 8z"/>')}\n              <label class="text-lg font-semibold text-pink-900">Smoking`
);

html = html.replace(
  /<span class="text-2xl">[\s\S]*?<\/span>\s*\n\s*<label class="text-lg font-semibold text-pink-900">Alcoholic/g,
  `${smallIcon('<path d="M8 22h8"/><path d="M12 11v11"/><path d="M7 11h10l1-6H6l1 6z"/>')}\n              <label class="text-lg font-semibold text-pink-900">Alcoholic`
);

html = html.replace(
  /<span class="text-2xl">[\s\S]*?<\/span>\s*\n\s*<label class="text-lg font-semibold text-pink-900">Diet/g,
  `${smallIcon('<path d="M12 2a10 10 0 1 0 10 10"/><path d="M8 12h8"/>')}\n              <label class="text-lg font-semibold text-pink-900">Diet`
);

// Fallback: replace spans that still contain non-ASCII (mojibake)
html = html.replace(
  /<span class="bg-pink-100 w-10 h-10 rounded-full flex items-center justify-center mr-3[^"]*">([^<]*)<\/span>/g,
  (match, inner) => (/[^\x00-\x7F]/.test(inner) ? icons.user : match)
);

fs.writeFileSync(filePath, html.replace(/^\uFEFF/, ''), 'utf8');
console.log('Profile form HTML encoding fixed.');
