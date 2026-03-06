import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(serverDir, '..');
const repoRoot = path.resolve(workspaceDir, '..');

const dataDir = process.env.APR_CONTROL_DATA_DIR || path.join(workspaceDir, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const config = {
  repoRoot,
  workspaceDir,
  dataDir,
  dbPath: process.env.APR_CONTROL_DB_PATH || path.join(dataDir, 'app.db'),
  host: process.env.APR_CONTROL_HOST || '0.0.0.0',
  port: Number(process.env.APR_CONTROL_PORT || 3000),
  webDistPath: process.env.APR_CONTROL_WEB_DIST || path.join(repoRoot, 'web', 'dist'),
  legacyJsonPath: process.env.APR_CONTROL_LEGACY_JSON || path.join(repoRoot, 'APR Control.json'),
};
