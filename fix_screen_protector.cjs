const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/lib/screenProtectorService.ts');
let code = fs.readFileSync(p, 'utf-8');

code = code.replace("this.groups = [...INITIAL_SCREEN_PROTECTORS];", "this.groups = [];");
code = code.replace("return INITIAL_SCREEN_PROTECTORS;", "return [];");
code = code.replace("this.groups = [...INITIAL_SCREEN_PROTECTORS];", "this.groups = [];");

fs.writeFileSync(p, code);
console.log("Fixed screenProtectorService.ts");
