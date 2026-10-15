// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DispositionBadge, { DispositionBlock } from './DispositionBadge';
import type { Disposition } from '../data/types';

const cases: [Disposition, string, string][] = [
  ['issue', 'Issue', 'badge-issue'],
  ['deferral', 'Deferral', 'badge-deferral'],
  ['denial', 'Denial', 'badge-denial'],
  ['special-issuance', 'Special issuance', 'badge-special'],
  ['unknown', 'Unknown', 'badge-unknown'],
];

describe('DispositionBadge', () => {
  it.each(cases)('renders %s with its label and class', (disposition, label, className) => {
    render(<DispositionBadge disposition={disposition} />);
    expect(screen.getByText(label)).toHaveClass('badge', className);
  });

  it.each(['sm', 'lg'] as const)('applies %s sizing', (size) => {
    render(<DispositionBadge disposition="issue" size={size} />);
    const badge = screen.getByText('Issue');
    expect(badge.style.fontSize).toBe(size === 'sm' ? '0.7rem' : '0.85rem');
  });
});

describe('DispositionBlock', () => {
  it('pairs the badge with a plain-language heading', () => {
    render(<DispositionBlock disposition="deferral" />);
    expect(screen.getByText('Deferral')).toBeInTheDocument();
    expect(screen.getByText('The FAA has to review it')).toBeInTheDocument();
  });
});
