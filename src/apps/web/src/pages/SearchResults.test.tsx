// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchResults from './SearchResults';
import { searchConditions } from '../data/conditions';
import { searchMedications } from '../data/medications';

function setup(query: string) {
  const onNavigate = vi.fn();
  const onSearch = vi.fn();
  render(<SearchResults query={query} onNavigate={onNavigate} onSearch={onSearch} />);
  return { onNavigate, onSearch };
}

describe('SearchResults', () => {
  it('shows a prompt and featured conditions when the query is empty', () => {
    setup('');
    expect(screen.getByText('Try searching for a condition or medication')).toBeInTheDocument();
    expect(screen.getByText('Featured conditions')).toBeInTheDocument();
  });

  it('shows a no-results state that links to browse', async () => {
    const { onNavigate } = setup('zzzz-no-such-condition');
    expect(screen.getByText('No results for "zzzz-no-such-condition"')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Browse all conditions/ }));
    expect(onNavigate).toHaveBeenCalledWith('conditions');
  });

  it('lists matching conditions and medications with filter counts', async () => {
    const query = 'sertraline';
    const conditions = searchConditions(query);
    const medications = searchMedications(query);
    const { onNavigate } = setup(query);

    expect(screen.getByRole('button', { name: `All (${conditions.length + medications.length})` })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: `Medications (${medications.length})` }));
    await userEvent.click(screen.getByRole('button', { name: /^Sertraline/ }));
    expect(onNavigate).toHaveBeenCalledWith('medication-detail', 'sertraline');
  });

  it('hides medications when the conditions filter is selected', async () => {
    setup('sertraline');
    const conditions = searchConditions('sertraline');
    await userEvent.click(screen.getByRole('button', { name: `Conditions (${conditions.length})` }));
    expect(screen.queryByRole('button', { name: /^Sertraline/ })).not.toBeInTheDocument();
  });

  it('opens a condition from the results', async () => {
    const [first] = searchConditions('allergies');
    const { onNavigate } = setup('allergies');
    await userEvent.click(screen.getAllByRole('button', { name: new RegExp(first.name) })[0]);
    expect(onNavigate).toHaveBeenCalledWith('condition-detail', first.id);
  });

  it('submits a trimmed new query', async () => {
    const { onSearch } = setup('');
    await userEvent.type(screen.getByRole('searchbox'), '  migraine  {enter}');
    expect(onSearch).toHaveBeenCalledWith('migraine');
  });
});
