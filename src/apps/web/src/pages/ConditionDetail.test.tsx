// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConditionDetail from './ConditionDetail';
import { conditions } from '../data/conditions';
import { getConditionForms } from '@content/adapt';

// Pick fixtures from the real guidance data so the test survives re-parses.
const multiPathway = conditions.find(
  (c) =>
    c.subConditions.length > 1 &&
    new Set(c.subConditions.map((s) => s.name)).size === c.subConditions.length &&
    c.subConditions[0].documents.length > 0 &&
    new Set(c.subConditions[0].documents.map((d) => d.label)).size ===
      c.subConditions[0].documents.length &&
    getConditionForms(c.name).length > 0,
)!;

describe('ConditionDetail', () => {
  it('shows a not-found state for unknown ids', async () => {
    const onNavigate = vi.fn();
    render(<ConditionDetail conditionId="does-not-exist" onNavigate={onNavigate} />);
    expect(screen.getByText('Condition not found.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Browse conditions' }));
    expect(onNavigate).toHaveBeenCalledWith('conditions');
  });

  it('renders the condition name, first pathway checklist and forms', () => {
    render(<ConditionDetail conditionId={multiPathway.id} onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: multiPathway.name })).toBeInTheDocument();
    const firstDocs = multiPathway.subConditions[0].documents;
    expect(screen.getByText(`0/${firstDocs.length}`)).toBeInTheDocument();
    const [form] = getConditionForms(multiPathway.name);
    expect(screen.getAllByRole('link').some((a) => a.getAttribute('href') === form.Url)).toBe(true);
  });

  it('switches pathways and resets the checklist', async () => {
    render(<ConditionDetail conditionId={multiPathway.id} onNavigate={vi.fn()} />);
    const [firstSub, secondSub] = multiPathway.subConditions;
    await userEvent.click(screen.getByText(firstSub.documents[0].label).closest('button')!);
    expect(screen.getByText(`1/${firstSub.documents.length}`)).toBeInTheDocument();

    await userEvent.click(screen.getByText(secondSub.name, { selector: 'span' }).closest('button')!);
    expect(
      screen.getByText(`Records, tests, and medications listed for ${secondSub.name}.`),
    ).toBeInTheDocument();
    if (secondSub.documents.length) {
      expect(screen.getByText(`0/${secondSub.documents.length}`)).toBeInTheDocument();
    }
  });

  it('navigates back through the breadcrumb', async () => {
    const onNavigate = vi.fn();
    render(<ConditionDetail conditionId={multiPathway.id} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onNavigate).toHaveBeenCalledWith('home');
  });

  it('copies a shareable link', async () => {
    const user = userEvent.setup();
    render(<ConditionDetail conditionId={multiPathway.id} onNavigate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Copy link to this condition' }));
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    await expect(navigator.clipboard.readText()).resolves.toContain(`condition=${multiPathway.id}`);
  });

  it('falls back to execCommand when the clipboard API is unavailable', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;
    render(<ConditionDetail conditionId={multiPathway.id} onNavigate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Copy link to this condition' }));
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });
});
