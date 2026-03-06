import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { HistoryPage } from '../src/pages/HistoryPage.jsx';

vi.mock('../src/api.js', () => ({
  api: {
    history: vi.fn().mockResolvedValue({
      summary: { novo: 1, removido: 0, alterado: 0, semAlteracao: 0 },
      details: [
        { aprId: '300', status: 'Novo', changed: [], previous: null, current: { assunto: 'PODAS' } },
      ],
    }),
  },
}));

describe('HistoryPage', () => {
  test('does not render removed status in the history view', async () => {
    render(<HistoryPage refMonth="2026-03" />);
    await screen.findByText('Novo');
    await screen.findByText('300');
    expect(screen.queryByText('Removido')).toBeNull();
  });
});

