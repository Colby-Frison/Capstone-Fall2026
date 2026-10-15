// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Browse from './Browse';
import { categories, conditions } from '../data/conditions';

describe('Browse', () => {
  it('lists every condition by default', () => {
    render(<Browse onNavigate={vi.fn()} />);
    for (const condition of conditions.slice(0, 5)) {
      expect(screen.getAllByText(condition.name).length).toBeGreaterThan(0);
    }
  });

  it('filters by category chip', async () => {
    render(<Browse onNavigate={vi.fn()} />);
    const category = categories[0];
    const inCategory = conditions.find((c) => c.category === category)!;
    const outside = conditions.find((c) => c.category !== category && c.name !== inCategory.name)!;
    await userEvent.click(screen.getAllByRole('button', { name: new RegExp(`^${category}`) })[0]);
    expect(screen.getAllByText(inCategory.name).length).toBeGreaterThan(0);
    expect(screen.queryByText(outside.name)).not.toBeInTheDocument();
  });

  it('shows an empty state when the text filter matches nothing', async () => {
    render(<Browse onNavigate={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('Filter within conditions…'), 'zzzz-nothing');
    expect(screen.getByText('No conditions match your filter.')).toBeInTheDocument();
  });

  it('opens a condition', async () => {
    const onNavigate = vi.fn();
    render(<Browse onNavigate={onNavigate} />);
    const [first] = conditions;
    await userEvent.click(screen.getAllByRole('button', { name: new RegExp(first.name.replace(/[()]/g, '\\$&')) })[0]);
    expect(onNavigate).toHaveBeenCalledWith('condition-detail', first.id);
  });
});
