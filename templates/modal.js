/**
 * CYRABELL DentalMS — Modal Dialog Template
 * ==========================================
 * Use this template for standalone modal dialogs (not the add/edit modals
 * bundled with a page). Examples: confirm dialogs, detail viewers,
 * multi-step wizards, document previews.
 *
 * Replace all <PLACEHOLDER> tokens before use.
 *
 * RULES (same as all components):
 *  - h() only, no JSX
 *  - All hooks are global
 *  - Register on window at the bottom
 *  - No import/require/export
 */

// ===== <MODAL_NAME> MODAL =====
// <Describe what this modal does>
//
// Props:
//   isOpen    {boolean}   Whether the modal is visible
//   onClose   {function}  Called when the user dismisses the modal
//   onConfirm {function}  Called when the user confirms/submits (if applicable)
//   <prop>    {<type>}    <description>
//
// Usage:
//   h(<ModalName>Modal, {
//     isOpen: showModal,
//     onClose: () => setShowModal(false),
//     onConfirm: handleConfirm,
//     data: selectedItem,
//   })

function <ModalName>Modal({
  isOpen,
  onClose,
  onConfirm,
  // data,          // item/record being viewed or acted upon
  // title,         // override default title
}) {

  // ─────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────
  const [step,       setStep]       = useState(1);   // for multi-step modals
  const [busy,       setBusy]       = useState(false);
  const [localError, setLocalError] = useState(null);

  // ─────────────────────────────────────────────
  // RESET STATE WHEN OPENED
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setBusy(false);
      setLocalError(null);
    }
  }, [isOpen]);

  // ─────────────────────────────────────────────
  // KEYBOARD HANDLER
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && !busy) handleConfirm();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, busy]);

  // ─────────────────────────────────────────────
  // FOCUS TRAP (simple)
  // ─────────────────────────────────────────────
  const sheetRef = useRef(null);
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      // Focus the first focusable element
      const el = sheetRef.current.querySelector('button, input, select, textarea, [tabindex]');
      el?.focus();
    }
  }, [isOpen]);

  // ─────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────
  const handleOverlayClick = (e) => {
    // Only close if clicking the dark overlay, not the modal sheet
    if (e.target === e.currentTarget && !busy) onClose();
  };

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setLocalError(null);
    try {
      await onConfirm(/* pass data if needed */);
      onClose();
    } catch(err) {
      setLocalError(err.message || 'Something went wrong');
      setBusy(false);
    }
  };

  // ─────────────────────────────────────────────
  // EARLY RETURN — not open
  // ─────────────────────────────────────────────
  if (!isOpen) return null;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return h(Fragment, null,
    // Overlay backdrop
    h('div', {
      className: 'modal-overlay',
      onClick: handleOverlayClick,
      role: 'presentation',
    },

      // Modal sheet (dialog box)
      h('div', {
        ref: sheetRef,
        className: 'modal-sheet modal-sheet--<size>', // --sm | --md | --lg | --xl | --full
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'modal-title-<modal-id>',
        onClick: e => e.stopPropagation(),  // prevent overlay click from firing
      },

        // ── Header ──────────────────────────────
        h('div', { className: 'modal-header' },
          h('div', { className: 'modal-header__left' },
            // Optional: step indicator for multi-step modals
            // h('span', { className: 'modal-step' }, `Step ${step} of 3`),
            h('h3', {
              id: 'modal-title-<modal-id>',
              className: 'modal-title',
            }, /* title || */ '<Modal Title>'),
          ),
          h('button', {
            className: 'modal-close',
            onClick: onClose,
            'aria-label': 'Close dialog',
            disabled: busy,
          }, '✕')
        ),

        // ── Body ────────────────────────────────
        h('div', { className: 'modal-body' },

          // Error banner
          localError && h('div', { className: 'alert alert--error', role: 'alert' },
            h('strong', null, 'Error: '),
            localError
          ),

          // ── Step 1 ────────────────────────────
          step === 1 && h('div', { className: 'modal-step-panel' },
            h('p', { className: 'modal-description' },
              '<Describe what the user needs to do or what information is shown>'
            ),
            // Content for step 1:
            // h('input', { ... })
            // h(SomeOtherComponent, { ... })
          ),

          // ── Step 2 (if multi-step) ────────────
          // step === 2 && h('div', { className: 'modal-step-panel' },
          //   h('p', null, 'Step 2 content...')
          // ),
        ),

        // ── Footer ──────────────────────────────
        h('div', { className: 'modal-footer' },

          // Left side: back button (multi-step) or secondary action
          h('div', { className: 'modal-footer__left' },
            step > 1 && h('button', {
              className: 'btn btn-outline',
              onClick: () => setStep(s => s - 1),
              disabled: busy,
            }, '← Back'),
          ),

          // Right side: primary actions
          h('div', { className: 'modal-footer__right' },
            h('button', {
              className: 'btn btn-outline',
              onClick: onClose,
              disabled: busy,
            }, 'Cancel'),

            // For multi-step: show Next until final step
            // step < TOTAL_STEPS
            //   ? h('button', {
            //       className: 'btn btn-primary',
            //       onClick: () => setStep(s => s + 1),
            //     }, 'Next →')
            //   : ...

            // Confirm / submit button
            typeof onConfirm === 'function' && h('button', {
              className: 'btn btn-primary',
              onClick: handleConfirm,
              disabled: busy,
            },
              busy
                ? h(Fragment, null, h('span', { className: 'spinner spinner--sm' }), ' Working...')
                : '<Confirm Label>'  // e.g. 'Confirm', 'Save', 'Delete', 'Send'
            )
          )
        ),

        // ── Progress bar (multi-step, optional) ─
        // h('div', { className: 'modal-progress' },
        //   h('div', {
        //     className: 'modal-progress__bar',
        //     style: { width: `${(step / TOTAL_STEPS) * 100}%` }
        //   })
        // ),
      )
    )
  );
}
window.<ModalName>Modal = <ModalName>Modal;


