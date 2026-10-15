// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { conditions } from './data/conditions';

const [condition] = conditions;

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.scrollTo = vi.fn();
});

describe('App routing', () => {
  it('starts on the home page', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/Search a condition or medication/)).toBeInTheDocument();
  });

  it('deep-links to a condition from ?condition=', () => {
    window.history.replaceState(null, '', `/?condition=${condition.id}`);
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: condition.name })).toBeInTheDocument();
  });

  it('runs a search from home and keeps the URL clean', async () => {
    render(<App />);
    await userEvent.type(screen.getByPlaceholderText(/Search a condition or medication/), 'sertraline{enter}');
    expect(screen.getByRole('button', { name: /^All \(/ })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('opens a condition and writes it to the URL, then goes back with popstate', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    await userEvent.click(within(nav).getByRole('button', { name: 'Conditions' }));
    await userEvent.click(screen.getAllByText(condition.name)[0].closest('button')!);
    expect(window.location.search).toBe(`?condition=${condition.id}`);

    act(() => {
      window.history.replaceState({ page: 'conditions' }, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'conditions' } }));
    });
    expect(screen.getByPlaceholderText('Filter within conditions…')).toBeInTheDocument();
  });

  it('opens and closes the home mobile menu', async () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: 'Toggle navigation' });
    await userEvent.click(toggle);
    const menu = document.getElementById('mobile-nav')!;
    await userEvent.click(within(menu).getByRole('button', { name: 'About' }));
    expect(document.getElementById('mobile-nav')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('closes the home mobile menu on Escape', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
    expect(document.getElementById('mobile-nav')).not.toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(document.getElementById('mobile-nav')).toBeNull();
  });
});
