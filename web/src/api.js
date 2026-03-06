const JSON_HEADERS = { 'content-type': 'application/json' };

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(payload?.message || 'Falha ao processar a requisição.');
  }
  return payload;
}

export const api = {
  health() {
    return request('/api/health');
  },
  months() {
    return request('/api/months');
  },
  monthSummary(refMonth) {
    return request(`/api/months/${refMonth}/summary`);
  },
  manual(refMonth) {
    return request(`/api/months/${refMonth}/manual`);
  },
  catalog(refMonth) {
    return request(`/api/months/${refMonth}/catalog`);
  },
  createManual(refMonth, payload) {
    return request(`/api/months/${refMonth}/manual`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
  },
  updateManual(refMonth, aprId, payload) {
    return request(`/api/months/${refMonth}/manual/${encodeURIComponent(aprId)}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
  },
  deleteManual(refMonth, aprId) {
    return request(`/api/months/${refMonth}/manual/${encodeURIComponent(aprId)}`, {
      method: 'DELETE',
    });
  },
  audit(refMonth) {
    return request(`/api/months/${refMonth}/audit`);
  },
  history(refMonth, source) {
    return request(`/api/months/${refMonth}/history?source=${source}`);
  },
  async importSource(refMonth, source, file) {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/import/${source}?refMonth=${refMonth}`, {
      method: 'POST',
      body: formData,
    });
  },
  collaborators() {
    return request('/api/maintenance/collaborators');
  },
  addCollaborator(name) {
    return request('/api/maintenance/collaborators', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name }),
    });
  },
  restoreLatest() {
    return request('/api/maintenance/restore-latest', { method: 'POST' });
  },
  clearMonth(refMonth) {
    return request('/api/maintenance/clear-month', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ refMonth }),
    });
  },
  clearAll() {
    return request('/api/maintenance/clear-all', { method: 'POST' });
  },
  exportManualUrl(refMonth) {
    return `/api/export/manual.csv?refMonth=${refMonth}`;
  },
  exportDivergencesUrl(refMonth) {
    return `/api/export/divergentes.csv?refMonth=${refMonth}`;
  },
};
