import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './useAuth';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../utils/api', () => ({
  auth: {
    login:         vi.fn(),
    logout:        vi.fn(),
    me:            vi.fn(),
    updateProfile: vi.fn(),
  },
  setToken: vi.fn(),
  getToken: vi.fn(),
}));

import { auth as authApi, setToken, getToken } from '../utils/api';

// Helper: component that reads from AuthContext
function ReadAuth({ onRender }) {
  const ctx = useAuth();
  onRender(ctx);
  return null;
}

function renderWithProvider(onRender) {
  return render(
    <AuthProvider>
      <ReadAuth onRender={onRender} />
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Default: no existing token
  getToken.mockReturnValue(null);
});

afterEach(() => {
  localStorage.clear();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useAuth — initial state', () => {
  it('throws when used outside AuthProvider', () => {
    // Suppress React error boundary noise in test output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ReadAuth onRender={() => {}} />)).toThrow(
      'useAuth must be used inside AuthProvider'
    );
    spy.mockRestore();
  });

  it('starts with user=null and loading=false when no token', async () => {
    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(ctx.user).toBeNull();
    expect(ctx.isAuthenticated).toBe(false);
  });

  it('calls auth.me and sets user when token exists on mount', async () => {
    const fakeUser = { id: '1', email: 'admin@forge.dev', name: 'Admin' };
    getToken.mockReturnValue('tok');
    authApi.me.mockResolvedValue(fakeUser);

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(authApi.me).toHaveBeenCalledTimes(1);
    expect(ctx.user).toEqual(fakeUser);
    expect(ctx.isAuthenticated).toBe(true);
  });

  it('clears token and user when auth.me fails on mount', async () => {
    getToken.mockReturnValue('bad-tok');
    authApi.me.mockRejectedValue(new Error('401'));

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(setToken).toHaveBeenCalledWith(null);
    expect(ctx.user).toBeNull();
  });
});

describe('useAuth — login', () => {
  it('sets user and token on successful login', async () => {
    const fakeUser = { id: '2', email: 'dev@forge.dev' };
    authApi.login.mockResolvedValue({ access_token: 'tok123', user: fakeUser });

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    await act(async () => {
      await ctx.login('dev@forge.dev', 'Dev@2025');
    });

    expect(setToken).toHaveBeenCalledWith('tok123');
    expect(ctx.user).toEqual(fakeUser);
    expect(ctx.isAuthenticated).toBe(true);
  });

  it('sets error and rethrows on failed login', async () => {
    authApi.login.mockRejectedValue(new Error('Invalid credentials'));

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    let caught;
    await act(async () => {
      try { await ctx.login('bad@forge.dev', 'wrong'); }
      catch (e) { caught = e; }
    });

    expect(caught?.message).toBe('Invalid credentials');
    expect(ctx.error).toBe('Invalid credentials');
  });
});

describe('useAuth — logout', () => {
  it('clears user, token and localStorage on logout', async () => {
    const fakeUser = { id: '1', email: 'admin@forge.dev' };
    getToken.mockReturnValue('tok');
    authApi.me.mockResolvedValue(fakeUser);
    authApi.logout.mockResolvedValue(null);

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.isAuthenticated).toBe(true));

    await act(async () => { await ctx.logout(); });

    expect(setToken).toHaveBeenCalledWith(null);
    expect(ctx.user).toBeNull();
    expect(ctx.isAuthenticated).toBe(false);
  });

  it('still clears state even if logout API call fails', async () => {
    getToken.mockReturnValue('tok');
    authApi.me.mockResolvedValue({ id: '1' });
    authApi.logout.mockRejectedValue(new Error('Network error'));

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.isAuthenticated).toBe(true));

    await act(async () => { await ctx.logout(); });

    expect(ctx.user).toBeNull();
  });
});

describe('useAuth — updateUser', () => {
  it('updates user in context after profile update', async () => {
    const initial = { id: '1', email: 'admin@forge.dev', name: 'Admin' };
    const updated = { ...initial, name: 'Super Admin' };
    getToken.mockReturnValue('tok');
    authApi.me.mockResolvedValue(initial);
    authApi.updateProfile.mockResolvedValue(updated);

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.user?.name).toBe('Admin'));

    await act(async () => { await ctx.updateUser({ name: 'Super Admin' }); });

    expect(ctx.user.name).toBe('Super Admin');
  });
});