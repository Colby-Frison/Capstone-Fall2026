// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MedicationDetail from './MedicationDetail';

describe('MedicationDetail', () => {
  it('renders a known medication', () => {
    render(<MedicationDetail medicationId="sertraline" onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sertraline' })).toBeInTheDocument();
  });

  it('shows a not-found state that returns to search', async () => {
    const onNavigate = vi.fn();
    render(<MedicationDetail medicationId="nope" onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onNavigate).toHaveBeenCalledWith('search');
  });
});
