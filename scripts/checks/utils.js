import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '../..');

export function readProjectFile(relPath) {
    return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
}

export function fileExists(relPath) {
    return fs.existsSync(path.join(ROOT_DIR, relPath));
}

export function collectLocaleKeys(obj, prefix = '') {
    const keys = [];
    for (const k of Object.keys(obj)) {
        const nextKey = prefix ? `${prefix}.${k}` : k;
        const val = obj[k];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            keys.push(...collectLocaleKeys(val, nextKey));
        } else {
            keys.push(nextKey);
        }
    }
    return keys;
}
