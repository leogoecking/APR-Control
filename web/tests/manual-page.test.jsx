import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ManualPage } from '../src/pages/ManualPage.jsx';

vi.mock('../src/api.js', () => ({
  api: {
    manual: vi.fn().mockResolvedValue([]),
    catalog: vi.fn().mockResolvedValue({
      assuntos: ['MAPEAMENTO', 'PODAS'],
      colaboradores: [
        'RENAN MEDINA SCHULTZ',
        'VENICIO DOS SANTOS LEAL',
        'HARISSON LUCAS CRUZ RESENDE',
        'FELIPE EDWIN SANTOS OLIVEIRA',
        'JOÃO PEDRO DO CARMO ALMEIDA',
      ],
    }),
    createManual: vi.fn(),
    updateManual: vi.fn(),
    deleteManual: vi.fn(),
    exportManualUrl: vi.fn().mockReturnValue('/api/export/manual.csv?refMonth=2026-02'),
  },
}));

describe('ManualPage', () => {
  test('renders fixed collaborator options and imported assuntos', async () => {
    render(<ManualPage refMonth="2026-02" onRefresh={vi.fn()} />);

    const assunto = await screen.findByLabelText('Assunto');
    const colaborador = await screen.findByLabelText('Colaborador');

    expect(assunto.tagName).toBe('SELECT');
    expect(colaborador.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'MAPEAMENTO' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'RENAN MEDINA SCHULTZ' })).toBeTruthy();
  });
});
