/**
 * storage.js — typed, TTL-aware localStorage abstraction.
 *
 * Usage:
 *   storage.set('user', { id: '…', name: '…' }, { ttl: 3600 });
 *   const user = storage.get('user');   // null if expired or missing
 *   storage.remove('user');
 *   storage.clear();                    // only Forge-namespaced keys
 */

const NS = 'forge:';   // namespace prefix to avoid collisions

// ── Core ──────────────────────────────────────────────────────────────────────

function _key(k) { return `${NS}${k}`; }

function _encode(value, ttlSeconds) {
  return JSON.stringify({
    v: value,
    e: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0,
  });
}

function _decode(raw) {
  if (!raw) return null;
  try {
    const { v, e } = JSON.parse(raw);
    if (e && Date.now() > e) return null;  // expired
    return v;
  } catch {
    return null;
  }
}

function _store(useSession = false) {
  return useSession ? window.sessionStorage : window.localStorage;
}

export const storage = {
  /**
   * Persist a value.
   * @param {string} key
   * @param {*} value          — must be JSON-serialisable
   * @param {{ ttl?: number, session?: boolean }} opts
   *   ttl — seconds until expiry (0 = no expiry)
   *   session — use sessionStorage instead of localStorage
   */
  set(key, value, { ttl = 0, session = false } = {}) {
    try {
      _store(session).setItem(_key(key), _encode(value, ttl));
    } catch (e) {
      console.warn('storage.set failed:', e);
    }
  },

  /**
   * Retrieve a value, or null if missing / expired.
   */
  get(key, { session = false } = {}) {
    try {
      return _decode(_store(session).getItem(_key(key)));
    } catch {
      return null;
    }
  },

  /**
   * Remove a key.
   */
  remove(key, { session = false } = {}) {
    _store(session).removeItem(_key(key));
  },

  /**
   * Remove all Forge-namespaced keys from localStorage (and optionally sessionStorage).
   */
  clear({ session = false } = {}) {
    const store = _store(session);
    Object.keys(store)
      .filter((k) => k.startsWith(NS))
      .forEach((k) => store.removeItem(k));
  },

  /**
   * Check whether a key exists and hasn't expired.
   */
  has(key, { session = false } = {}) {
    return this.get(key, { session }) !== null;
  },

  /**
   * Return all Forge-namespaced keys (without the namespace prefix).
   */
  keys({ session = false } = {}) {
    return Object.keys(_store(session))
      .filter((k) => k.startsWith(NS))
      .map((k) => k.slice(NS.length));
  },
};

// ── Typed helpers (pre-defined Forge keys) ────────────────────────────────────

export const tokenStorage = {
  get:    ()      => storage.get('token'),
  set:    (token) => storage.set('token', token),          // no TTL — JWT has own expiry
  clear:  ()      => storage.remove('token'),
};

export const userStorage = {
  get:    ()     => storage.get('user'),
  set:    (user) => storage.set('user', user, { ttl: 86400 }),  // 24 h
  clear:  ()     => storage.remove('user'),
};

export const workspaceStorage = {
  get:    ()    => storage.get('workspace'),
  set:    (ws)  => storage.set('workspace', ws),
  clear:  ()    => storage.remove('workspace'),
};

export const themeStorage = {
  get:     ()      => storage.get('theme') || 'dark',
  set:     (theme) => storage.set('theme', theme),
};

export const prefsStorage = {
  get:    ()      => storage.get('prefs') || {},
  set:    (prefs) => storage.set('prefs', prefs),
  merge:  (patch) => {
    const cur = prefsStorage.get();
    prefsStorage.set({ ...cur, ...patch });
  },
};

export default storage;
