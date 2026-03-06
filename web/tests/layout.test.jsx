import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import { AppLayout } from '../src/components/AppLayout.jsx';

describe('AppLayout', () => {
  test('changes the global month', () => {
    const setRefMonth = vi.fn();
    render(
      <MemoryRouter>
        <AppLayout months={[{ refMonth: '2026-02' }]} refMonth="2026-02" setRefMonth={setRefMonth} onRefresh={vi.fn()}>
          <div>conteudo</div>
        </AppLayout>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Mês global/i), { target: { value: '2026-03' } });
    expect(setRefMonth).toHaveBeenCalledWith('2026-03');
  });
});
