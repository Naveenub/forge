import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PipelineCard from './PipelineCard';

const basePipeline = {
  id: 'abc123def456',
  name: 'My Test Pipeline',
  status: 'running',
  current_domain: 'testing',
  created_at: new Date(Date.now() - 60_000).toISOString(), // 1m ago
  duration_ms: null,
  requirements: 'Build a REST API with authentication',
};

describe('PipelineCard', () => {
  it('renders the pipeline name', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    expect(screen.getByText('My Test Pipeline')).toBeInTheDocument();
  });

  it('falls back to short id when name is missing', () => {
    render(<PipelineCard pipeline={{ ...basePipeline, name: null }} />);
    expect(screen.getByText('Pipeline abc123de')).toBeInTheDocument();
  });

  it('renders the status badge', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders truncated requirements', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    expect(screen.getByText(/Build a REST API/)).toBeInTheDocument();
  });

  it('does not render requirements when absent', () => {
    render(<PipelineCard pipeline={{ ...basePipeline, requirements: null }} />);
    expect(screen.queryByText(/Build a REST API/)).not.toBeInTheDocument();
  });

  it('calls onClick with the pipeline when card is clicked', () => {
    const onClick = vi.fn();
    render(<PipelineCard pipeline={basePipeline} onClick={onClick} />);
    fireEvent.click(screen.getByText('My Test Pipeline').closest('div[class]'));
    expect(onClick).toHaveBeenCalledWith(basePipeline);
  });

  it('does not throw when onClick is not provided', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    fireEvent.click(screen.getByText('My Test Pipeline'));
  });

  it('shows 100% progress when status is completed', () => {
    render(<PipelineCard pipeline={{ ...basePipeline, status: 'completed' }} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows 0% progress when domain is unknown', () => {
    render(<PipelineCard pipeline={{ ...basePipeline, current_domain: null, status: 'pending' }} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows "queued" label when current_domain is null', () => {
    render(<PipelineCard pipeline={{ ...basePipeline, current_domain: null } } />);
    expect(screen.getByText('queued')).toBeInTheDocument();
  });

  it('renders all 5 domain dots', () => {
    const { container } = render(<PipelineCard pipeline={basePipeline} />);
    // Each domain renders a short label (arch, dev, test, sec, dev)
    const labels = container.querySelectorAll('span.text-\\[9px\\]');
    expect(labels.length).toBe(5);
  });

  it('renders duration when duration_ms is provided', () => {
    render(<PipelineCard pipeline={{ ...basePipeline, duration_ms: 90 }} />);
    expect(screen.getByText(/1m 30s/)).toBeInTheDocument();
  });

  it('renders relative time for created_at', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });
});