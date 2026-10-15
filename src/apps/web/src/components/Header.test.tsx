// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Header from './Header';
import Footer from './Footer';

describe('Header', () => {
  it('navigates from the primary nav', async () => {
    const onNavigate = vi.fn();
    render(<Header currentPage="search" onNavigate={onNavigate} />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    await userEvent.click(within(nav).getByRole('button', { name: 'Conditions' }));
    expect(onNavigate).toHaveBeenCalledWith('conditions');
  });

  it('submits a trimmed search query and ignores blank input', async () => {
    const onNavigate = vi.fn();
    render(<Header currentPage="conditions" onNavigate={onNavigate} />);
    const [input] = screen.getAllByPlaceholderText('Search conditions, medications…');
    await userEvent.type(input, '   {enter}');
    expect(onNavigate).not.toHaveBeenCalled();
    await userEvent.type(input, ' migraine {enter}');
    expect(onNavigate).toHaveBeenCalledWith('search', 'migraine');
  });

  it('toggles the mobile menu and closes it on Escape', async () => {
    render(<Header currentPage="about" onNavigate={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: 'Toggle navigation' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Footer', () => {
  it('renders navigation links that call onNavigate', async () => {
    const onNavigate = vi.fn();
    render(<Footer onNavigate={onNavigate} />);
    const [first] = screen.getAllByRole('button');
    await userEvent.click(first);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
