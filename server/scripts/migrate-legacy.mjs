import { createDatabase } from '../src/db.js';
import { config } from '../src/config.js';
import { createAprService } from '../src/services/apr-service.js';

const db = createDatabase(config.dbPath);
const service = createAprService(db);
const result = service.migrateLegacyFile(config.legacyJsonPath);
console.log(`Migração concluída: ${result.months} mês(es), ${result.records} registro(s).`);
db.close();
