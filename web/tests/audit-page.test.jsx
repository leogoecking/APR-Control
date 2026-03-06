import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { AuditPage } from '../src/pages/AuditPage.jsx';

vi.mock('../src/api.js', () => ({
  api: {
    audit: vi.fn().mockResolvedValue({
      summary: { conferido: 1, soSistema: 1, soManual: 0 },
      details: [
        { aprId: '100', status: 'Conferido', changed: ['Assunto'], system: { assunto: 'A', colaborador: 'Felipe' }, manual: { assunto: 'B', colaborador: 'Felipe' } },
        { aprId: '200', status: 'Só no sistema', changed: [], system: { assunto: 'Poda', colaborador: 'Renan' }, manual: null },
      ],
    }),
    exportDivergencesUrl: vi.fn().mockReturnValue('/api/export/divergentes.csv?refMonth=2026-02'),
  },
}));

describe('AuditPage', () => {
  test('filters only missing ids', async () => {
    render(<AuditPage refMonth="2026-02" />);
    await screen.findByText('200');
    fireEvent.change(screen.getByDisplayValue('Todos'), { target: { value: 'missing' } });
    await waitFor(() => {
      expect(screen.queryByText('100')).not.toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });
  });
});
