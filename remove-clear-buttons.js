const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let removedCount = 0;

walkDir('./src', (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Match the exact structure I injected earlier
  const blockRegex = /\{[a-zA-Z0-9_]+Error\s*&&\s*\(\s*<button[\s\S]*?title="Clear search"[\s\S]*?<\/button>\s*\)\}/g;
  // Actually, I can use a simpler regex that matches {something && (<button ... title="Clear search" ... </button>)}
  const simpleRegex = /\{[a-zA-Z0-9_]+\s*&&\s*\(\s*<button[^>]+title="Clear search"[^>]*>[\s\S]*?<\/button>\s*\)\}/g;
  
  if (simpleRegex.test(content)) {
    content = content.replace(simpleRegex, '');
    fs.writeFileSync(filePath, content, 'utf8');
    removedCount++;
  }
});

console.log("Removed from " + removedCount + " files.");
