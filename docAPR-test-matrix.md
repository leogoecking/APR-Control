# docAPR Test Matrix

| Bug | Automated Tests | Verification |
| --- | --- | --- |
| BUG-001 | tests/audit.test.js | Executar tests/audit.test.js. / Confirmar que o resumo inclui summary.divergente. / Confirmar que a tabela exibe status Divergente. |
| BUG-002 | tests/history.test.js | Executar tests/history.test.js. / Confirmar a presença de summary.removido. / Confirmar o status Removido na lista histórica. |
| BUG-003 | tests/fixture-validation.test.js | Executar tests/fixture-validation.test.js. / Validar ausência de month-mismatch no fixture. |
| BUG-004 | tests/imports.test.js | Executar tests/imports.test.js. / Validar a mensagem de fallback para CSV. / Confirmar aviso informativo na inicialização quando XLSX estiver indisponível. |
