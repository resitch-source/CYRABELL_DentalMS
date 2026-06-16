/**
 * CYRABELL DentalMS — Admin Page Template
 * ========================================
 * Use this template when adding a new top-level admin section.
 * Replace all <PLACEHOLDER> tokens before use.
 *
 * Steps after creating the page:
 *  1. Add LS_KEYS entry for data persistence
 *  2. Add nav item in the sidebar navItems array
 *  3. Add router entry:  currentPage === '<page-id>' && h(<PageName>, { currentUser })
 *  4. Insert component before the App function in cyrabelldental_v2.html
 *  5. Do NOT touch index.html
 */

// ===== <PAGE_NAME> PAGE =====
// <Describe what clinic function this page handles>
//
// Nav entry:
//   { id: '<page-id>', label: '<Label>', icon: '<emoji>', roles: ['admin'] }
//
// Router entry:
//   currentPage === '<page-id>' && h(<PageName>, { currentUser })
//
// Required LS_KEY:
//   <PAGE_DATA>: 'cyrabell_<page_data>'

function <PageName>({ currentUser }) {

  // ─────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterCat,  setFilterCat]  = useState('all');
  const [sortKey,    setSortKey]    = useState('name');
  const [showModal,  setShowModal]  = useState(false);
  const [selected,   setSelected]   = useState(null);  // item being edited
  const [toast,      setToast]      = useState(null);  // { msg, type: 'ok'|'err' }

  // ─────────────────────────────────────────────
  // LOAD DATA
  // ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEYS.<PAGE_DATA>) || '[]');
      setItems(stored);
    } catch(e) {
      console.error('<PageName> load:', e);
      showToast('Failed to load data', 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────
  // PERSIST HELPER
  // ─────────────────────────────────────────────
  const save = useCallback((updated) => {
    setItems(updated);
    try {
      localStorage.setItem(LS_KEYS.<PAGE_DATA>, JSON.stringify(updated));
    } catch(e) {
      showToast('Save failed — storage full?', 'err');
    }
  }, []);

  // ─────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ─────────────────────────────────────────────
  // CRUD HANDLERS
  // ─────────────────────────────────────────────
  const handleSave = useCallback((formData) => {
    const updated = selected
      ? items.map(i => i.id === selected.id ? { ...i, ...formData, updatedAt: new Date().toISOString() } : i)
      : [...items, { ...formData, id: Date.now().toString(), createdAt: new Date().toISOString() }];
    save(updated);
    setShowModal(false);
    setSelected(null);
    showToast(selected ? 'Updated successfully' : 'Added successfully');
  }, [items, selected, save, showToast]);

  const handleDelete = useCallback((id) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    save(items.filter(i => i.id !== id));
    showToast('Deleted');
  }, [items, save, showToast]);

  const openEdit = useCallback((item) => {
    setSelected(item);
    setShowModal(true);
  }, []);

  const openNew = useCallback(() => {
    setSelected(null);
    setShowModal(true);
  }, []);

  // ─────────────────────────────────────────────
  // FILTER + SORT
  // ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = items;
    if (filterCat !== 'all') result = result.filter(i => i.category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) =>
      (a[sortKey] || '').toString().localeCompare((b[sortKey] || '').toString())
    );
  }, [items, search, filterCat, sortKey]);

  const categories = useMemo(() =>
    ['all', ...new Set(items.map(i => i.category).filter(Boolean))],
    [items]
  );

  // ─────────────────────────────────────────────
  // ACCESS GUARD
  // ─────────────────────────────────────────────
  // Uncomment and set the appropriate permission:
  // if (!canDo(currentUser, '<permission>')) {
  //   return h('div', { className: 'access-denied' },
  //     h('span', null, '⛔ You do not have permission to view this section.')
  //   );
  // }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return h('div', { className: 'page-panel' },

    // ── Page Header ─────────────────────────────
    h('div', { className: 'page-header' },
      h('div', { className: 'page-header__left' },
        h('h2', { className: 'page-title' }, '<Page Title>'),
        h('span', { className: 'page-subtitle' },
          filtered.length, ' of ', items.length, ' items'
        )
      ),
      h('div', { className: 'page-header__right' },
        h('button', {
          className: 'btn btn-primary',
          onClick: openNew,
        }, '+ Add New')
      )
    ),

    // ── Controls Bar ────────────────────────────
    h('div', { className: 'controls-bar' },
      // Search
      h('div', { className: 'search-wrap' },
        h('input', {
          type: 'search',
          className: 'search-input',
          placeholder: 'Search <page label>...',
          value: search,
          onChange: e => setSearch(e.target.value),
          'aria-label': 'Search',
        })
      ),

      // Category filter tabs
      h('div', { className: 'filter-tabs' },
        categories.map(cat =>
          h('button', {
            key: cat,
            className: ['filter-tab', filterCat === cat ? 'active' : ''].join(' '),
            onClick: () => setFilterCat(cat),
          }, cat === 'all' ? 'All' : cat)
        )
      ),

      // Sort control
      h('select', {
        className: 'sort-select',
        value: sortKey,
        onChange: e => setSortKey(e.target.value),
        'aria-label': 'Sort by',
      },
        h('option', { value: 'name' }, 'Sort: Name'),
        h('option', { value: 'createdAt' }, 'Sort: Newest'),
        h('option', { value: 'category' }, 'Sort: Category')
      )
    ),

    // ── Loading ──────────────────────────────────
    loading && h('div', { className: 'loading-state' },
      h('div', { className: 'spinner' }),
      h('p', null, 'Loading...')
    ),

    // ── Empty State ─────────────────────────────
    !loading && filtered.length === 0 &&
      h('div', { className: 'empty-state' },
        h('div', { className: 'empty-icon' }, '<emoji>'),
        h('h3', null, items.length === 0 ? 'No items yet' : 'No results'),
        h('p', null,
          items.length === 0
            ? 'Get started by adding your first item.'
            : 'Try a different search or filter.'
        ),
        items.length === 0 && h('button', {
          className: 'btn btn-primary',
          onClick: openNew,
        }, '+ Add First Item')
      ),

    // ── Item Grid / List ────────────────────────
    !loading && filtered.length > 0 &&
      h('div', { className: 'items-grid' },
        filtered.map(item =>
          h(<PageName>Card, {
            key: item.id,
            item,
            onEdit:   () => openEdit(item),
            onDelete: () => handleDelete(item.id),
          })
        )
      ),

    // ── Add / Edit Modal ─────────────────────────
    showModal && h(<PageName>Modal, {
      item:    selected,
      onSave:  handleSave,
      onClose: () => { setShowModal(false); setSelected(null); },
    }),

    // ── Toast Notification ───────────────────────
    toast && h('div', {
      className: ['toast', toast.type === 'err' ? 'toast--error' : 'toast--ok'].join(' '),
      role: 'status',
      'aria-live': 'polite',
    }, toast.msg),
  );
}
window.<PageName> = <PageName>;


