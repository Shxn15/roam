import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import { wrapSqlJs } from './sqljsDb';
import type { Db } from './types';

// Browser preview only (npm run dev in a normal browser): the same SQLite schema,
// kept in IndexedDB. The desktop app never loads this module.

const IDB_NAME = 'roam-preview';
const STORE = 'files';
const KEY = 'roam.db';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readBytes(): Promise<Uint8Array | undefined> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const req = idb.transaction(STORE).objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result instanceof Uint8Array ? req.result : undefined);
    req.onerror = () => reject(req.error);
  });
}

async function writeBytes(bytes: Uint8Array): Promise<void> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(bytes, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function openBrowserDb(): Promise<Db> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const data = await readBytes().catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const db = wrapSqlJs(SQL, {
    location: 'Browser-Speicher (Vorschau-Modus)',
    data,
    onWrite: () => {
      clearTimeout(timer);
      timer = setTimeout(() => void writeBytes(db.exportBytes()).catch(console.error), 250);
    },
  });
  return db;
}
