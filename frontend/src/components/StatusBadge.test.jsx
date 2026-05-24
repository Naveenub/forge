import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the status text capitalised', () => {
    render(<StatusBadge status="running" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders all known statuses without crashing', () => {
    const statuses = ['pending', 'running', 'review', 'approved', 'completed', 'failed', 'cancelled', 'rejected'];
    statuses.forEach((status) => {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(status.charAt(0).toUpperCase() + status.slice(1))).toBeInTheDocument();
      unmount();
    });
  });

  it('renders Unknown for missing status', () => {
    render(<StatusBadge status={null} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders Unknown for unrecognised status', () => {
    render(<StatusBadge status="totally_unknown_xyz" />);
    expect(screen.getByText('Totally_unknown_xyz')).toBeInTheDocument();
  });

  it('applies sm size classes by default', () => {
    const { container } = render(<StatusBadge status="completed" />);
    expect(container.firstChild).toHaveClass('text-xs');
  });

  it('applies md size classes when size=md', () => {
    const { container } = render(<StatusBadge status="completed" size="md" />);
    expect(container.firstChild).toHaveClass('text-sm');
  });

  it('applies lg size classes when size=lg', () => {
    const { container } = render(<StatusBadge status="completed" size="lg" />);
    expect(container.firstChild).toHaveClass('text-base');
  });

  it('adds animate-pulse class on running status with pulse=true', () => {
    const { container } = render(<StatusBadge status="running" pulse />);
    const dot = container.querySelector('.rounded-full.animate-pulse');
    expect(dot).toBeInTheDocument();
  });

  it('does not animate-pulse when pulse=false', () => {
    const { container } = render(<StatusBadge status="running" pulse={false} />);
    const dot = container.querySelector('.animate-pulse');
    expect(dot).not.toBeInTheDocument();
  });

  it('does not animate-pulse on non-running status even with pulse=true', () => {
    const { container } = render(<StatusBadge status="completed" pulse />);
    const dot = container.querySelector('.animate-pulse');
    expect(dot).not.toBeInTheDocument();
  });
});