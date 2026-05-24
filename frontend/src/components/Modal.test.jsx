import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal, { ConfirmModal } from './Modal';

describe('Modal', () => {
  it('renders nothing when open=false', () => {
    render(<Modal open={false} title="Test" onClose={vi.fn()}><p>Body</p></Modal>);
    expect(screen.queryByText('Body')).not.toBeInTheDocument();
  });

  it('renders children when open=true', () => {
    render(<Modal open title="Test" onClose={vi.fn()}><p>Modal body</p></Modal>);
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<Modal open title="My Title" onClose={vi.fn()}><p>x</p></Modal>);
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(<Modal open title="T" subtitle="Sub text" onClose={vi.fn()}><p>x</p></Modal>);
    expect(screen.getByText('Sub text')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal open title="T" onClose={onClose}><p>x</p></Modal>);
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<Modal open title="T" onClose={onClose}><p>x</p></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when closable=false', () => {
    const onClose = vi.fn();
    render(<Modal open title="T" onClose={onClose} closable={false}><p>x</p></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has role=dialog for accessibility', () => {
    render(<Modal open title="T" onClose={vi.fn()}><p>x</p></Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders Modal.Footer children', () => {
    render(
      <Modal open title="T" onClose={vi.fn()}>
        <Modal.Footer><button>OK</button></Modal.Footer>
      </Modal>
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });
});

describe('ConfirmModal', () => {
  it('renders message and confirm/cancel buttons', () => {
    render(
      <ConfirmModal
        open
        title="Delete?"
        message="This cannot be undone."
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal open title="T" message="Sure?" onClose={vi.fn()} onConfirm={onConfirm} />
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    render(
      <ConfirmModal open title="T" message="Sure?" onClose={onClose} onConfirm={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state text', () => {
    render(
      <ConfirmModal open title="T" message="Sure?" onClose={vi.fn()} onConfirm={vi.fn()} loading />
    );
    expect(screen.getByText('Please wait…')).toBeInTheDocument();
  });

  it('disables confirm button when loading', () => {
    render(
      <ConfirmModal open title="T" message="Sure?" onClose={vi.fn()} onConfirm={vi.fn()} loading />
    );
    expect(screen.getByText('Please wait…').closest('button')).toBeDisabled();
  });
});