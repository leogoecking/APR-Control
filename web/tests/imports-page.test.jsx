import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ImportsPage } from '../src/pages/ImportsPage.jsx';

const { importSource } = vi.hoisted(() => ({
  importSource: vi.fn().mockResolvedValue({ totalValid: 10, totalInvalid: 1, duplicates: ['1'] }),
}));

vi.mock('../src/api.js', () => ({
  api: {
    importSource,
  },
}));

describe('ImportsPage', () => {
  test('uploads a selected file and shows summary', async () => {
    render(<ImportsPage refMonth="2026-02" onRefresh={vi.fn()} />);
    const input = screen.getByLabelText(/Arquivo Importar base manual/i);
    const file = new File(['ID;Assunto\n1;Teste'], 'manual.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getAllByText('Enviar arquivo')[0]);
    await waitFor(() => expect(importSource).toHaveBeenCalled());
    await screen.findByText(/Importação concluída/i);
  });
});
