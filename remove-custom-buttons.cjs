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
  let newContent = content;

  // We are looking for: {someVar && ( <button ... title="Clear search" ... </button> )}
  // Let's use a very flexible regex
  const regex = /\{[a-zA-Z0-9_]+\s*&&\s*\(\s*<button[\s\S]*?title="Clear search"[\s\S]*?<\/button>\s*\)\}/g;
  
  if (regex.test(content)) {
    newContent = newContent.replace(regex, '');
    
    // Also remove the `X` import if it's unused. Or just let the linter complain/ignore it.
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    removedCount++;
  }
});

console.log("Removed from " + removedCount + " files.");
