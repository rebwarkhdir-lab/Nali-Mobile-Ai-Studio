const fs = require('fs');
const path = require('path');

const p1 = require('./translations_part1.cjs');
const p2 = require('./translations_part2.cjs');
const p3 = require('./translations_part3.cjs');
const p4 = require('./translations_part4.cjs');
const pModals = require('./translations_modals.cjs');

const allTranslations = {
  ...p1,
  ...p2,
  ...p3,
  ...p4,
  ...pModals
};

const enPath = path.resolve(__dirname, '../src/locales/en.json');
const kuPath = path.resolve(__dirname, '../src/locales/ku.json');

const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const kuJson = JSON.parse(fs.readFileSync(kuPath, 'utf8'));

function setNested(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

let enCount = 0;
let kuCount = 0;

for (const [keyPath, trans] of Object.entries(allTranslations)) {
  setNested(enJson, keyPath, trans.en);
  setNested(kuJson, keyPath, trans.ku);
  enCount++;
  kuCount++;
}

fs.writeFileSync(enPath, JSON.stringify(enJson, null, 2) + '\n', 'utf8');
fs.writeFileSync(kuPath, JSON.stringify(kuJson, null, 2) + '\n', 'utf8');

console.log(`Successfully merged ${enCount} keys into en.json and ${kuCount} keys into ku.json`);
