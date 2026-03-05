import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'docAPR', 'findings-source.json');
const findings = JSON.parse(fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '')); 

function yamlScalar(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(String(value));
}

function toYaml(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    return value.map(item => {
      if (item && typeof item === 'object') {
        return `${pad}-\n${toYaml(item, indent + 2)}`;
      }
      return `${pad}- ${yamlScalar(item)}`;
    }).join('\n');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => {
      if (Array.isArray(item)) {
        if (!item.length) return `${pad}${key}: []`;
        return `${pad}${key}:\n${toYaml(item, indent + 2)}`;
      }
      if (item && typeof item === 'object') {
        return `${pad}${key}:\n${toYaml(item, indent + 2)}`;
      }
      return `${pad}${key}: ${yamlScalar(item)}`;
    }).join('\n');
  }
  return `${pad}${yamlScalar(value)}`;
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

const jsonOutputPath = path.join(root, 'docAPR-findings.json');
const yamlOutputPath = path.join(root, 'docAPR-findings.yaml');
const csvOutputPath = path.join(root, 'docAPR-findings.csv');
const mdOutputPath = path.join(root, 'docAPR-executive-summary.md');
const matrixOutputPath = path.join(root, 'docAPR-test-matrix.md');

fs.writeFileSync(jsonOutputPath, JSON.stringify(findings, null, 2) + '\n', 'utf8');
fs.writeFileSync(yamlOutputPath, toYaml(findings) + '\n', 'utf8');

const csvHeader = ['bugId', 'severity', 'category', 'component', 'summary', 'status', 'branch', 'tests'];
const csvRows = findings.map(item => [
  item.bugId,
  item.severity,
  item.category,
  item.component,
  item.summary,
  item.status,
  item.branch,
  (item.tests || []).join('|'),
]);
fs.writeFileSync(csvOutputPath, [csvHeader, ...csvRows].map(row => row.map(csvEscape).join(',')).join('\n') + '\n', 'utf8');

const totals = findings.reduce((acc, item) => {
  acc.total += 1;
  acc.bySeverity[item.severity] = (acc.bySeverity[item.severity] || 0) + 1;
  return acc;
}, { total: 0, bySeverity: {} });

const md = [
  '# docAPR Executive Summary',
  '',
  `- Total de findings verificados: ${totals.total}`,
  `- Severidades: ${Object.entries(totals.bySeverity).map(([key, value]) => `${key}=${value}`).join(', ')}`,
  '',
  '## Findings',
  '',
  ...findings.flatMap(item => [
    `### ${item.bugId} - ${item.summary}`,
    `- Severidade: ${item.severity}`,
    `- Categoria: ${item.category}`,
    `- Componente: ${item.component}`,
    `- Status: ${item.status}`,
    `- Branch: ${item.branch}`,
    `- Arquivos: ${(item.files || []).join(', ')}`,
    `- Testes: ${(item.tests || []).join(', ')}`,
    '',
  ]),
].join('\n');
fs.writeFileSync(mdOutputPath, md + '\n', 'utf8');

const matrix = [
  '# docAPR Test Matrix',
  '',
  '| Bug | Automated Tests | Verification |',
  '| --- | --- | --- |',
  ...findings.map(item => `| ${item.bugId} | ${(item.tests || []).join(', ')} | ${(item.verification || []).join(' / ')} |`),
].join('\n');
fs.writeFileSync(matrixOutputPath, matrix + '\n', 'utf8');
