/**
 * CYRABELL DentalMS — Component Template
 * =======================================
 * Copy this file and replace all <PLACEHOLDER> tokens.
 *
 * RULES:
 *  - Use h() for all elements — NO JSX
 *  - All hooks (useState, useEffect, etc.) are global from the Preact UMD bundle
 *  - Register on window at the bottom so other components can reference it
 *  - Use className (not class), htmlFor (not for)
 *  - style prop must be an object, not a string
 *  - Always set key prop on mapped list items
 *  - No import/require/export statements
 */

// ===== <COMPONENT_NAME> =====
// <Brief description of what this component does>
//
// Props:
//   <propName>  {<type>}  <description>
//   <propName>  {<type>}  <description>  [optional, default: <default>]
//
// Usage:
//   h(<ComponentName>, { prop1: value1, prop2: value2 })

function <ComponentName>({
  // --- required props ---
  // itemId,          // {string} ID of the item to display

  // --- optional props ---
  // onAction,        // {function} Called when the user performs the primary action
  // className = '',  // {string}   Additional CSS class names
  // disabled = false // {boolean}  Whether the component is interactive
}) {

  // ─────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ─────────────────────────────────────────────
  // REFS (for DOM access or stable values)
  // ─────────────────────────────────────────────
  // const containerRef = useRef(null);

  // ─────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────
  useEffect(() => {
    // Load data, subscribe to events, initialize third-party lib, etc.
    // Return a cleanup function if needed.

    let cancelled = false;

    (async () => {
      try {
        // Example: load from localStorage
        // const stored = JSON.parse(localStorage.getItem(LS_KEYS.SOME_KEY) || 'null');
        // if (!cancelled) setData(stored);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      // cleanup: remove event listeners, cancel subscriptions, etc.
    };
  }, [/* itemId */]); // re-run when these deps change

  // ─────────────────────────────────────────────
  // CALLBACKS / HANDLERS
  // ─────────────────────────────────────────────
  const handlePrimaryAction = useCallback(() => {
    // Perform action
    if (typeof onAction === 'function') onAction(data);
  }, [data /*, onAction */]);

  // ─────────────────────────────────────────────
  // DERIVED / MEMOIZED VALUES
  // ─────────────────────────────────────────────
  const displayValue = useMemo(() => {
    if (!data) return '—';
    // Compute something expensive from data
    return String(data);
  }, [data]);

  // ─────────────────────────────────────────────
  // GUARD STATES
  // ─────────────────────────────────────────────
  if (loading) {
    return h('div', { className: 'loading-state' },
      h('span', { className: 'spinner' }),
      'Loading...'
    );
  }

  if (error) {
    return h('div', { className: 'error-state' },
      h('span', { style: { color: 'var(--re)' } }, '⚠ '),
      error
    );
  }

  if (!data) {
    return h('div', { className: 'empty-state' },
      'No data available.'
    );
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return h('div', {
    // Root element
    className: ['<component-name>', /* className */ ''].filter(Boolean).join(' '),
    // Add data-* attrs for testing/debugging:
    // 'data-id': itemId,
  },

    // ── Header ──────────────────────────────────
    h('div', { className: '<component-name>__header' },
      h('h3', { className: '<component-name>__title' },
        '<ComponentName> Title'
      ),
      // Optional action button in header
      h('button', {
        className: 'btn btn-sm btn-primary',
        onClick: handlePrimaryAction,
        // disabled: disabled,
      }, 'Action')
    ),

    // ── Body ────────────────────────────────────
    h('div', { className: '<component-name>__body' },
      h('p', { className: '<component-name>__value' }, displayValue),

      // Example: render a list
      // h('ul', { className: '<component-name>__list' },
      //   data.items?.map(item =>
      //     h('li', { key: item.id, className: '<component-name>__item' },
      //       item.label
      //     )
      //   )
      // ),
    ),

    // ── Footer ──────────────────────────────────
    // h('div', { className: '<component-name>__footer' },
    //   h('span', { className: 'meta' }, 'Last updated: ', data.updatedAt)
    // ),
  );
}

// Register globally so other script tags can reference this component
window.<ComponentName> = <ComponentName>;


/*
 * ─── CSS ─────────────────────────────────────────────────────────────────────
 * Add the following to the <style> block in cyrabelldental_v2.html:
 *
 * // ===== <COMPONENT_NAME> =====
 * .<component-name> {
 *   background: var(--lt);
 *   border-radius: var(--radius);
 *   box-shadow: var(--shadow);
 *   padding: 1rem;
 *   display: flex;
 *   flex-direction: column;
 *   gap: .75rem;
 * }
 * .<component-name>__header {
 *   display: flex;
 *   align-items: center;
 *   justify-content: space-between;
 * }
 * .<component-name>__title {
 *   font-size: 1rem;
 *   font-weight: 600;
 *   color: var(--dk);
 *   margin: 0;
 * }
 * .<component-name>__body {
 *   flex: 1;
 * }
 * .<component-name>__value {
 *   color: var(--md);
 *   font-size: .9rem;
 *   margin: 0;
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */
