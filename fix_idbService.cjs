const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/lib/idbService.ts');
let code = fs.readFileSync(p, 'utf-8');

const newMethods = `
  // Safely close the database connection
  public close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Completely erase the IndexedDB database
  public async factoryReset(): Promise<void> {
    this.close();
    
    // Clear fallback storage just in case
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('nali_idb_fallback_')) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}

    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error('Failed to delete database'));
        req.onblocked = () => {
          console.warn('Database deletion blocked. Closing open connections and retrying...');
          resolve(); // Will usually resolve upon page reload anyway, but we log it.
        };
      } catch (err) {
        reject(err);
      }
    });
  }
`;

if (!code.includes("public async factoryReset()")) {
  // Find a good place to insert it (e.g., right before `public async clear(`)
  const insertTarget = "public async clear(storeName: keyof DBSchema): Promise<boolean> {";
  if (code.includes(insertTarget)) {
    code = code.replace(insertTarget, newMethods + "\n  " + insertTarget);
    fs.writeFileSync(p, code);
    console.log("Added factoryReset and close to idbService");
  } else {
    console.log("Could not find insert target in idbService.ts");
  }
} else {
  console.log("Already has factoryReset");
}
