export const DB_KEY = 'apr_control_local_v4';
export const BACKUP_KEY = 'apr_control_local_v4_backups';
export const TAB_KEY = 'apr_control_local_v4_active_tab';
export const FIXED_BACKUP_FILE = 'APR Control.json';
export const FS_DB = 'apr_control_local_v4_fs';
export const FS_STORE = 'handles';
export const FS_BACKUP_DIR_KEY = 'backup_dir';
export const FS_MAIN_DB_KEY = 'main_db_cache';
export const MAX_BACKUPS = 30;
export const SNAPSHOT_VERSION = 1;
export const MAX_BACKUP_BYTES = 2_500_000;

export const DEFAULT_SUBJECTS = [
  'MANUTENÇÃO CAIXA NAP',
  'DOCUMENTAÇÃO FIBRA',
  'MANUTENCAO FIBRA - INFRA',
  'Mapeamento',
  'Podas',
];

export const DEFAULT_EMPLOYEES = [
  'HARISSON LUCAS CRUZ RESENDE',
  'VENICIO DOS SANTOS LEAL',
  'RENAN MEDINA SCHULTZ',
  'FELIPE EDWIN SANTOS OLIVEIRA',
  'JOÃO PEDRO DO CARMO ALMEIDA',
];

export const MAX_EMPLOYEE_SUGGESTIONS = 6;
export const EMPLOYEE_TOKEN_IGNORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