// ===== <PAGE_NAME> CARD =====
// Individual item card displayed in the grid.

function <PageName>Card({ item, onEdit, onDelete }) {
  return h('div', { className: 'item-card' },
    h('div', { className: 'item-card__icon' }, '<emoji>'),
    h('div', { className: 'item-card__body' },
      h('div', { className: 'item-card__name' }, item.name),
      item.category && h('span', { className: 'badge badge--teal' }, item.category),
      item.notes && h('p', { className: 'item-card__notes' }, item.notes),
    ),
    h('div', { className: 'item-card__meta' },
      h('span', { className: 'meta-text' },
        'Added ', new Date(item.createdAt).toLocaleDateString('en-PH')
      )
    ),
    h('div', { className: 'item-card__actions' },
      h('button', {
        className: 'btn btn-sm btn-outline',
        onClick: onEdit,
        title: 'Edit',
      }, '✏ Edit'),
      h('button', {
        className: 'btn btn-sm btn-danger',
        onClick: onDelete,
        title: 'Delete',
      }, '🗑')
    )
  );
}
window.<PageName>Card = <PageName>Card;


// ===== <PAGE_NAME> MODAL =====
// Add / Edit modal for a single item.

function <PageName>Modal({ item, onSave, onClose }) {
  // Form state initialised from item (edit mode) or empty (add mode)
  const [form, setForm] = useState(() => ({
    name:     item?.name     || '',
    category: item?.category || '',
    notes:    item?.notes    || '',
    // Add more fields as needed
  }));
  const [errors, setErrors] = useState({});

  // Field update helper
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Validation
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    // Add more validation rules
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSave(form);
  };

  // Close on overlay click
  const handleOverlay = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return h('div', { className: 'modal-overlay', onClick: handleOverlay },
    h('div', {
      className: 'modal-sheet',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': item ? 'Edit Item' : 'Add New Item',
    },

      // ── Modal Header ──────────────────────────
      h('div', { className: 'modal-header' },
        h('h3', { className: 'modal-title' },
          item ? 'Edit <Item Label>' : 'New <Item Label>'
        ),
        h('button', {
          className: 'modal-close',
          onClick: onClose,
          'aria-label': 'Close',
        }, '✕')
      ),

      // ── Modal Body ────────────────────────────
      h('div', { className: 'modal-body' },

        // Name field
        h('div', { className: 'form-group' },
          h('label', { htmlFor: 'field-name', className: 'form-label' }, 'Name *'),
          h('input', {
            id: 'field-name',
            type: 'text',
            className: ['form-input', errors.name ? 'input--error' : ''].join(' '),
            value: form.name,
            onChange: e => set('name', e.target.value),
            placeholder: 'Enter name',
            autoFocus: true,
          }),
          errors.name && h('span', { className: 'field-error' }, errors.name)
        ),

        // Category field
        h('div', { className: 'form-group' },
          h('label', { htmlFor: 'field-category', className: 'form-label' }, 'Category'),
          h('input', {
            id: 'field-category',
            type: 'text',
            className: 'form-input',
            value: form.category,
            onChange: e => set('category', e.target.value),
            placeholder: 'e.g. Supplies, Equipment',
          })
        ),

        // Notes field
        h('div', { className: 'form-group' },
          h('label', { htmlFor: 'field-notes', className: 'form-label' }, 'Notes'),
          h('textarea', {
            id: 'field-notes',
            className: 'form-input',
            value: form.notes,
            onChange: e => set('notes', e.target.value),
            rows: 3,
            placeholder: 'Optional notes...',
          })
        ),

        // Add more fields here following the same form-group pattern
      ),

      // ── Modal Footer ──────────────────────────
      h('div', { className: 'modal-footer' },
        h('button', {
          className: 'btn btn-outline',
          onClick: onClose,
        }, 'Cancel'),
        h('button', {
          className: 'btn btn-primary',
          onClick: handleSubmit,
          disabled: !form.name.trim(),
        }, item ? 'Save Changes' : 'Add Item')
      )
    )
  );
}
window.<PageName>Modal = <PageName>Modal;


