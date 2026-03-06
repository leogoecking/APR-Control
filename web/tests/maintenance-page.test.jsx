import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MaintenancePage } from '../src/pages/MaintenancePage.jsx';

const { collaborators, addCollaborator } = vi.hoisted(() => ({
  collaborators: vi.fn().mockResolvedValue({
    colaboradores: ['RENAN MEDINA SCHULTZ', 'VENICIO DOS SANTOS LEAL'],
  }),
  addCollaborator: vi.fn().mockResolvedValue({
    name: 'MARCOS VINICIUS TESTE',
    colaboradores: ['RENAN MEDINA SCHULTZ', 'VENICIO DOS SANTOS LEAL', 'MARCOS VINICIUS TESTE'],
  }),
}));

vi.mock('../src/api.js', () => ({
  api: {
    collaborators,
    addCollaborator,
    restoreLatest: vi.fn(),
    clearMonth: vi.fn(),
    clearAll: vi.fn(),
  },
}));

describe('MaintenancePage', () => {
  test('adds a new collaborator from maintenance', async () => {
    render(<MaintenancePage refMonth="2026-02" onRefresh={vi.fn()} />);

    await screen.findByText('RENAN MEDINA SCHULTZ');
    fireEvent.change(screen.getByLabelText('Novo colaborador'), { target: { value: 'Marcos Vinicius Teste' } });
    fireEvent.click(screen.getByText('Adicionar colaborador'));

    await waitFor(() => expect(addCollaborator).toHaveBeenCalledWith('Marcos Vinicius Teste'));
    await screen.findByText('MARCOS VINICIUS TESTE');
  });
});
