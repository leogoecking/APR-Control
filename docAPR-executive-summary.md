# docAPR Executive Summary

- Total de findings verificados: 4
- Severidades: high=1, medium=3

## Findings

### BUG-001 - IDs com o mesmo código, mas com dados divergentes, eram contabilizados como Conferido.
- Severidade: high
- Categoria: functional
- Componente: audit
- Status: fixed
- Branch: codex/bug-001-audit-divergence
- Arquivos: APR CONTROL.html, src/app.js, src/lib/audit.js
- Testes: tests/audit.test.js

### BUG-002 - O comparativo histórico ignorava IDs removidos porque só percorria o mês atual.
- Severidade: medium
- Categoria: functional
- Componente: history
- Status: fixed
- Branch: codex/bug-002-history-removals
- Arquivos: src/app.js, src/lib/history.js
- Testes: tests/history.test.js

### BUG-003 - A base JSON distribuída continha um registro fora do mês 2026-02.
- Severidade: medium
- Categoria: data-integrity
- Componente: fixture
- Status: fixed
- Branch: codex/bug-003-fixture-month-mismatch
- Arquivos: APR Control.json, tests/fixture-validation.test.js
- Testes: tests/fixture-validation.test.js

### BUG-004 - A importação de Excel dependia do CDN remoto sem mensagem operacional padronizada para modo offline.
- Severidade: medium
- Categoria: integration
- Componente: imports
- Status: fixed
- Branch: codex/bug-004-offline-xlsx-warning
- Arquivos: src/app.js, src/lib/imports.js
- Testes: tests/imports.test.js

