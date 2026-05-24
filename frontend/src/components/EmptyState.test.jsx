import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState, { EmptyStatePreset, EMPTY_STATES } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items" description="Nothing here yet." />);
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(<EmptyState icon="⬡" title="T" />);
    expect(screen.getByText('⬡')).toBeInTheDocument();
  });

  it('renders action button and calls onClick', () => {
    const onClick = vi.fn();
    render(<EmptyState title="T" action={{ label: 'Start', onClick }} />);
    fireEvent.click(screen.getByText('Start'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action button', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="T"
        action={{ label: 'Primary', onClick: vi.fn() }}
        secondaryAction={{ label: 'Secondary', onClick }}
      />
    );
    fireEvent.click(screen.getByText('Secondary'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders without action buttons when none provided', () => {
    render(<EmptyState title="T" description="D" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing for title/description when omitted', () => {
    const { container } = render(<EmptyState icon="◉" />);
    expect(container.querySelector('h3')).not.toBeInTheDocument();
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });
});

describe('EmptyStatePreset', () => {
  it('renders all built-in presets without crashing', () => {
    Object.keys(EMPTY_STATES).forEach((preset) => {
      const { unmount } = render(<EmptyStatePreset preset={preset} />);
      unmount();
    });
  });

  it('renders pipelines preset with correct title', () => {
    render(<EmptyStatePreset preset="pipelines" />);
    expect(screen.getByText('No pipelines yet')).toBeInTheDocument();
  });

  it('renders approvals preset with correct title', () => {
    render(<EmptyStatePreset preset="approvals" />);
    expect(screen.getByText('No pending approvals')).toBeInTheDocument();
  });

  it('falls back to error preset for unknown preset', () => {
    render(<EmptyStatePreset preset="nonexistent_preset" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});