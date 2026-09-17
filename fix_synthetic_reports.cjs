const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/lib/reportService.ts');
let code = fs.readFileSync(p, 'utf-8');

const seedBlockStart = `    // 3. Ensure baseline realistic transactional data for past months so year/month/day analytics are comprehensive`;

if (code.includes(seedBlockStart)) {
    const lines = code.split('\n');
    let newLines = [];
    let skipping = false;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(seedBlockStart)) {
            skipping = true;
        }
        
        if (skipping) {
            // Find end of the seed block processing
            // It ends with: return sales.sort((a, b) => b.date.getTime() - a.date.getTime());
            if (lines[i].includes('return sales.sort(')) {
                skipping = false;
                newLines.push(lines[i]);
            }
        } else {
            newLines.push(lines[i]);
        }
    }
    
    fs.writeFileSync(p, newLines.join('\n'));
    console.log("Removed synthetic sales injection from reportService");
} else {
    console.log("Could not find synthetic sales injection");
}
