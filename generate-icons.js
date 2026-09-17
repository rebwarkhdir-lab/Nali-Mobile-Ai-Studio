import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Create ultra-crisp SVG for the Nali POS / Store App Icon
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Outer Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0e1a"/>
      <stop offset="100%" stop-color="#05070d"/>
    </linearGradient>

    <!-- Subtle Edge Ring Gradient -->
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#312e81" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#4f46e5" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.5"/>
    </linearGradient>

    <!-- Soft Glow Filter -->
    <filter id="badgeShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.55"/>
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#4f46e5" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Canvas Base (iOS App Rounded Square background) -->
  <rect width="512" height="512" rx="114" fill="url(#bgGrad)"/>
  
  <!-- Subtle Outer Accent Border -->
  <rect x="6" y="6" width="500" height="500" rx="110" fill="none" stroke="url(#ringGrad)" stroke-width="4"/>

  <!-- Centered White Squircle Badge (Matches Nali POS Brand Identity) -->
  <rect x="76" y="76" width="360" height="360" rx="88" fill="#ffffff" filter="url(#badgeShadow)"/>

  <!-- Subtle Inner Inset Border on White Squircle -->
  <rect x="76" y="76" width="360" height="360" rx="88" fill="none" stroke="#e2e8f0" stroke-width="2"/>

  <!-- Bold High-Impact Monogram "NP" -->
  <text 
    x="256" 
    y="292" 
    font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', sans-serif" 
    font-size="180" 
    font-weight="900" 
    letter-spacing="-6"
    text-anchor="middle" 
    fill="#090d16"
  >NP</text>

  <!-- Live Terminal Active Indicator (Emerald Dot in top-right of the squircle) -->
  <circle cx="380" cy="132" r="16" fill="#10b981"/>
  <circle cx="380" cy="132" r="10" fill="#34d399"/>
</svg>
`.trim();

async function generate() {
  const publicDir = path.resolve('public');
  
  // Write SVG
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);
  console.log('Wrote public/icon.svg');

  const svgBuffer = Buffer.from(svgIcon);

  // 1. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated public/apple-touch-icon.png (180x180)');

  // 2. pwa-192x192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Generated public/pwa-192x192.png (192x192)');

  // 3. pwa-512x512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Generated public/pwa-512x512.png (512x512)');

  // 4. pwa-maskable-512x512.png (padded for safe zone)
  const maskableSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" fill="#070913"/>
    <g transform="scale(0.8) translate(64, 64)">
      <rect x="76" y="76" width="360" height="360" rx="88" fill="#ffffff"/>
      <text 
        x="256" 
        y="292" 
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', sans-serif" 
        font-size="180" 
        font-weight="900" 
        letter-spacing="-6"
        text-anchor="middle" 
        fill="#090d16"
      >NP</text>
      <circle cx="380" cy="132" r="16" fill="#10b981"/>
      <circle cx="380" cy="132" r="10" fill="#34d399"/>
    </g>
  </svg>
  `.trim();

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Generated public/pwa-maskable-512x512.png (512x512 maskable)');
}

generate().catch(err => {
  console.error('Generation error:', err);
  process.exit(1);
});
