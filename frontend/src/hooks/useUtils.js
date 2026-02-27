/**
 * Utility hooks used throughout the Forge dashboard.
 *
 * Exports:
 *   useDebounce(value, delay)
 *   useLocalStorage(key, initialValue)
 *   useAsync(asyncFn, deps)
 *   useConfirm()
 *   useMediaQuery(query)
 *   usePrevious(value)
 *   useOnClickOutside(ref, handler)
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// ── useDebounce ───────────────────────────────────────────────────────────────

/**
 * Returns a debounced version of value that only updates after `delay` ms of silence.
 *
 * @example
 *   const debouncedSearch = useDebounce(searchQuery, 350);
 *   useEffect(() => { api.search(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ── useLocalStorage ───────────────────────────────────────────────────────────

/**
 * Synced localStorage state — reads on mount, writes on every update.
 *
 * @example
 *   const [theme, setTheme] = useLocalStorage('forge_theme', 'dark');
 */
export function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const toStore = value instanceof Function ? value(stored) : value;
      setStored(toStore);
      window.localStorage.setItem(key, JSON.stringify(toStore));
    } catch (e) {
      console.error(`useLocalStorage: failed to set "${key}"`, e);
    }
  }, [key, stored]);

  const remove = useCallback(() => {
    window.localStorage.removeItem(key);
    setStored(initialValue);
  }, [key, initialValue]);

  return [stored, setValue, remove];
}

// ── useAsync ──────────────────────────────────────────────────────────────────

/**
 * Manages the lifecycle of an async function call.
 *
 * @example
 *   const { execute, loading, data, error } = useAsync(
 *     () => pipelinesApi.get(id), [id]
 *   );
 */
export function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (...args) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await asyncFn(...args);
      if (mountedRef.current) setState({ loading: false, data, error: null });
      return data;
    } catch (error) {
      if (mountedRef.current) setState({ loading: false, data: null, error });
      throw error;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { execute, ...state };
}

// ── useConfirm ────────────────────────────────────────────────────────────────

/**
 * Programmatic confirmation dialog hook.
 * Works with the ConfirmModal component.
 *
 * @example
 *   const { confirm, ConfirmUI } = useConfirm();
 *   await confirm('Delete this workspace?');    // resolves true | false
 *   // Render <ConfirmUI /> in your JSX
 */
export function useConfirm() {
  const [state, setState] = useState(null); // { message, resolve }

  const confirm = useCallback((message, options = {}) =>
    new Promise((resolve) => {
      setState({ message, resolve, ...options });
    })
  , []);

  const handleDecide = useCallback((answer) => {
    state?.resolve(answer);
    setState(null);
  }, [state]);

  // ConfirmUI renders a minimal inline modal — pair with Modal.jsx in real usage
  function ConfirmUI() {
    if (!state) return null;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(5,7,15,0.85)',
      }}>
        <div style={{
          background: '#090d1a', border: '1px solid #18233d',
          borderRadius: '14px', padding: '24px', maxWidth: '400px', width: '90%',
        }}>
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#dde6f5', lineHeight: 1.6 }}>
            {state.message}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => handleDecide(false)} style={{ background: 'transparent', border: '1px solid #18233d', color: '#8899bb', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              Cancel
            </button>
            <button onClick={() => handleDecide(true)} style={{ background: '#ff3e5e18', border: '1px solid #ff3e5e60', color: '#ff3e5e', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              {state.confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return { confirm, ConfirmUI };
}

// ── useMediaQuery ─────────────────────────────────────────────────────────────

/**
 * Returns true when the CSS media query matches.
 *
 * @example
 *   const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// ── usePrevious ───────────────────────────────────────────────────────────────

/** Returns the previous render's value of `value`. */
export function usePrevious(value) {
  const ref = useRef(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}

// ── useOnClickOutside ─────────────────────────────────────────────────────────

/**
 * Calls handler when a click occurs outside of ref's element.
 *
 * @example
 *   const ref = useRef();
 *   useOnClickOutside(ref, () => setOpen(false));
 *   return <div ref={ref}>…</div>;
 */
export function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