/*
 * ─── NAV ITEM ────────────────────────────────────────────────────────────────
 * Add this to the navItems array (search for navItems or the sidebar config):
 *
 * { id: '<page-id>', label: '<Nav Label>', icon: '<emoji>', roles: ['admin'] },
 *
 * ─── ROUTER ENTRY ────────────────────────────────────────────────────────────
 * Add this to the page rendering block (search for currentPage === 'patients'):
 *
 * currentPage === '<page-id>' && h(<PageName>, { currentUser }),
 *
 * ─── LS_KEYS ENTRY ───────────────────────────────────────────────────────────
 * Add to the LS_KEYS constant:
 *
 * <PAGE_DATA>: 'cyrabell_<page_data>',
 *
 * ─── CSS ─────────────────────────────────────────────────────────────────────
 * The page uses standard utility classes already defined:
 *   .page-panel, .page-header, .page-title, .page-subtitle
 *   .controls-bar, .search-input, .filter-tabs, .filter-tab.active
 *   .items-grid, .item-card, .btn, .btn-primary, .btn-outline, .btn-danger
 *   .modal-overlay, .modal-sheet, .modal-header, .modal-body, .modal-footer
 *   .form-group, .form-label, .form-input, .field-error, .input--error
 *   .badge, .badge--teal, .empty-state, .loading-state, .toast
 *
 * Add component-specific CSS only if the above classes don't cover it.
 * ─────────────────────────────────────────────────────────────────────────────
 */
