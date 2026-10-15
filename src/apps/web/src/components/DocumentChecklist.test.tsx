// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentChecklist } from './DocumentChecklist';
import type { DocumentItem } from '../data/types';

const documents: DocumentItem[] = [
  { id: 'note', label: 'Clinical progress note', required: true, kind: 'DOCUMENT' },
  { id: 'mri', label: 'MRI if already performed', required: false, kind: 'TEST', description: 'Bring the report.' },
  { id: 'labs', label: 'Laboratory reports', required: true, kind: 'TEST' },
];

function Harness() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  return (
    <DocumentChecklist
      documents={documents}
      checkedDocs={checked}
      onToggle={(id) =>
        setChecked((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        })
      }
    />
  );
}

describe('DocumentChecklist', () => {
  it('renders nothing for an empty list', () => {
    const { container } = render(
      <DocumentChecklist documents={[]} checkedDocs={new Set()} onToggle={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('summarizes and groups items by kind', () => {
    render(<DocumentChecklist documents={documents} checkedDocs={new Set()} onToggle={vi.fn()} />);
    expect(screen.getByText('3 items · 2 required · 1 often requested')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Records and documents' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tests and imaging' })).toBeInTheDocument();
    expect(screen.getByText('Bring the report.')).toBeInTheDocument();
    expect(screen.getByText('0/3')).toBeInTheDocument();
  });

  it('calls onToggle with the item id', async () => {
    const onToggle = vi.fn();
    render(<DocumentChecklist documents={documents} checkedDocs={new Set()} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /Laboratory reports/ }));
    expect(onToggle).toHaveBeenCalledWith('labs');
  });

  it('updates progress as items are checked and unchecked', async () => {
    render(<Harness />);
    const note = screen.getByRole('button', { name: /Clinical progress note/ });
    await userEvent.click(note);
    await userEvent.click(screen.getByRole('button', { name: /MRI/ }));
    expect(screen.getByText('2/3')).toBeInTheDocument();
    await userEvent.click(note);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });
});