// ─────────────────────────────────────────────────────────────────────────────
// VARIANT: CONFIRM DIALOG
// A minimal yes/no confirmation modal. Use for destructive actions.
//
// Usage:
//   h(ConfirmModal, {
//     isOpen: showConfirm,
//     title: 'Delete Patient?',
//     message: 'This will permanently delete all records for Juan Dela Cruz.',
//     confirmLabel: 'Delete',
//     confirmStyle: 'danger',   // 'danger' | 'primary' | 'warning'
//     onConfirm: () => deletePatient(id),
//     onClose: () => setShowConfirm(false),
//   })
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  confirmStyle = 'danger',   // 'danger' | 'primary'
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const h2 = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h2);
    return () => document.removeEventListener('keydown', h2);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try { await onConfirm(); onClose(); }
    catch(e) { setBusy(false); }
  };

  return h('div', {
    className: 'modal-overlay',
    onClick: e => e.target === e.currentTarget && onClose(),
  },
    h('div', { className: 'modal-sheet modal-sheet--sm', role: 'alertdialog', 'aria-modal': 'true' },
      h('div', { className: 'modal-header' },
        h('h3', { className: 'modal-title' }, title),
        h('button', { className: 'modal-close', onClick: onClose, disabled: busy }, '✕')
      ),
      h('div', { className: 'modal-body' },
        message && h('p', { style: { color: 'var(--md)', lineHeight: 1.6 } }, message)
      ),
      h('div', { className: 'modal-footer' },
        h('div', { className: 'modal-footer__right' },
          h('button', { className: 'btn btn-outline', onClick: onClose, disabled: busy }, 'Cancel'),
          h('button', {
            className: `btn ${confirmStyle === 'danger' ? 'btn-danger' : 'btn-primary'}`,
            onClick: handleConfirm,
            disabled: busy,
          }, busy ? 'Working...' : confirmLabel)
        )
      )
    )
  );
}
window.ConfirmModal = ConfirmModal;


/*
 * ─── CSS ─────────────────────────────────────────────────────────────────────
 * Most modal CSS already exists in cyrabelldental_v2.html. Size modifiers to add:
 *
 * .modal-sheet--sm  { max-width: 420px; }
 * .modal-sheet--md  { max-width: 600px; }   ← default if no modifier
 * .modal-sheet--lg  { max-width: 860px; }
 * .modal-sheet--xl  { max-width: 1100px; }
 * .modal-sheet--full { width: 100vw; height: 100vh; border-radius: 0; }
 *
 * .modal-footer {
 *   display: flex;
 *   align-items: center;
 *   justify-content: space-between;
 *   padding: .75rem 1.25rem;
 *   border-top: 1px solid rgba(0,0,0,.08);
 * }
 * .modal-footer__left, .modal-footer__right {
 *   display: flex;
 *   gap: .5rem;
 * }
 *
 * .modal-progress {
 *   height: 3px;
 *   background: var(--lt);
 * }
 * .modal-progress__bar {
 *   height: 100%;
 *   background: var(--t);
 *   transition: width .3s ease;
 * }
 *
 * .spinner--sm {
 *   width: 14px; height: 14px;
 *   border-width: 2px;
 *   display: inline-block;
 *   vertical-align: middle;
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */
