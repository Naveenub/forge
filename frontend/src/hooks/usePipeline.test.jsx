import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { usePipeline, usePipelineList, usePendingApprovals } from './usePipeline';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../utils/api', () => ({
  pipelines: {
    get:    vi.fn(),
    list:   vi.fn(),
    cancel: vi.fn(),
    retry:  vi.fn(),
    create: vi.fn(),
  },
  approvals: {
    list:    vi.fn(),
    approve: vi.fn(),
    reject:  vi.fn(),
  },
  getToken: vi.fn(() => null),
}));

vi.mock('./useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({ status: 'idle' })),
}));

import { pipelines as pipelinesApi, approvals as approvalsApi } from '../utils/api';
import { useWebSocket } from './useWebSocket';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderHook(hook) {
  let result;
  function Component() {
    result = hook();
    return null;
  }
  render(<Component />);
  return { getResult: () => result };
}

// ── usePipeline ──────────────────────────────────────────────────────────────

describe('usePipeline', () => {
  it('starts with loading=true', () => {
    pipelinesApi.get.mockResolvedValue({});
    const { getResult } = renderHook(() => usePipeline('pipe-1'));
    expect(getResult().loading).toBe(true);
  });

  it('fetches pipeline data on mount', async () => {
    const fakePipeline = { id: 'pipe-1', status: 'running' };
    pipelinesApi.get.mockResolvedValue(fakePipeline);

    const { getResult } = renderHook(() => usePipeline('pipe-1'));
    await waitFor(() => expect(getResult().loading).toBe(false));

    expect(pipelinesApi.get).toHaveBeenCalledWith('pipe-1');
    expect(getResult().pipeline).toEqual(fakePipeline);
  });

  it('sets error when fetch fails', async () => {
    pipelinesApi.get.mockRejectedValue(new Error('Not found'));

    const { getResult } = renderHook(() => usePipeline('pipe-1'));
    await waitFor(() => expect(getResult().loading).toBe(false));

    expect(getResult().error).toBe('Not found');
    expect(getResult().pipeline).toBeNull();
  });

  it('does not fetch when pipelineId is null', async () => {
    const { getResult } = renderHook(() => usePipeline(null));
    await waitFor(() => expect(getResult().loading).toBe(true));
    expect(pipelinesApi.get).not.toHaveBeenCalled();
  });

  it('connects WebSocket only when pipeline is running', async () => {
    pipelinesApi.get.mockResolvedValue({ id: 'pipe-1', status: 'running' });

    renderHook(() => usePipeline('pipe-1'));
    await waitFor(() => expect(useWebSocket).toHaveBeenCalled());

    // WebSocket called with pipelineId when running
    const [wsId] = useWebSocket.mock.calls.at(-1);
    expect(wsId).toBe('pipe-1');
  });

  it('passes null to WebSocket when pipeline is not running', async () => {
    pipelinesApi.get.mockResolvedValue({ id: 'pipe-1', status: 'completed' });

    renderHook(() => usePipeline('pipe-1'));
    await waitFor(() => expect(useWebSocket).toHaveBeenCalled());

    const [wsId] = useWebSocket.mock.calls.at(-1);
    expect(wsId).toBeNull();
  });

  it('cancel calls API and refreshes', async () => {
    pipelinesApi.get.mockResolvedValue({ id: 'pipe-1', status: 'running' });
    pipelinesApi.cancel.mockResolvedValue(null);

    const { getResult } = renderHook(() => usePipeline('pipe-1'));
    await waitFor(() => expect(getResult().loading).toBe(false));

    await act(async () => { await getResult().cancel(); });

    expect(pipelinesApi.cancel).toHaveBeenCalledWith('pipe-1');
    expect(pipelinesApi.get).toHaveBeenCalledTimes(2); // initial + after cancel
  });

  it('retry clears logs and refreshes', async () => {
    pipelinesApi.get.mockResolvedValue({ id: 'pipe-1', status: 'failed' });
    pipelinesApi.retry.mockResolvedValue(null);

    const { getResult } = renderHook(() => usePipeline('pipe-1'));
    await waitFor(() => expect(getResult().loading).toBe(false));

    await act(async () => { await getResult().retry(); });

    expect(pipelinesApi.retry).toHaveBeenCalledWith('pipe-1');
    expect(getResult().logs).toEqual([]);
  });

  it('clearLogs empties the log array', async () => {
    pipelinesApi.get.mockResolvedValue({ id: 'pipe-1', status: 'running' });

    const { getResult } = renderHook(() => usePipeline('pipe-1'));
    await waitFor(() => expect(getResult().loading).toBe(false));

    act(() => { getResult().clearLogs(); });
    expect(getResult().logs).toEqual([]);
  });
});

// ── usePipelineList ──────────────────────────────────────────────────────────

describe('usePipelineList', () => {
  it('fetches list on mount', async () => {
    const fakeList = [{ id: 'p1' }, { id: 'p2' }];
    pipelinesApi.list.mockResolvedValue(fakeList);

    const { getResult } = renderHook(() => usePipelineList('proj-1'));
    await waitFor(() => expect(getResult().loading).toBe(false));

    expect(pipelinesApi.list).toHaveBeenCalledWith('proj-1');
    expect(getResult().items).toEqual(fakeList);
  });

  it('sets error on failed fetch', async () => {
    pipelinesApi.list.mockRejectedValue(new Error('Server error'));

    const { getResult } = renderHook(() => usePipelineList('proj-1'));
    await waitFor(() => expect(getResult().loading).toBe(false));

    expect(getResult().error).toBe('Server error');
  });

  it('create prepends new pipeline to items', async () => {
    pipelinesApi.list.mockResolvedValue([{ id: 'p1' }]);
    pipelinesApi.create.mockResolvedValue({ id: 'p2' });

    const { getResult } = renderHook(() => usePipelineList('proj-1'));
    await waitFor(() => expect(getResult().loading).toBe(false));

    await act(async () => { await getResult().create({ name: 'New' }); });

    expect(getResult().items[0]).toEqual({ id: 'p2' });
    expect(getResult().items).toHaveLength(2);
  });
});

// ── usePendingApprovals ──────────────────────────────────────────────────────

describe('usePendingApprovals', () => {
  it('fetches approvals on mount', async () => {
    const fakeApprovals = [{ id: 'a1' }, { id: 'a2' }];
    approvalsApi.list.mockResolvedValue(fakeApprovals);

    const { getResult } = renderHook(() => usePendingApprovals());
    await waitFor(() => expect(getResult().loading).toBe(false));

    expect(getResult().approvals).toEqual(fakeApprovals);
  });

  it('approve removes item from list', async () => {
    approvalsApi.list.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
    approvalsApi.approve.mockResolvedValue(null);

    const { getResult } = renderHook(() => usePendingApprovals());
    await waitFor(() => expect(getResult().loading).toBe(false));

    await act(async () => { await getResult().approve('a1', 'LGTM'); });

    expect(approvalsApi.approve).toHaveBeenCalledWith('a1', 'LGTM');
    expect(getResult().approvals.map((a) => a.id)).toEqual(['a2']);
  });

  it('reject removes item from list', async () => {
    approvalsApi.list.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
    approvalsApi.reject.mockResolvedValue(null);

    const { getResult } = renderHook(() => usePendingApprovals());
    await waitFor(() => expect(getResult().loading).toBe(false));

    await act(async () => { await getResult().reject('a2', 'Not ready'); });

    expect(approvalsApi.reject).toHaveBeenCalledWith('a2', 'Not ready');
    expect(getResult().approvals.map((a) => a.id)).toEqual(['a1']);
  });
});