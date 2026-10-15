// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import About from './About';
import Home from './Home';
import HowItWorks from './HowItWorks';
import DisclaimerCallout from '../components/DisclaimerCallout';

describe('static pages', () => {
  it.each([
    ['About', About],
    ['HowItWorks', HowItWorks],
  ])('%s renders a top-level heading', (_name, Page) => {
    render(<Page onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it.each(['default', 'compact'] as const)('DisclaimerCallout renders the %s variant', (variant) => {
    const { container } = render(<DisclaimerCallout variant={variant} />);
    expect(container).not.toBeEmptyDOMElement();
  });
});

describe('Home', () => {
  it('searches with a trimmed query', async () => {
    const onNavigate = vi.fn();
    render(<Home onNavigate={onNavigate} />);
    await userEvent.type(
      screen.getByPlaceholderText(/Search a condition or medication/),
      '  migraine {enter}',
    );
    expect(onNavigate).toHaveBeenCalledWith('search', 'migraine');
  });

  it('goes to the empty search page for a blank query', async () => {
    const onNavigate = vi.fn();
    render(<Home onNavigate={onNavigate} />);
    await userEvent.type(screen.getByPlaceholderText(/Search a condition or medication/), '{enter}');
    expect(onNavigate).toHaveBeenCalledWith('search');
  });
});
