// SVG path generators for each tooth type (viewed from buccal/labial side)
// Coordinates centered at (0,0), tooth height roughly 60, width varies
function toothSvgPath(type, upper) {
  if (type === 'incisor') {
    return {
      crown: 'M -11 -27 Q -12 -30 0 -32 Q 12 -30 11 -27 Q 13 -12 12 5 Q 5 7 0 7 Q -5 7 -12 5 Q -13 -12 -11 -27 Z',
      root:  'M -9 7 Q -10 18 -7 26 Q -4 31 0 32 Q 4 31 7 26 Q 10 18 9 7 Z',
      cej:   'M -12 5 Q 0 8 12 5'
    };
  }
  if (type === 'canine') {
    return {
      crown: 'M 0 -33 Q -4 -28 -12 -18 Q -13 -5 -11 6 Q -5 8 0 8 Q 5 8 11 6 Q 13 -5 12 -18 Q 4 -28 0 -33 Z',
      root:  'M -9 6 Q -11 22 -5 30 Q 0 34 5 30 Q 11 22 9 6 Z',
      cej:   'M -11 6 Q 0 9 11 6'
    };
  }
  if (type === 'premolar') {
    return {
      crown: 'M -13 -24 Q -12 -28 -7 -27 L -2 -21 L 2 -21 L 7 -27 Q 12 -28 13 -24 Q 15 -8 12 6 Q 5 8 0 8 Q -5 8 -12 6 Q -15 -8 -13 -24 Z',
      root:  'M -10 6 Q -12 20 -6 27 Q 0 30 6 27 Q 12 20 10 6 Z',
      cej:   'M -12 6 Q 0 9 12 6'
    };
  }
  // molar
  return {
    crown: 'M -16 -20 Q -15 -26 -10 -25 L -5 -20 L 0 -23 L 5 -20 L 10 -25 Q 15 -26 16 -20 Q 18 -5 14 6 Q 6 9 0 9 Q -6 9 -14 6 Q -18 -5 -16 -20 Z',
    root:  'M -12 6 Q -15 15 -10 22 L -4 24 L 4 24 L 10 22 Q 15 15 12 6 Z',
    cej:   'M -14 6 Q 0 10 14 6',
    furcation: 'M -6 14 Q -4 18 0 19 Q 4 18 6 14'
  };
}

// Anatomical 2.5D tooth — SVG with gradient depth for 3D illusion
// Clinical FDI dental chart — professional layout
// Renders ONE tooth as a 3D-looking SVG with FDI number badge

// Map an FDI tooth to its rendered real-scan sprite base name (mirrors toothModelUrl)
function toothSpriteBase(fdi){
  const type = toothType(fdi);
  const last = Number(String(fdi).slice(-1));
  if (type === 'incisor') return isUpperTooth(fdi) ? 'incisor_upper' : 'incisor_lower';
  if (type === 'canine') return 'canine';
  if (type === 'premolar') {
    const lo = isUpperTooth(fdi) ? '' : '_lower';
    return (last === 4 ? 'premolar_1' : 'premolar_2') + lo;
  }
  // molar: x6 -> 1st, x7 -> 2nd, x8 -> 3rd
  return last === 6 ? 'molar_1' : last === 7 ? 'molar_2' : 'molar_3';
}

function ClinicalTooth({fdi, condition, surfaceData, selected, onSelect, viewMode}){
  // Two view modes: 'buccal' (default - side view) or 'occlusal' (top-down chewing surface)
  viewMode = viewMode || 'buccal';
  const cond = CONDITIONS[condition || 'healthy'];
  const type = toothType(fdi);
  const isUpper = isUpperTooth(fdi);
  const missing = condition === 'missing' || condition === 'extracted';
  const hasIssues = (condition && condition !== 'healthy') ||
                    (surfaceData && Object.values(surfaceData).some(v => v && v !== 'healthy'));

  // ── Real-scan sprite rendering (photogrammetry teeth captured as 2D images) ──
  const spriteView = viewMode === 'occlusal' ? 'top' : 'side';
  const spriteUrl = 'assets/teeth/sprites/' + toothSpriteBase(fdi) + '_' + spriteView + '.png';
  // Surface dot positions as % of the sprite box, per view
  const dotPos = (surf) => {
    if (spriteView === 'top') {
      if (surf === 'mesial') return {left:'8%', top:'50%'};
      if (surf === 'distal') return {left:'92%', top:'50%'};
      if (surf === 'buccal' || surf === 'labial') return {left:'50%', top:'10%'};
      if (surf === 'lingual') return {left:'50%', top:'90%'};
      return {left:'50%', top:'50%'}; // occlusal/incisal centre
    }
    if (surf === 'mesial') return {left:'10%', top:'42%'};
    if (surf === 'distal') return {left:'90%', top:'42%'};
    if (surf === 'occlusal' || surf === 'incisal') return {left:'50%', top: isUpper ? '78%' : '12%'};
    if (surf === 'buccal' || surf === 'labial') return {left:'50%', top:'50%'};
    if (surf === 'lingual') return {left:'50%', top:'58%'};
    return {left:'50%', top:'50%'};
  };
  const washColor = condition && condition !== 'healthy' && !missing ? cond.color : null;
  return h('div', {
    className: 'clin-tooth clin-sprite' + (viewMode === 'occlusal' ? ' occlusal-view' : '') + (selected ? ' sel' : '') + (missing ? ' miss' : '') + (hasIssues ? ' issue' : ''),
    onClick: e => { e.stopPropagation(); onSelect(fdi); },
    onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onSelect(fdi); } },
    tabIndex: 0,
    role: 'button',
    'aria-label': '#' + fdi + ' ' + toothName(fdi) + ' (' + cond.label + ')' + (missing ? ' — missing' : ''),
    'aria-pressed': selected,
    title: '#' + fdi + ' · ' + toothName(fdi) + ' · ' + cond.label,
    style: {position:'relative', width:42, height: spriteView === 'top' ? 42 : 54}
  },
    // base sprite (the real scan)
    h('img', {
      src: spriteUrl, alt: '', draggable: false,
      style: {width:'100%', height:'100%', objectFit:'contain', display:'block',
        opacity: missing ? 0.28 : 1,
        filter: selected ? 'drop-shadow(0 0 3px rgba(10,124,110,.9))' : 'none',
        pointerEvents:'none', userSelect:'none'}
    }),
    // whole-tooth condition wash, masked to the tooth silhouette via the sprite itself
    washColor && h('div', {
      style: {position:'absolute', inset:0, background: washColor, opacity:0.5,
        WebkitMaskImage:'url('+spriteUrl+')', maskImage:'url('+spriteUrl+')',
        WebkitMaskSize:'contain', maskSize:'contain',
        WebkitMaskPosition:'center', maskPosition:'center',
        WebkitMaskRepeat:'no-repeat', maskRepeat:'no-repeat',
        mixBlendMode:'multiply', pointerEvents:'none'}
    }),
    // surface condition markers — sized to be clearly readable in the overview
    surfaceData && Object.entries(surfaceData).map(([surf, cnd]) => {
      if (!cnd || cnd === 'healthy') return null;
      const sCond = CONDITIONS[cnd] || cond;
      const p = dotPos(surf);
      return h('span', {key: surf, title: surf + ': ' + sCond.label,
        style: {position:'absolute', left:p.left, top:p.top, transform:'translate(-50%,-50%)',
          minWidth:11, height:11, borderRadius:6, background:sCond.color,
          border:'1.5px solid '+sCond.stroke,
          boxShadow:'0 0 0 1.5px rgba(255,255,255,.9), 0 1px 4px rgba(0,0,0,.25)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:7, fontWeight:800, color: condFg(cnd),
          pointerEvents:'none', padding:'0 2px'}},
        sCond.symbol || ''
      );
    }),
    // condition symbol badge
    !missing && cond.symbol && h('span', {
      style: {position:'absolute', top:1, right:1, fontSize:9, fontWeight:800, lineHeight:1,
        color: condFg(condition),
        background: condition === 'cavity' ? cond.stroke : 'rgba(255,255,255,.85)',
        borderRadius:4, padding:'1px 3px', pointerEvents:'none'}
    }, cond.symbol),
    // missing-tooth red ✕
    missing && h('svg', {viewBox:'0 0 42 42', style:{position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none'}},
      h('path', {d:'M 10 10 L 32 32 M 32 10 L 10 32', stroke:'#dc2626', strokeWidth:2.5, strokeLinecap:'round'})
    )
  );
}

function ClinicalToothLegacySVG({fdi, condition, surfaceData, selected, onSelect, viewMode}){
  // Two view modes: 'buccal' (default - side view) or 'occlusal' (top-down chewing surface)
  viewMode = viewMode || 'buccal';
  const cond = CONDITIONS[condition || 'healthy'];
  const type = toothType(fdi);
  const isUpper = isUpperTooth(fdi);
  const missing = condition === 'missing';
  const hasIssues = (condition && condition !== 'healthy') ||
                    (surfaceData && Object.values(surfaceData).some(v => v && v !== 'healthy'));

  // Tooth shape varies by type — drawn as SVG with 3D gradient depth
  const w = 38;  // viewport width per tooth (fits in grid cell)
  const hgt = 56;

  // Color logic
  const enamelTop = condition && condition !== 'healthy' ? cond.color : '#fefefe';
  const enamelMid = condition && condition !== 'healthy' ? cond.color : '#f5efe5';
  const enamelBot = condition && condition !== 'healthy' ? cond.stroke : '#d8c8a8';
  const rootColor = '#c4a98a';
  const strokeColor = selected ? '#0a7c6e' : (cond.stroke || '#94a8b3');

  // Build crown path based on tooth type (viewed from outside/buccal)
  const paths = toothSvgPath(type, isUpper);
  const crownPath = paths.crown.replace(/ -(\d)/g, ' -$1');
  const rootPath = paths.root;
  const cejPath = paths.cej;
  const furcPath = paths.furcation;

  const gradId = 'tg-' + fdi;
  // Anatomical orientation: upper teeth hang DOWN (crown below gum), lower teeth point UP (crown above gum)
  const flipY = isUpper ? -1 : 1;

  // For occlusal (top) view, show a different SVG layout
  if (viewMode === 'occlusal') {
    return h('div', {
      className: 'clin-tooth occlusal-view' + (selected ? ' sel' : '') + (missing ? ' miss' : '') + (hasIssues ? ' issue' : ''),
      onClick: e => { e.stopPropagation(); onSelect(fdi); },
      onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onSelect(fdi); } },
      tabIndex: 0,
      role: 'button',
      'aria-label': '#' + fdi + ' ' + toothName(fdi) + ' (' + cond.label + ')' + (missing ? ' — missing' : ''),
      'aria-pressed': selected,
      title: '#' + fdi + ' · ' + toothName(fdi) + ' · ' + cond.label
    },
      h('svg', {
        viewBox: '-20 -16 40 32',
        width: w,
        height: 32,
        style: { display: 'block', overflow: 'visible' }
      },
        h('defs', null,
          h('radialGradient', {id: 'occ-' + fdi, cx: '40%', cy: '35%', r: '65%'},
            h('stop', {offset: '0%', stopColor: '#ffffff', stopOpacity: missing ? 0 : 0.95}),
            h('stop', {offset: '50%', stopColor: enamelMid, stopOpacity: missing ? 0 : 1}),
            h('stop', {offset: '100%', stopColor: enamelBot, stopOpacity: missing ? 0.3 : 1})
          )
        ),
        // Incisor — narrow rounded rectangle, labial curve distinct
        type === 'incisor' && h('path', {
          d: 'M -12 -3 Q -13 0 -12 3 Q -8 5 0 5 Q 8 5 12 3 Q 13 0 12 -3 Q 8 -5 0 -5 Q -8 -5 -12 -3 Z',
          fill: missing ? 'transparent' : 'url(#occ-' + fdi + ')',
          stroke: strokeColor, strokeWidth: 1.2, strokeDasharray: missing ? '3 2' : '0'
        }),
        !missing && type === 'incisor' && h('path', {d: 'M -12 -3 Q 0 -4 12 -3', fill: 'none', stroke: '#9a8a7a', strokeWidth: 0.5, opacity: 0.5}),
        // Canine — rhomboid/kite shape
        type === 'canine' && h('path', {
          d: 'M 0 -9 Q -5 -5 -10 0 Q -5 5 0 7 Q 5 5 10 0 Q 5 -5 0 -9 Z',
          fill: missing ? 'transparent' : 'url(#occ-' + fdi + ')',
          stroke: strokeColor, strokeWidth: 1.2, strokeDasharray: missing ? '3 2' : '0'
        }),
        !missing && type === 'canine' && h('path', {d: 'M 0 -9 L 0 7', fill: 'none', stroke: '#9a8a7a', strokeWidth: 0.5, opacity: 0.5}),
        // Premolar — oval with buccal cusp prominent
        type === 'premolar' && h('ellipse', {
          cx: 0, cy: 0, rx: 12, ry: 8,
          fill: missing ? 'transparent' : 'url(#occ-' + fdi + ')',
          stroke: strokeColor, strokeWidth: 1.2, strokeDasharray: missing ? '3 2' : '0'
        }),
        !missing && type === 'premolar' && h('g', null,
          h('circle', {cx: -4, cy: 0, r: 2.2, fill: '#8a7a6a', opacity: 0.55}),
          h('circle', {cx: 4, cy: 0, r: 1.8, fill: '#8a7a6a', opacity: 0.45}),
          h('path', {d: 'M -4 -6 L -4 6 M 0 -7 L 0 7', fill: 'none', stroke: '#7a6a5a', strokeWidth: 0.5, opacity: 0.4})
        ),
        // Molar — square with rounded corners, 4-5 cusps, fissure pattern
        type === 'molar' && h('path', {
          d: 'M -14 -9 Q -13 -12 -10 -12 Q -5 -12 0 -12 Q 5 -12 10 -12 Q 13 -12 14 -9 Q 15 -5 15 0 Q 15 5 14 9 Q 13 12 10 12 Q 5 12 0 12 Q -5 12 -10 12 Q -13 12 -14 9 Q -15 5 -15 0 Q -15 -5 -14 -9 Z',
          fill: missing ? 'transparent' : 'url(#occ-' + fdi + ')',
          stroke: strokeColor, strokeWidth: 1.2, strokeDasharray: missing ? '3 2' : '0'
        }),
        !missing && type === 'molar' && h('g', null,
          h('circle', {cx: -8, cy: -6, r: 2.4, fill: '#8a7a6a', opacity: 0.55}),
          h('circle', {cx: 8, cy: -6, r: 2.4, fill: '#8a7a6a', opacity: 0.55}),
          h('circle', {cx: -8, cy: 6, r: 2.2, fill: '#8a7a6a', opacity: 0.5}),
          h('circle', {cx: 8, cy: 6, r: 2.2, fill: '#8a7a6a', opacity: 0.5}),
          h('circle', {cx: 0, cy: 0, r: 1.5, fill: '#7a6a5a', opacity: 0.4}),
          h('path', {d: 'M -6 -10 L -2 -2 L 2 -2 L 6 -10', fill: 'none', stroke: '#7a6a5a', strokeWidth: 0.5, opacity: 0.4}),
          h('path', {d: 'M -6 10 L -2 2 L 2 2 L 6 10', fill: 'none', stroke: '#7a6a5a', strokeWidth: 0.5, opacity: 0.4}),
          h('path', {d: 'M -12 0 L -2 0 L 2 0 L 12 0', fill: 'none', stroke: '#7a6a5a', strokeWidth: 0.5, opacity: 0.35})
        ),
        // Missing X
        missing && h('path', {
          d: 'M -14 -10 L 14 10 M 14 -10 L -14 10',
          stroke: '#dc2626', strokeWidth: 2, strokeLinecap: 'round'
        }),
        // Condition symbol
        !missing && cond.symbol && h('text', {
          x: 0, y: 4,
          fontSize: 11, textAnchor: 'middle',
          fill: condFg(condition),
          fontWeight: 700,
        }, cond.symbol),
        // Surface markers
        surfaceData && Object.entries(surfaceData).map(([surf, cnd]) => {
          if (!cnd || cnd === 'healthy') return null;
          const sCond = CONDITIONS[cnd] || cond;
          let cx = 0, cy = 0;
          if (surf === 'mesial') { cx = -14; cy = 0; }
          else if (surf === 'distal') { cx = 14; cy = 0; }
          else if (surf === 'occlusal' || surf === 'incisal') { cx = 0; cy = 0; }
          else if (surf === 'buccal' || surf === 'labial') { cx = 0; cy = -12; }
          else if (surf === 'lingual') { cx = 0; cy = 12; }
          return h('circle', {
            key: surf,
            cx: cx, cy: cy, r: 2.5,
            fill: sCond.color,
            stroke: sCond.stroke,
            strokeWidth: 0.7,
          });
        })
      )
    );
  }

    return h('div', {
    className: 'clin-tooth' + (selected ? ' sel' : '') + (missing ? ' miss' : '') + (hasIssues ? ' issue' : ''),
    onClick: e => { e.stopPropagation(); onSelect(fdi); },
    onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onSelect(fdi); } },
    tabIndex: 0,
    role: 'button',
    'aria-label': '#' + fdi + ' ' + toothName(fdi) + ' (' + cond.label + ')' + (missing ? ' — missing' : ''),
    'aria-pressed': selected,
    title: '#' + fdi + ' · ' + toothName(fdi) + ' · ' + cond.label
  },
    h('svg', {
      viewBox: '-20 -32 40 65',
      width: w,
      height: hgt,
      style: { transform: 'scaleY(' + flipY + ')', display: 'block', overflow: 'visible' }
    },
      h('defs', null,
        // Vertical enamel gradient for 3D depth
        h('linearGradient', {id: gradId, x1: '0%', y1: '0%', x2: '0%', y2: '100%'},
          h('stop', {offset: '0%', stopColor: enamelTop}),
          h('stop', {offset: '45%', stopColor: enamelMid}),
          h('stop', {offset: '100%', stopColor: enamelBot})
        ),
        // Radial highlight for gloss
        h('radialGradient', {id: gradId + '-shine', cx: '30%', cy: '25%', r: '50%'},
          h('stop', {offset: '0%', stopColor: '#ffffff', stopOpacity: missing ? 0 : 0.7}),
          h('stop', {offset: '100%', stopColor: '#ffffff', stopOpacity: 0})
        )
      ),
      // Root
      !missing && h('path', {
        d: rootPath,
        fill: rootColor,
        opacity: 0.55,
        stroke: '#a88560',
        strokeWidth: 0.5
      }),
      // Crown
      !missing && h('path', {
        d: crownPath,
        fill: 'url(#' + gradId + ')',
        stroke: strokeColor,
        strokeWidth: selected ? 1.8 : 1.0,
        strokeLinejoin: 'round'
      }),
      // Gloss overlay
      !missing && h('path', {
        d: crownPath,
        fill: 'url(#' + gradId + '-shine)',
        pointerEvents: 'none'
      }),
      // CEJ line (cementoenamel junction)
      !missing && cejPath && h('path', {d: cejPath, fill: 'none', stroke: '#b09070', strokeWidth: 0.8, opacity: 0.6}),
      // Furcation (molar root split)
      !missing && furcPath && h('path', {d: furcPath, fill: 'none', stroke: '#a08060', strokeWidth: 0.7, opacity: 0.5}),
      // Cusp anatomy markers
      !missing && type === 'molar' && h('g', null,
        h('circle', {cx: -8, cy: -13, r: 1.8, fill: 'none', stroke: enamelBot, strokeWidth: 0.8, opacity: 0.6}),
        h('circle', {cx: 8, cy: -13, r: 1.8, fill: 'none', stroke: enamelBot, strokeWidth: 0.8, opacity: 0.6}),
        h('circle', {cx: -5, cy: -3, r: 1.5, fill: 'none', stroke: enamelBot, strokeWidth: 0.7, opacity: 0.5}),
        h('circle', {cx: 5, cy: -3, r: 1.5, fill: 'none', stroke: enamelBot, strokeWidth: 0.7, opacity: 0.5}),
        h('path', {d: 'M -13 -10 Q 0 -5 13 -10', stroke: '#9a8a7a', strokeWidth: 0.5, fill: 'none', opacity: 0.4})
      ),
      !missing && type === 'premolar' && h('g', null,
        h('circle', {cx: -5, cy: -18, r: 1.8, fill: 'none', stroke: enamelBot, strokeWidth: 0.8, opacity: 0.6}),
        h('circle', {cx: 5, cy: -18, r: 1.8, fill: 'none', stroke: enamelBot, strokeWidth: 0.8, opacity: 0.6}),
        h('path', {d: 'M -5 -21 L 5 -21', stroke: '#9a8a7a', strokeWidth: 0.6, fill: 'none', opacity: 0.4})
      ),
      !missing && type === 'canine' && h('circle', {cx: 0, cy: -30, r: 1.5, fill: '#ffffff', opacity: 0.7}),
      !missing && type === 'incisor' && h('path', {d: 'M -8 -28 Q 0 -30 8 -28', fill: 'none', stroke: '#c8b8a0', strokeWidth: 0.8, opacity: 0.5}),
      // Missing-tooth indicator
      missing && h('g', null,
        h('path', {
          d: 'M -12 -22 L 12 5 M 12 -22 L -12 5',
          stroke: '#dc2626', strokeWidth: 2.5, strokeLinecap: 'round'
        }),
        h('rect', {
          x: -14, y: -25, width: 28, height: 32,
          fill: 'none', stroke: '#dc2626',
          strokeWidth: 1.5, strokeDasharray: '3 2', rx: 4
        })
      ),
      // Condition symbol overlay
      !missing && cond.symbol && h('text', {
        x: 0, y: -8,
        fontSize: 10,
        textAnchor: 'middle',
        fill: condFg(condition),
        fontWeight: 700,
        style: { transform: 'scaleY(' + flipY + ')' }
      }, cond.symbol),
      // Surface markers — small dots on the appropriate edge
      surfaceData && Object.entries(surfaceData).map(([surf, cnd]) => {
        if (!cnd || cnd === 'healthy') return null;
        const sCond = CONDITIONS[cnd] || cond;
        let cx = 0, cy = 0;
        if (surf === 'mesial') { cx = -13; cy = -8; }
        else if (surf === 'distal') { cx = 13; cy = -8; }
        else if (surf === 'occlusal' || surf === 'incisal') { cx = 0; cy = -23; }
        else if (surf === 'buccal' || surf === 'labial') { cx = 0; cy = -2; }
        else if (surf === 'lingual') { cx = 0; cy = 2; }
        return h('circle', {
          key: surf,
          cx: cx, cy: cy, r: 2.2,
          fill: sCond.color,
          stroke: sCond.stroke,
          strokeWidth: 0.7,
        });
      })
    )
  );
}

// ── Sprite-based 2D surface diagram (replaces box-drawing Tooth5SurfaceView) ──
// Shows the real photogrammetry scan sprite with clickable surface zones overlaid.
// Side view: occlusal=top strip, mesial=left strip, distal=right strip,
//            buccal/labial=centre face, lingual=separate button below.
// Top  view: buccal=top, lingual=bottom, mesial=left, distal=right, occ=centre.
function Tooth5SurfaceView({meta, condition, surfaceData, onSurfaceChange, onConditionChange, fdi}) {
  surfaceData = surfaceData || {};
  const type = meta.type;
  const isUpper = isUpperTooth(fdi);
  const [spriteView, setSpriteView] = useState('side'); // 'side' | 'top'
  const [activeSurf, setActiveSurf] = useState(null);
  const [pickerSurf, setPickerSurf] = useState(null); // surface whose condition picker is open
  const cond = CONDITIONS[condition || 'healthy'];
  const isFront = type === 'incisor' || type === 'canine';
  const occSurf  = isFront ? 'incisal'  : 'occlusal';
  const buccSurf = isFront ? 'labial'   : 'buccal';
  const occLabel  = isFront ? 'Incisal'  : 'Occlusal';
  const buccLabel = isFront ? 'Labial'   : 'Buccal';

  const spriteUrl = 'assets/teeth/sprites/' + toothSpriteBase(fdi) + '_' + spriteView + '.png';

  const surfCond  = s => CONDITIONS[surfaceData[s]] || CONDITIONS.healthy;
  const surfColor = s => (surfaceData[s] && surfaceData[s] !== 'healthy') ? surfCond(s).color : null;

  // Mini condition picker inline
  const CondPicker = ({surf}) => h('div', {
    style:{position:'absolute', zIndex:200, top:'105%', left:'50%', transform:'translateX(-50%)',
      background:'#fff', border:'1.5px solid var(--t)', borderRadius:10, padding:8,
      boxShadow:'0 8px 28px rgba(0,0,0,.20)', minWidth:170, marginTop:2}
  },
    h('div', {style:{fontSize:10, fontWeight:700, color:'var(--md)', textTransform:'uppercase', letterSpacing:1, marginBottom:5}}, 'Set condition for ' + surf),
    CONDITION_KEYS.map(k => {
      const c = CONDITIONS[k];
      return h('div', {key:k,
        onClick: e => { e.stopPropagation(); onSurfaceChange(fdi, surf, k); setPickerSurf(null); },
        style:{display:'flex', alignItems:'center', gap:7, padding:'5px 6px', borderRadius:6, cursor:'pointer',
          background: surfaceData[surf] === k ? c.color+'22' : 'transparent',
          border: surfaceData[surf] === k ? '1px solid '+c.stroke : '1px solid transparent', marginBottom:2}},
        h('span', {style:{width:14,height:14,borderRadius:3,background:c.color,border:'1.5px solid '+c.stroke,flexShrink:0}}),
        h('span', {style:{fontSize:11, fontWeight:600, color:'#1e293b'}}, c.label)
      );
    })
  );

  // A surface button — shows label + condition, click → picker
  const SurfBtn = ({surf, label, style:extraStyle}) => {
    const sc = surfCond(surf);
    const active = pickerSurf === surf;
    const hasC = surfaceData[surf] && surfaceData[surf] !== 'healthy';
    return h('div', {style:{position:'relative', ...extraStyle}},
      h('button', {
        type:'button',
        onClick: e => { e.stopPropagation(); setPickerSurf(active ? null : surf); },
        style:{display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, cursor:'pointer',
          fontFamily:'inherit', fontSize:11.5, fontWeight:700,
          border:'1.5px solid '+(active?'var(--t)':hasC?sc.stroke:'var(--bd)'),
          background: active?'var(--tp)': hasC? sc.color+'22' :'#fff',
          color: hasC?sc.stroke:'var(--md)', whiteSpace:'nowrap',
          boxShadow: active?'0 0 0 2px rgba(10,124,110,.18)':'none'}},
        hasC && h('span', {style:{width:10,height:10,borderRadius:2,background:sc.color,border:'1px solid '+sc.stroke,flexShrink:0}}),
        label,
        hasC && h('span', {style:{fontSize:10, fontWeight:800}}, ' '+sc.symbol)
      ),
      active && h(CondPicker, {surf})
    );
  };

  // Zones overlaid on the sprite image (percentage coords of the container)
  // Side view: mesial=left strip, distal=right strip, occ/incisal=top strip, buccal=centre
  // Top  view: mesial=left, distal=right, buccal=top, lingual=bottom, occ=centre
  const ZONES_SIDE = [
    {surf: buccSurf,  label: buccLabel, top:'22%', left:'20%', width:'60%', height:'40%'},
    {surf: occSurf,   label: occLabel,  top:'2%',  left:'20%', width:'60%', height:'20%'},
    {surf: 'mesial',  label: 'Mesial',  top:'22%', left:'2%',  width:'18%', height:'50%'},
    {surf: 'distal',  label: 'Distal',  top:'22%', left:'80%', width:'18%', height:'50%'},
  ];
  const ZONES_TOP = [
    {surf: occSurf,   label: occLabel,  top:'30%', left:'25%', width:'50%', height:'40%'},
    {surf: buccSurf,  label: buccLabel, top:'2%',  left:'20%', width:'60%', height:'28%'},
    {surf: 'lingual', label: 'Lingual', top:'70%', left:'20%', width:'60%', height:'28%'},
    {surf: 'mesial',  label: 'Mesial',  top:'20%', left:'2%',  width:'22%', height:'60%'},
    {surf: 'distal',  label: 'Distal',  top:'20%', left:'76%', width:'22%', height:'60%'},
  ];
  const zones = spriteView === 'top' ? ZONES_TOP : ZONES_SIDE;

  return h('div', {
    style:{display:'flex', flexDirection:'column', alignItems:'center', gap:10, minWidth:220},
    onClick: () => setPickerSurf(null)
  },
    // View toggle
    h('div', {style:{display:'flex', gap:6, alignSelf:'stretch', justifyContent:'center'}},
      [['side','Side (Buccal)'],['top','Top (Occlusal)']].map(([v,l]) =>
        h('button', {key:v, type:'button',
          onClick: e => { e.stopPropagation(); setSpriteView(v); setPickerSurf(null); },
          style:{flex:1, padding:'5px 0', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
            fontSize:11.5, fontWeight:700,
            border:'1.5px solid '+(spriteView===v?'var(--t)':'var(--bd)'),
            background: spriteView===v?'var(--t)':'#fff',
            color: spriteView===v?'#fff':'var(--md)'}}, l)
      )
    ),

    // Sprite + zone overlays
    h('div', {style:{position:'relative', width:220, height: spriteView==='top'?180:260,
      borderRadius:14, overflow:'visible', background:'radial-gradient(ellipse at 50% 40%,#f6f9fb 0%,#e4edf2 100%)',
      border:'1px solid var(--bd)', display:'flex', alignItems:'center', justifyContent:'center'}},
      h('img', {src:spriteUrl, alt:'', draggable:false,
        style:{maxWidth:'88%', maxHeight:'90%', objectFit:'contain', display:'block', pointerEvents:'none', userSelect:'none'}}),
      // per-surface color zone overlays
      zones.map(z => {
        const sc = surfColor(z.surf);
        return h('div', {key:z.surf+'w',
          style:{position:'absolute', top:z.top, left:z.left, width:z.width, height:z.height,
            background: sc ? sc+'55' : 'transparent',
            border: sc ? '2px solid '+surfCond(z.surf).stroke : '2px solid transparent',
            borderRadius:6, pointerEvents:'none', transition:'background .2s'}}
        );
      }),
      // clickable transparent hit zones
      zones.map(z =>
        h('div', {key:z.surf,
          title: z.label + (surfaceData[z.surf] ? ' · '+surfCond(z.surf).label : ' · click to set'),
          onClick: e => { e.stopPropagation(); setPickerSurf(pickerSurf===z.surf?null:z.surf); },
          style:{position:'absolute', top:z.top, left:z.left, width:z.width, height:z.height,
            cursor:'pointer', borderRadius:6, zIndex:10,
            outline: pickerSurf===z.surf?'2.5px solid var(--t)':'none'}}
        )
      ),
      // per-surface label badges on the image
      zones.map(z => {
        const sc = surfCond(z.surf);
        const hasC = surfaceData[z.surf] && surfaceData[z.surf] !== 'healthy';
        const top = parseFloat(z.top)+parseFloat(z.height)/2+'%';
        return h('div', {key:z.surf+'lbl', style:{
          position:'absolute', top:top, left:z.left, width:z.width,
          transform:'translateY(-50%)',
          display:'flex', justifyContent:'center', alignItems:'center', pointerEvents:'none'}},
          h('span', {style:{
            fontSize:9.5, fontWeight:800, textTransform:'uppercase', letterSpacing:.5,
            padding:'2px 5px', borderRadius:5,
            background: hasC ? sc.color : 'rgba(255,255,255,0.80)',
            color: hasC && z.surf==='cavity'?'#fff': hasC ? sc.stroke : '#475569',
            border: '1px solid '+(hasC?sc.stroke:'rgba(0,0,0,.10)'),
            boxShadow:'0 1px 4px rgba(0,0,0,.12)'}},
            z.label + (hasC ? ' '+sc.symbol : ''))
        );
      }),
      // lingual button (only in side view, it's the hidden back face)
      spriteView === 'side' && h('div', {style:{position:'absolute', bottom:-38, left:'50%', transform:'translateX(-50%)', zIndex:20}},
        h('div', {style:{position:'relative'}},
          h('button', {type:'button',
            onClick: e => { e.stopPropagation(); setPickerSurf(pickerSurf==='lingual'?null:'lingual'); },
            style:{padding:'5px 14px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
              fontSize:11.5, fontWeight:700,
              border:'1.5px solid '+(pickerSurf==='lingual'?'var(--t)': surfColor('lingual')?surfCond('lingual').stroke:'var(--bd)'),
              background: pickerSurf==='lingual'?'var(--tp)': surfColor('lingual')? surfCond('lingual').color+'22':'#fff',
              color: surfColor('lingual')?surfCond('lingual').stroke:'var(--md)'}},
            surfColor('lingual')&&h('span',{style:{width:10,height:10,borderRadius:2,background:surfCond('lingual').color,border:'1px solid '+surfCond('lingual').stroke,marginRight:5,display:'inline-block',verticalAlign:'middle'}}),
            'Lingual' + (surfColor('lingual')?' '+surfCond('lingual').symbol:'')
          ),
          pickerSurf === 'lingual' && h(CondPicker, {surf:'lingual'})
        )
      )
    ),

    // Surface summary row
    h('div', {style:{display:'flex', flexWrap:'wrap', gap:5, justifyContent:'center', marginTop: spriteView==='side'?32:6}},
      [buccSurf, occSurf, 'mesial', 'distal', 'lingual'].map(surf => {
        const sc = surfCond(surf);
        const hasC = surfaceData[surf] && surfaceData[surf] !== 'healthy';
        return h('div', {key:surf, style:{position:'relative'}},
          h('button', {type:'button',
            onClick: e => { e.stopPropagation(); setPickerSurf(pickerSurf===surf?null:surf); },
            style:{padding:'4px 9px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
              fontSize:11, fontWeight:700,
              border:'1.5px solid '+(pickerSurf===surf?'var(--t)':hasC?sc.stroke:'var(--bd)'),
              background: pickerSurf===surf?'var(--tp)': hasC? sc.color+'22':'#fff',
              color: hasC?sc.stroke:'var(--md)', display:'flex', alignItems:'center', gap:4}},
            hasC&&h('span',{style:{width:9,height:9,borderRadius:2,background:sc.color,border:'1px solid '+sc.stroke,flexShrink:0}}),
            surf.charAt(0).toUpperCase()+surf.slice(1),
            hasC&&h('span',{style:{fontSize:10}}, ' '+sc.symbol)
          ),
          pickerSurf===surf && h(CondPicker, {surf})
        );
      })
    ),

    // Whole-tooth condition
    h('div', {style:{marginTop:4, padding:'6px 12px', background:'#f0faf8', borderRadius:8,
      border:'1px solid #d0e8e4', display:'flex', alignItems:'center', gap:8, alignSelf:'stretch', justifyContent:'center'}},
      h('span', {style:{fontSize:11, fontWeight:600, color:'var(--md)'}}, 'Whole tooth:'),
      h('span', {style:{width:16,height:16,borderRadius:4,background:cond.color,border:'1.5px solid '+cond.stroke,
        display:'inline-flex',alignItems:'center',justifyContent:'center'}},
        h('span', {style:{fontSize:9,color:condFg(condition),fontWeight:700}}, cond.symbol||'')
      ),
      h('span', {style:{fontSize:12,fontWeight:700,color:'var(--dk)'}}, cond.label)
    ),
    h('div', {style:{fontSize:10, color:'#64748b', textAlign:'center', marginTop:2}}, '👆 Click any surface zone or button to assign a condition')
  );
}

function Tooth5SurfaceViewLegacy({meta, condition, surfaceData, onSurfaceChange, onConditionChange, fdi}) {
  surfaceData = surfaceData || {};
  const [activeSurf, setActiveSurf] = useState(null); // which surface picker is open
  const type = meta.type;
  const isUpper = isUpperTooth(fdi);
  const cond = CONDITIONS[condition || 'healthy'];
  const isFront = type === 'incisor' || type === 'canine';
  const occSurf = isFront ? 'incisal' : 'occlusal';
  const buccSurf = isFront ? 'labial' : 'buccal';
  const occLabel = isFront ? 'Incisal' : 'Occlusal';
  const buccLabel = isFront ? 'Labial' : 'Buccal';

  const surfCond = (s) => CONDITIONS[surfaceData[s]] || CONDITIONS.healthy;
  const surfColor = (s) => surfaceData[s] && surfaceData[s] !== 'healthy' ? surfCond(s).color : '#f8fffe';
  const surfStroke = (s) => surfaceData[s] && surfaceData[s] !== 'healthy' ? surfCond(s).stroke : '#94a3b8';

  const pickCondition = (surf, k) => { onSurfaceChange(fdi, surf, k); setActiveSurf(null); };

  // Mini condition picker popup
  const CondPicker = ({surf}) => h('div', {
    style: {position: 'absolute', zIndex: 50, top: '100%', left: '50%', transform: 'translateX(-50%)',
      background: '#fff', border: '1.5px solid var(--t)', borderRadius: 10, padding: 8,
      boxShadow: '0 8px 28px rgba(0,0,0,.18)', minWidth: 160, marginTop: 4}
  },
    h('div', {style: {fontSize: 10, fontWeight: 700, color: 'var(--md)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5}}, 'Set condition'),
    CONDITION_KEYS.map(k => {
      const c = CONDITIONS[k];
      return h('div', {
        key: k,
        onClick: e => { e.stopPropagation(); pickCondition(surf, k); },
        style: {display: 'flex', alignItems: 'center', gap: 7, padding: '5px 6px',
          borderRadius: 6, cursor: 'pointer', background: surfaceData[surf] === k ? c.color : 'transparent',
          border: surfaceData[surf] === k ? '1px solid '+c.stroke : '1px solid transparent',
          marginBottom: 2, transition: 'all .1s'}
      },
        h('span', {style: {width: 14, height: 14, borderRadius: 3, background: c.color, border: '1.5px solid '+c.stroke,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}},
          h('span', {style: {fontSize: 8, color: condFg(k), fontWeight: 700}}, c.symbol || '')
        ),
        h('span', {style: {fontSize: 11, fontWeight: surfaceData[surf] === k ? 700 : 500, color: '#1e293b'}}, c.label)
      );
    })
  );

  // Surface tile builder — realistic SVG per surface
  const SurfTile = ({surf, label, svgContent, w, h: tileH, topRadius, bottomRadius}) => {
    const isActive = activeSurf === surf;
    const sc = surfCond(surf);
    const cKey = surfaceData[surf] || 'healthy';
    return h('div', {
      style: {position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: w}
    },
      h('div', {
        onClick: e => { e.stopPropagation(); setActiveSurf(isActive ? null : surf); },
        style: {
          width: w, height: tileH, cursor: 'pointer', position: 'relative', overflow: 'hidden',
          borderRadius: (topRadius ? '10px 10px' : '0 0') + ' ' + (bottomRadius ? '10px 10px' : '0 0'),
          border: '2px solid ' + (isActive ? 'var(--t)' : surfStroke(surf)),
          background: surfColor(surf),
          boxShadow: isActive ? '0 0 0 3px rgba(10,124,110,.25)' : '0 2px 6px rgba(0,0,0,.08)',
          transition: 'all .15s',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }
      },
        svgContent,
        h('div', {style: {
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(2px)',
          padding: '3px 4px', textAlign: 'center'
        }},
          h('div', {style: {fontSize: 9, fontWeight: 700, color: 'var(--dk)', textTransform: 'uppercase', letterSpacing: .5}}, label),
          h('div', {style: {fontSize: 9.5, fontWeight: 600, color: cKey !== 'healthy' ? sc.stroke : '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3}},
            cKey !== 'healthy' && h('span', {style: {width: 8, height: 8, borderRadius: 2, background: sc.color, border: '1px solid '+sc.stroke, flexShrink: 0, display: 'inline-block'}}),
            sc.label
          )
        )
      ),
      isActive && h(CondPicker, {surf})
    );
  };

  // SVG helpers for each surface view
  const enamel = cond.color !== '#ffffff' ? cond.color : '#faf6f0';
  const enamelDark = '#d8c8a8';
  const rootCol = '#e8d5b8';
  const flipY = isUpper ? 1 : -1;

  // BUCCAL/LABIAL SVG — front crown + root view
  const BuccalSVG = () => h('svg', {viewBox: '-22 -38 44 72', width: 80, height: 110, style: {overflow: 'visible', flexShrink: 0}},
    h('defs', null,
      h('linearGradient', {id: 'bs-'+fdi, x1:'30%', y1:'0%', x2:'100%', y2:'100%'},
        h('stop', {offset: '0%', stopColor: '#ffffff', stopOpacity: .95}),
        h('stop', {offset: '40%', stopColor: enamel}),
        h('stop', {offset: '100%', stopColor: enamelDark})
      ),
      h('radialGradient', {id: 'bsg-'+fdi, cx:'30%', cy:'25%', r:'55%'},
        h('stop', {offset: '0%', stopColor: '#fff', stopOpacity: .7}),
        h('stop', {offset: '100%', stopColor: '#fff', stopOpacity: 0})
      )
    ),
    h('g', {transform: 'scale(1,' + flipY + ')'},
      // Root
      type === 'molar'
        ? h('g', null,
            h('path', {d:'M -11 7 Q -14 18 -10 26 Q -6 30 -3 29 L -1 8 Z', fill: rootCol, stroke: '#c4a98a', strokeWidth: .8}),
            h('path', {d:'M 11 7 Q 14 18 10 26 Q 6 30 3 29 L 1 8 Z', fill: rootCol, stroke: '#c4a98a', strokeWidth: .8}),
            h('path', {d:'M -1 8 Q 0 25 1 8', fill: '#ddc9a8', stroke: '#c4a98a', strokeWidth: .5})
          )
        : h('path', {d: type==='canine' ? 'M -7 7 Q -9 22 -4 30 Q 0 33 4 30 Q 9 22 7 7 Z'
                      : type==='incisor' ? 'M -8 6 Q -10 20 -5 27 Q 0 30 5 27 Q 10 20 8 6 Z'
                      : 'M -9 7 Q -11 21 -6 28 Q 0 31 6 28 Q 11 21 9 7 Z',
            fill: rootCol, stroke: '#c4a98a', strokeWidth: .8}),
      // Crown
      type === 'incisor' && h('g', null,
        h('path', {d:'M -13 -28 Q -14 -30 0 -33 Q 14 -30 13 -28 Q 15 -12 13 6 Q 6 8 0 8 Q -6 8 -13 6 Q -15 -12 -13 -28 Z', fill:'url(#bs-'+fdi+')', stroke: '#b0a090', strokeWidth:1.2}),
        h('path', {d:'M -13 -28 Q -14 -30 0 -33 Q 14 -30 13 -28 Q 15 -12 13 6 Q 6 8 0 8 Q -6 8 -13 6 Q -15 -12 -13 -28 Z', fill:'url(#bsg-'+fdi+')', pointerEvents:'none'}),
        h('path', {d:'M -8 -30 Q 0 -31 8 -30', fill:'none', stroke:'#c8b8a0', strokeWidth:.8, opacity:.6})
      ),
      type === 'canine' && h('g', null,
        h('path', {d:'M 0 -34 Q -4 -29 -13 -18 Q -14 -4 -12 6 Q -5 9 0 9 Q 5 9 12 6 Q 14 -4 13 -18 Q 4 -29 0 -34 Z', fill:'url(#bs-'+fdi+')', stroke:'#b0a090', strokeWidth:1.2}),
        h('path', {d:'M 0 -34 Q -4 -29 -13 -18 Q -14 -4 -12 6 Q -5 9 0 9 Q 5 9 12 6 Q 14 -4 13 -18 Q 4 -29 0 -34 Z', fill:'url(#bsg-'+fdi+')', pointerEvents:'none'}),
        h('circle', {cx:0, cy:-31, r:1.5, fill:'#fff', opacity:.7})
      ),
      type === 'premolar' && h('g', null,
        h('path', {d:'M -14 -24 Q -13 -29 -7 -28 L -2 -22 L 2 -22 L 7 -28 Q 13 -29 14 -24 Q 16 -8 13 7 Q 6 9 0 9 Q -6 9 -13 7 Q -16 -8 -14 -24 Z', fill:'url(#bs-'+fdi+')', stroke:'#b0a090', strokeWidth:1.2}),
        h('path', {d:'M -14 -24 Q -13 -29 -7 -28 L -2 -22 L 2 -22 L 7 -28 Q 13 -29 14 -24 Q 16 -8 13 7 Q 6 9 0 9 Q -6 9 -13 7 Q -16 -8 -14 -24 Z', fill:'url(#bsg-'+fdi+')', pointerEvents:'none'}),
        h('circle', {cx:-5, cy:-26, r:1.8, fill:'none', stroke: enamelDark, strokeWidth:.7, opacity:.7}),
        h('circle', {cx:5, cy:-26, r:1.8, fill:'none', stroke: enamelDark, strokeWidth:.7, opacity:.7})
      ),
      type === 'molar' && h('g', null,
        h('path', {d:'M -17 -20 Q -16 -27 -10 -26 L -5 -20 L 0 -24 L 5 -20 L 10 -26 Q 16 -27 17 -20 Q 19 -5 15 7 Q 7 10 0 10 Q -7 10 -15 7 Q -19 -5 -17 -20 Z', fill:'url(#bs-'+fdi+')', stroke:'#b0a090', strokeWidth:1.2}),
        h('path', {d:'M -17 -20 Q -16 -27 -10 -26 L -5 -20 L 0 -24 L 5 -20 L 10 -26 Q 16 -27 17 -20 Q 19 -5 15 7 Q 7 10 0 10 Q -7 10 -15 7 Q -19 -5 -17 -20 Z', fill:'url(#bsg-'+fdi+')', pointerEvents:'none'}),
        h('circle', {cx:-9, cy:-15, r:2.2, fill:'none', stroke: enamelDark, strokeWidth:.8, opacity:.6}),
        h('circle', {cx:9, cy:-15, r:2.2, fill:'none', stroke: enamelDark, strokeWidth:.8, opacity:.6}),
        h('path', {d:'M -14 -10 Q 0 -6 14 -10', fill:'none', stroke:'#9a8a7a', strokeWidth:.6, opacity:.4})
      ),
      // CEJ line
      h('path', {d: type==='molar' ? 'M -15 7 Q 0 10 15 7' : type==='canine' ? 'M -12 6 Q 0 9 12 6' : type==='incisor' ? 'M -13 6 Q 0 9 13 6' : 'M -13 7 Q 0 10 13 7',
        fill:'none', stroke:'#b09070', strokeWidth:.9, opacity:.6}),
      // Condition symbol if applicable
      cond.symbol && condition !== 'healthy' && h('text', {x:0, y:-10, fontSize:12, textAnchor:'middle',
        fill: condFg(condition), fontWeight:700, style:{transform:'scaleY('+flipY+')'}}, cond.symbol)
    )
  );

  // LINGUAL SVG — back view (same shape, slightly different curvature emphasis)
  const LingualSVG = () => h('svg', {viewBox: '-22 -38 44 72', width: 80, height: 110, style: {overflow:'visible', flexShrink:0}},
    h('defs', null,
      h('linearGradient', {id:'ls-'+fdi, x1:'70%', y1:'0%', x2:'0%', y2:'100%'},
        h('stop', {offset:'0%', stopColor:'#ffffff', stopOpacity:.9}),
        h('stop', {offset:'45%', stopColor: enamel}),
        h('stop', {offset:'100%', stopColor: enamelDark})
      )
    ),
    h('g', {transform: 'scale(1,' + flipY + ')'},
      // Root (same as buccal)
      type === 'molar'
        ? h('g', null,
            h('path', {d:'M -11 7 Q -14 18 -10 26 Q -6 30 -3 29 L -1 8 Z', fill: rootCol, stroke:'#c4a98a', strokeWidth:.8}),
            h('path', {d:'M 11 7 Q 14 18 10 26 Q 6 30 3 29 L 1 8 Z', fill: rootCol, stroke:'#c4a98a', strokeWidth:.8})
          )
        : h('path', {d: type==='canine' ? 'M -7 7 Q -9 22 -4 30 Q 0 33 4 30 Q 9 22 7 7 Z'
                      : type==='incisor' ? 'M -8 6 Q -10 20 -5 27 Q 0 30 5 27 Q 10 20 8 6 Z'
                      : 'M -9 7 Q -11 21 -6 28 Q 0 31 6 28 Q 11 21 9 7 Z',
            fill: rootCol, stroke:'#c4a98a', strokeWidth:.8}),
      // Lingual crown — slightly concave (cingulum for incisors/canines, oblique ridge for molars)
      type === 'incisor' && h('g', null,
        h('path', {d:'M -11 -27 Q -12 -30 0 -31 Q 12 -30 11 -27 Q 12 -12 10 6 Q 5 8 0 8 Q -5 8 -10 6 Q -12 -12 -11 -27 Z', fill:'url(#ls-'+fdi+')', stroke:'#b0a090', strokeWidth:1.2}),
        h('ellipse', {cx:0, cy:-18, rx:4, ry:3, fill:'none', stroke: enamelDark, strokeWidth:.7, opacity:.5})
      ),
      type === 'canine' && h('g', null,
        h('path', {d:'M 0 -32 Q -3 -28 -11 -18 Q -12 -4 -11 6 Q -5 9 0 9 Q 5 9 11 6 Q 12 -4 11 -18 Q 3 -28 0 -32 Z', fill:'url(#ls-'+fdi+')', stroke:'#b0a090', strokeWidth:1.2}),
        h('ellipse', {cx:0, cy:-20, rx:3, ry:2.5, fill:'none', stroke: enamelDark, strokeWidth:.7, opacity:.5})
      ),
      type === 'premolar' && h('g', null,
        h('path', {d:'M -12 -24 Q -11 -28 -6 -27 L -2 -22 L 2 -22 L 6 -27 Q 11 -28 12 -24 Q 14 -8 11 7 Q 5 9 0 9 Q -5 9 -11 7 Q -14 -8 -12 -24 Z', fill:'url(#ls-'+fdi+')', stroke:'#b0a090', strokeWidth:1.2}),
        h('path', {d:'M -8 -18 Q 0 -14 8 -18', fill:'none', stroke: enamelDark, strokeWidth:.7, opacity:.5})
      ),
      type === 'molar' && h('g', null,
        h('path', {d:'M -15 -20 Q -14 -26 -9 -25 L -4 -19 L 0 -23 L 4 -19 L 9 -25 Q 14 -26 15 -20 Q 17 -5 13 7 Q 6 10 0 10 Q -6 10 -13 7 Q -17 -5 -15 -20 Z', fill:'url(#ls-'+fdi+')', stroke:'#b0a090', strokeWidth:1.2}),
        h('path', {d:'M -10 -15 Q 0 -8 10 -15', fill:'none', stroke: enamelDark, strokeWidth:.8, opacity:.5}),
        h('path', {d:'M -5 -5 Q 0 -2 5 -5', fill:'none', stroke: enamelDark, strokeWidth:.6, opacity:.4})
      ),
      h('path', {d: type==='molar' ? 'M -13 7 Q 0 10 13 7' : type==='canine' ? 'M -11 6 Q 0 9 11 6' : type==='incisor' ? 'M -10 6 Q 0 9 10 6' : 'M -11 7 Q 0 10 11 7',
        fill:'none', stroke:'#b09070', strokeWidth:.9, opacity:.6})
    )
  );

  // MESIAL/DISTAL SVG — narrow proximal view
  const ProxSVG = ({flipped}) => h('svg', {viewBox: '-12 -38 24 72', width: 44, height: 110, style: {overflow:'visible', flexShrink:0}},
    h('defs', null,
      h('linearGradient', {id:'ps-'+fdi+(flipped?'d':'m'), x1:'0%', y1:'0%', x2:'100%', y2:'0%'},
        h('stop', {offset:'0%', stopColor:'#ffffff', stopOpacity:.9}),
        h('stop', {offset:'55%', stopColor: enamel}),
        h('stop', {offset:'100%', stopColor: enamelDark})
      )
    ),
    h('g', {transform: 'scale('+(flipped?-1:1)+','+flipY+')'},
      // Root — narrow side
      h('path', {d:'M -5 7 Q -7 22 -3 30 Q 0 33 3 30 Q 7 22 5 7 Z', fill: rootCol, stroke:'#c4a98a', strokeWidth:.8}),
      // Crown — narrow proximal profile
      type === 'incisor' && h('path', {d:'M -9 -28 Q -10 -30 0 -31 Q 2 -15 1 6 Q -1 8 0 8 Q -3 8 -8 6 Q -10 -12 -9 -28 Z', fill:'url(#ps-'+fdi+(flipped?'d':'m')+')', stroke:'#b0a090', strokeWidth:1}),
      type === 'canine' && h('path', {d:'M 0 -33 Q -3 -24 -9 -14 Q -10 -3 -9 6 Q -4 9 0 8 Q -3 8 -8 6 Q -10 -3 -9 -14 Q -3 -24 0 -33 Z', fill:'url(#ps-'+fdi+(flipped?'d':'m')+')', stroke:'#b0a090', strokeWidth:1}),
      type === 'premolar' && h('path', {d:'M -5 -28 Q -3 -30 0 -29 Q 3 -26 4 -20 Q 9 -12 8 6 Q 4 9 0 8 Q -5 9 -9 6 Q -10 -8 -8 -20 Q -7 -26 -5 -28 Z', fill:'url(#ps-'+fdi+(flipped?'d':'m')+')', stroke:'#b0a090', strokeWidth:1}),
      type === 'molar' && h('path', {d:'M -5 -26 Q -3 -29 0 -28 Q 4 -25 7 -18 Q 10 -8 9 7 Q 5 10 0 9 Q -5 10 -9 7 Q -10 -8 -8 -18 Q -6 -25 -5 -26 Z', fill:'url(#ps-'+fdi+(flipped?'d':'m')+')', stroke:'#b0a090', strokeWidth:1}),
      // Contact area highlight (convex region)
      h('ellipse', {cx:0, cy:-14, rx:4, ry:5, fill:'none', stroke:'#c8b8a0', strokeWidth:.6, opacity:.5}),
      // CEJ
      h('path', {d:'M -8 6 Q 0 9 8 6', fill:'none', stroke:'#b09070', strokeWidth:.8, opacity:.6})
    )
  );

  // OCCLUSAL/INCISAL SVG — top-down view with realistic fissure pattern
  const OccSVG = () => {
    const w = type==='molar' ? 88 : type==='premolar' ? 72 : 60;
    const h_ = type==='molar' ? 72 : type==='premolar' ? 56 : 36;
    return h('svg', {viewBox: '-18 -14 36 28', width: w, height: h_, style: {overflow:'visible', flexShrink:0}},
      h('defs', null,
        h('radialGradient', {id:'os-'+fdi, cx:'40%', cy:'35%', r:'65%'},
          h('stop', {offset:'0%', stopColor:'#ffffff', stopOpacity:.95}),
          h('stop', {offset:'55%', stopColor: enamel}),
          h('stop', {offset:'100%', stopColor: enamelDark})
        )
      ),
      // Outline
      type === 'incisor' && h('path', {d:'M -12 -4 Q -13 0 -12 4 Q -8 6 0 6 Q 8 6 12 4 Q 13 0 12 -4 Q 8 -6 0 -6 Q -8 -6 -12 -4 Z', fill:'url(#os-'+fdi+')', stroke:'#b0a090', strokeWidth:1.2}),
      type === 'canine' && h('path', {d:'M 0 -10 Q -5 -6 -11 0 Q -6 6 0 8 Q 6 6 11 0 Q 5 -6 0 -10 Z', fill:'url(#os-'+fdi+')', stroke:'#b0a090', strokeWidth:1.2}),
      type === 'premolar' && h('ellipse', {cx:0, cy:0, rx:13, ry:8, fill:'url(#os-'+fdi+')', stroke:'#b0a090', strokeWidth:1.2}),
      type === 'molar' && h('path', {d:'M -15 -10 Q -14 -13 -10 -13 Q 0 -13 10 -13 Q 14 -13 15 -10 Q 16 0 15 10 Q 14 13 10 13 Q 0 13 -10 13 Q -14 13 -15 10 Q -16 0 -15 -10 Z', fill:'url(#os-'+fdi+')', stroke:'#b0a090', strokeWidth:1.2}),
      // Anatomical detail
      type === 'incisor' && h('path', {d:'M -12 -4 Q 0 -5 12 -4', fill:'none', stroke:'#9a8a7a', strokeWidth:.5, opacity:.5}),
      type === 'canine' && h('g', null,
        h('path', {d:'M 0 -10 L 0 8', fill:'none', stroke:'#9a8a7a', strokeWidth:.6, opacity:.5}),
        h('circle', {cx:0, cy:-8, r:1.2, fill:'#8a7a6a', opacity:.5})
      ),
      type === 'premolar' && h('g', null,
        h('circle', {cx:-5, cy:0, r:2.5, fill:'#8a7a6a', opacity:.5}),
        h('circle', {cx:5, cy:0, r:2, fill:'#8a7a6a', opacity:.45}),
        h('path', {d:'M -5 -7 L -5 7 M 0 -7 L 0 7', fill:'none', stroke:'#7a6a5a', strokeWidth:.5, opacity:.4})
      ),
      type === 'molar' && h('g', null,
        h('circle', {cx:-9, cy:-7, r:2.8, fill:'#8a7a6a', opacity:.5}),
        h('circle', {cx:9, cy:-7, r:2.8, fill:'#8a7a6a', opacity:.5}),
        h('circle', {cx:-9, cy:7, r:2.5, fill:'#8a7a6a', opacity:.48}),
        h('circle', {cx:9, cy:7, r:2.5, fill:'#8a7a6a', opacity:.48}),
        h('circle', {cx:0, cy:0, r:1.8, fill:'#7a6a5a', opacity:.4}),
        h('path', {d:'M -7 -11 L -3 -2 L 3 -2 L 7 -11', fill:'none', stroke:'#7a6a5a', strokeWidth:.6, opacity:.45}),
        h('path', {d:'M -7 11 L -3 2 L 3 2 L 7 11', fill:'none', stroke:'#7a6a5a', strokeWidth:.6, opacity:.45}),
        h('path', {d:'M -13 0 L -3 0 L 3 0 L 13 0', fill:'none', stroke:'#7a6a5a', strokeWidth:.5, opacity:.35})
      )
    );
  };

  const oW = type==='molar' ? 88 : type==='premolar' ? 72 : 60;

  return h('div', {
    style: {padding: '0 0 8px', minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4},
    onClick: () => setActiveSurf(null)
  },
    h('div', {style: {fontWeight: 700, fontSize: 12, color: 'var(--md)', letterSpacing: .5, marginBottom: 4, textAlign: 'center', textTransform: 'uppercase'}},
      '5-Surface Diagram · Tooth #' + fdi
    ),

    // Row 1: Buccal/Labial (full width)
    h('div', {style: {display:'flex', alignItems:'flex-end', gap:0}},
      h('div', {style:{width:44}}), // spacer for mesial
      h(SurfTile, {surf: buccSurf, label: buccLabel, svgContent: h(BuccalSVG), w: oW + 4, h: 136, topRadius: true, bottomRadius: false}),
      h('div', {style:{width:44}}) // spacer for distal
    ),

    // Row 2: Mesial | Occlusal/Incisal | Distal
    h('div', {style:{display:'flex', alignItems:'stretch', gap:0}},
      h(SurfTile, {surf:'mesial', label:'Mesial', svgContent: h(ProxSVG, {flipped:false}), w:44, h: type==='molar'?96:80, topRadius:false, bottomRadius:false}),
      h(SurfTile, {surf: occSurf, label: occLabel, svgContent: h(OccSVG), w: oW + 4, h: type==='molar'?96:80, topRadius:false, bottomRadius:false}),
      h(SurfTile, {surf:'distal', label:'Distal', svgContent: h(ProxSVG, {flipped:true}), w:44, h: type==='molar'?96:80, topRadius:false, bottomRadius:false})
    ),

    // Row 3: Lingual (full width)
    h('div', {style:{display:'flex', alignItems:'flex-start', gap:0}},
      h('div', {style:{width:44}}),
      h(SurfTile, {surf:'lingual', label:'Lingual', svgContent: h(LingualSVG), w: oW + 4, h: 136, topRadius: false, bottomRadius: true}),
      h('div', {style:{width:44}})
    ),

    // Whole-tooth condition row
    h('div', {style:{marginTop:6, padding:'6px 10px', background:'#f0faf8', borderRadius:8, border:'1px solid #d0e8e4', width:'100%', boxSizing:'border-box', display:'flex', alignItems:'center', gap:8}},
      h('span', {style:{fontSize:11, fontWeight:600, color:'var(--md)'}}, 'Whole tooth:'),
      h('span', {style:{width:16, height:16, borderRadius:4, background: cond.color, border:'1.5px solid '+cond.stroke, display:'inline-flex', alignItems:'center', justifyContent:'center'}},
        h('span', {style:{fontSize:9, color: condFg(condition), fontWeight:700}}, cond.symbol || '')
      ),
      h('span', {style:{fontSize:12, fontWeight:700, color:'var(--dk)'}}, cond.label)
    ),

    // Hint
    h('div', {style:{fontSize:10, color:'#64748b', textAlign:'center', marginTop:2}}, '👆 Click any surface to assign a condition')
  );
}

// Map an FDI tooth number to one of the 8 real photogrammetry scan files
function toothModelUrl(fdi){
  const type = toothType(fdi);
  const last = Number(String(fdi).slice(-1));
  if (type === 'incisor') return isUpperTooth(fdi) ? 'assets/teeth/incisor_upper/scene.gltf' : 'assets/teeth/incisor_lower/scene.gltf';
  if (type === 'canine') return 'assets/teeth/canine/scene.gltf';
  if (type === 'premolar') {
    const lo = isUpperTooth(fdi) ? '' : '_lower';
    return 'assets/teeth/' + (last === 4 ? 'premolar_1' : 'premolar_2') + lo + '/scene.gltf';
  }
  // molar: x6 -> 1st, x7 -> 2nd, x8 -> 3rd
  return last === 6 ? 'assets/teeth/molar_1/scene.gltf' : last === 7 ? 'assets/teeth/molar_2/scene.gltf' : 'assets/teeth/molar_3/scene.gltf';
}

// Real interactive 3D tooth (lazy-loaded scan). Falls back to a 2D view if the
// 3D module is unavailable (e.g. opened via file:// where ES modules are blocked).
function RealTooth3DViewer({fdi, meta, condition, surfaceData, onSurfaceChange, fallback}){
  const hostRef = useRef(null);
  const handleRef = useRef(null);
  // Default active condition to whatever this tooth already has (or cavity if healthy)
  const initCond = (condition && condition !== 'healthy' && condition !== 'missing') ? condition : 'cavity';
  const condRef = useRef(initCond);
  const [selCond, setSelCond] = useState(initCond);
  const [status, setStatus] = useState('init'); // init | loading | ready | unavailable
  condRef.current = selCond;

  useEffect(() => {
    let cancelled = false, tries = 0;
    function tryMount(){
      if (cancelled) return;
      if (!window.CyrabellMountTooth) {
        if (tries++ > 40) { console.warn('[RT3D] CyrabellMountTooth never ready'); setStatus('unavailable'); return; } // ~4s
        return void setTimeout(tryMount, 100);
      }
      if (!hostRef.current) return void setTimeout(tryMount, 100);
      setStatus('loading');
      try {
        handleRef.current = window.CyrabellMountTooth(hostRef.current, {
          modelUrl: toothModelUrl(fdi),
          toothClass: meta.type,
          view: 'iso',
          onReady: () => { if (!cancelled) { setStatus('ready'); handleRef.current && handleRef.current.setSurfaces(surfaceData || {}, CONDITIONS); } },
          onError: (e) => { console.warn('[RT3D] model load error', e); if (!cancelled) setStatus('unavailable'); },
          onPick: (surf) => { if (!cancelled) onSurfaceChange(fdi, surf, condRef.current); }
        });
      } catch(e) { console.warn('[RT3D] mount threw', e); setStatus('unavailable'); }
    }
    tryMount();
    return () => { cancelled = true; if (handleRef.current) { try{ handleRef.current.dispose(); }catch(e){} handleRef.current = null; } };
  // eslint-disable-next-line
  }, [fdi]);

  // push surface changes into the 3D markers
  useEffect(() => {
    if (status === 'ready' && handleRef.current) handleRef.current.setSurfaces(surfaceData || {}, CONDITIONS);
  }, [surfaceData, status]);

  if (status === 'unavailable') {
    return h('div', null,
      h('div', {style:{fontSize:11.5, color:'var(--md)', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:'7px 10px', marginBottom:10}},
        '⚠ Real 3D view needs the app served over http(s). Showing 2D surface view.'),
      fallback
    );
  }

  return h('div', {className:'rt3d-wrap'},
    h('div', {ref: hostRef, className:'rt3d-canvas',
      style:{position:'relative', width:'100%', height:340, borderRadius:12,
        background:'radial-gradient(120% 120% at 50% 14%,#fbfdff 0%,#e6eef3 55%,#d3e0e8 100%)',
        border:'1px solid var(--bd)', overflow:'hidden'}},
      status !== 'ready' && h('div', {style:{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--md)', fontSize:13, fontWeight:600}}, 'Loading real 3D scan…')
    ),
    // condition palette — pick one, then click a surface on the model
    h('div', {style:{marginTop:10}},
      h('div', {style:{display:'flex', alignItems:'center', gap:8, marginBottom:6}},
        h('div', {style:{fontSize:11, color:'var(--md)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', flex:1}},
          'Pick condition · then click a surface on the tooth'),
        h(VoiceMicBtn, {title:'Say e.g. "cavity on mesial" or "filling distal"',
          onResult: t => {
            const p = parseDentalCommand(t, null, null);
            if (p.condition) setSelCond(p.condition);
            if (p.condition && p.surface) onSurfaceChange(fdi, p.surface, p.condition);
          }
        })
      ),
      h('div', {style:{display:'flex', flexWrap:'wrap', gap:5}},
        CONDITION_KEYS.filter(k=>k!=='healthy').map(k => {
          const c = CONDITIONS[k]; const active = selCond === k;
          return h('button', {key:k, type:'button',
            onClick: () => setSelCond(k),
            title: c.desc,
            style:{display:'flex', alignItems:'center', gap:5, padding:'4px 9px', borderRadius:20, cursor:'pointer',
              fontSize:11.5, fontWeight:600, fontFamily:'inherit',
              border:'1.5px solid ' + (active ? 'var(--t)' : 'var(--bd)'),
              background: active ? 'var(--tp)' : '#fff', color:'var(--dk)',
              boxShadow: active ? '0 0 0 2px rgba(10,124,110,.15)' : 'none'}},
            h('span', {style:{width:12, height:12, borderRadius:3, background:c.color, border:'1px solid '+c.stroke}}),
            c.label);
        })
      )
    ),
    // view buttons
    h('div', {style:{display:'flex', flexWrap:'wrap', gap:5, marginTop:8}},
      [['front','Front'],['left','Left'],['right','Right'],['back','Back'],['top','Top'],['iso','3D']].map(([v,l]) =>
        h('button', {key:v, type:'button',
          onClick: () => handleRef.current && handleRef.current.setView(v),
          style:{padding:'5px 10px', borderRadius:7, border:'1.5px solid var(--bd)', background:'#fff',
            fontSize:11.5, fontWeight:600, color:'var(--md)', cursor:'pointer', fontFamily:'inherit'}}, l)
      )
    ),
    h('div', {style:{fontSize:10.5, color:'var(--lt)', marginTop:7}},
      '🖱 Drag to rotate · scroll to zoom · click a surface to chart it. Real scan — University of Dundee (CC-BY-4.0).')
  );
}

// Per-tooth detail modal — opens when a tooth is selected
function ToothDetailModal({fdi, condition, surfaceData, patientHistory, onClose, onConditionChange, onSurfaceChange}){
  const [view, setView] = useState('overview'); // 'overview' | 'surfaces' | 'clinical' | 'history'

  const meta = toothMetadata(fdi);
  const cond = CONDITIONS[condition || 'healthy'];
  const isUpper = isUpperTooth(fdi);
  surfaceData = surfaceData || {};

  const baseColor = cond.color;

  return h(Modal, {
    title: '🦷 Tooth #' + fdi + ' Detail',
    sub: meta.name + ' · ' + meta.quadrant,
    onClose, xl: true,
    footer: h('button', {className: 'btn bgh', onClick: onClose}, 'Close')
  },
    h('div', {className: 'tooth-detail-grid'},
      // ─── Left: real interactive 3D scan (falls back to 2D surface diagram) ──
      h('div', {className: 'tooth-detail-3d'},
        h(RealTooth3DViewer, {
          fdi, meta, condition, surfaceData, onSurfaceChange,
          fallback: h(Tooth5SurfaceView, {meta, condition, surfaceData, onSurfaceChange, onConditionChange, fdi})
        })
      ),

      // ─── Right: Info & controls ────────────────────────────────────────
      h('div', {className: 'tooth-detail-info'},
        // Tabs
        h('div', {className: 'tooth-detail-tabs'},
          [['overview','📋 Overview'],['surfaces','🎯 Surfaces'],['clinical','📋 History'],['history','📚 FDI Info']].map(([v,l]) =>
            h('button', {key: v, type: 'button', className: 'td-tab' + (view===v?' act':''), onClick: () => setView(v)}, l)
          )
        ),

        // OVERVIEW: condition picker
        view === 'overview' && h('div', null,
          h('div', {className: 'td-cur-condition'},
            h('div', {className: 'td-cur-swatch', style: {background: baseColor, border: '2px solid ' + cond.stroke}},
              cond.symbol && h('span', {style: {color: condFg(condition), fontSize: 18}}, cond.symbol)
            ),
            h('div', null,
              h('div', {style: {fontSize: 11, color: 'var(--md)', textTransform: 'uppercase', letterSpacing: '1px'}}, 'Current Condition'),
              h('div', {style: {fontWeight: 700, fontSize: 16}}, cond.label),
              h('div', {style: {fontSize: 12, color: 'var(--md)', marginTop: 2}}, cond.desc)
            )
          ),
          h('div', {style: {fontWeight: 600, fontSize: 13, marginTop: 14, marginBottom: 7}}, 'Change condition:'),
          h('div', {className: 'te-grid'},
            CONDITION_KEYS.map(k => {
              const c = CONDITIONS[k];
              const active = condition === k;
              return h('button', {
                key: k, type: 'button',
                className: 'te-btn' + (active ? ' active' : ''),
                onClick: () => onConditionChange(fdi, k),
                title: c.desc
              },
                h('div', {className: 'te-swatch', style: {background: c.color, border: '1.5px solid ' + c.stroke}},
                  c.symbol && h('span', {style: {fontSize: 10, color: condFg(k)}}, c.symbol)
                ),
                h('div', {className: 'te-lbl'}, c.label)
              );
            })
          )
        ),

        // SURFACES: realistic per-surface 2D tooth drawings (FDI-coloured)
        view === 'surfaces' && h('div', {style: {padding: '0 2px'}},
            h('div', {style: {fontWeight: 600, fontSize: 12.5, marginBottom: 8, color: 'var(--dk)'}}, '2D Surface Map — click any surface drawing to assign a condition'),
            h(Tooth5SurfaceViewLegacy, {meta, condition, surfaceData, onSurfaceChange, onConditionChange, fdi}),
            // FDI condition colour key
            h('div', {style: {marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4}},
              CONDITION_KEYS.map(k => {
                const c = CONDITIONS[k];
                return h('div', {key: k, style: {display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 5px', borderRadius: 4, border: '1px solid ' + c.stroke, background: c.color}},
                  h('span', {style: {fontSize: 9, fontWeight: 700, color: condFg(k)}}, c.symbol || '○'),
                  h('span', {style: {color: condFg(k), fontWeight: 500}}, c.label)
                );
              })
            )
          ),

        // CLINICAL HISTORY: appointments that touched this tooth
        view === 'clinical' && h('div', {className:'td-clinical-hist'},
          (() => {
            const entries = safe(patientHistory).filter(h =>
              safe(h.procedures).some(p => +p.fdi === +fdi)
            );
            if (!entries.length) return h('div', {style:{color:'var(--md)',fontSize:12,textAlign:'center',padding:'24px 0'}},
              'No clinical history recorded for this tooth yet.\nProcedures applied via completed appointments will appear here.'
            );
            return entries.map(e => {
              const toothProcs = safe(e.procedures).filter(p => +p.fdi === +fdi);
              return h('div', {key:e.id, className:'td-hist-entry'},
                h('div', {className:'td-hist-header'},
                  h('span', {className:'td-hist-date'}, fmtDate(e.date)),
                  h('span', {className:'td-hist-dentist'}, e.dentist||'—')
                ),
                safe(e.services).length > 0 && h('div', {className:'td-hist-services'},
                  'Service: '+safe(e.services).join(', ')
                ),
                toothProcs.map((p,i) => {
                  const c = CONDITIONS[p.condition]||CONDITIONS.healthy;
                  return h('div', {key:i, className:'td-hist-proc'},
                    h('span', {style:{width:10,height:10,borderRadius:2,background:c.color,border:'1px solid '+c.stroke,
                      display:'inline-block',marginRight:5,verticalAlign:'middle'}}),
                    h('strong', null, c.symbol+' '+c.label),
                    p.surface && h('span', {style:{color:'var(--md)',fontSize:11}}, ' · '+p.surface),
                    p.note && h('span', {style:{color:'var(--md)',fontSize:11}}, ' — '+p.note)
                  );
                })
              );
            });
          })()
        ),

        // FDI INFO: complete FDI metadata
        view === 'history' && h('div', {className: 'td-info-list'},
          h('div', {className: 'td-info-row'},
            h('span', {className: 'td-info-lbl'}, 'FDI Number'),
            h('span', {className: 'td-info-val', style: {fontWeight: 700, color: 'var(--t)'}}, '#' + fdi)
          ),
          h('div', {className: 'td-info-row'},
            h('span', {className: 'td-info-lbl'}, 'Name'),
            h('span', {className: 'td-info-val'}, meta.name)
          ),
          h('div', {className: 'td-info-row'},
            h('span', {className: 'td-info-lbl'}, 'Type'),
            h('span', {className: 'td-info-val'}, meta.type.charAt(0).toUpperCase() + meta.type.slice(1))
          ),
          h('div', {className: 'td-info-row'},
            h('span', {className: 'td-info-lbl'}, 'Jaw'),
            h('span', {className: 'td-info-val'}, meta.jaw)
          ),
          h('div', {className: 'td-info-row'},
            h('span', {className: 'td-info-lbl'}, 'Quadrant'),
            h('span', {className: 'td-info-val'}, meta.quadrant + ' (Q' + Math.floor(fdi/10) + ')')
          ),
          h('div', {className: 'td-info-row'},
            h('span', {className: 'td-info-lbl'}, 'Position'),
            h('span', {className: 'td-info-val'}, meta.position + ' from midline')
          ),
          h('div', {className: 'td-info-row'},
            h('span', {className: 'td-info-lbl'}, 'Function'),
            h('span', {className: 'td-info-val'}, meta.function)
          ),
          h('div', {className: 'td-info-row'},
            h('span', {className: 'td-info-lbl'}, 'Roots'),
            h('span', {className: 'td-info-val'}, meta.roots + (meta.roots === 1 ? ' (single-rooted)' : ' (multi-rooted)'))
          ),
          h('div', {className: 'td-info-row'},
            h('span', {className: 'td-info-lbl'}, 'Cusps'),
            h('span', {className: 'td-info-val'}, meta.cusps === 0 ? 'None (sharp edge)' : meta.cusps + ' cusp' + (meta.cusps>1?'s':''))
          ),
          h('div', {className: 'td-info-row'},
            h('span', {className: 'td-info-lbl'}, 'Eruption age'),
            h('span', {className: 'td-info-val'}, meta.eruptionAge)
          ),
          h('div', {className: 'td-info-row'},
            h('span', {className: 'td-info-lbl'}, 'Surfaces'),
            h('span', {className: 'td-info-val', style: {fontSize: 11}}, meta.surfaces.join(', '))
          ),
          h('div', {style: {marginTop: 14, padding: 11, background: 'var(--cr)', borderRadius: 9, fontSize: 12, lineHeight: 1.6, color: 'var(--md)'}},
            h('strong', null, 'FDI Notation: '),
            'First digit = quadrant (1=upper-right, 2=upper-left, 3=lower-left, 4=lower-right). ',
            'Second digit = position from midline (1=central incisor → 8=wisdom tooth).'
          )
        )
      )
    )
  );
}

// Single tooth side-view (used inside the detail modal for each face of the cube)
function SingleTooth3D({meta, condition, baseColor, narrow}){
  const cond = CONDITIONS[condition || 'healthy'];
  const path = toothSvgPath(meta.type, isUpperTooth(meta.fdi));
  const w = narrow ? 50 : 100;
  const hgt = 180;
  const strokeColor = cond.stroke;
  const enamelLight = condition === 'healthy' || !condition ? '#ffffff' : baseColor;
  const enamelDark = cond.stroke;
  const flipY = isUpperTooth(meta.fdi) ? 1 : -1;
  return h('svg', {
    width: w, height: hgt,
    viewBox: narrow ? '-8 -35 16 70' : '-15 -35 30 70',
    style: {transform: 'scaleY(' + flipY + ')', overflow: 'visible'}
  },
    h('defs', null,
      h('linearGradient', {id: 'big-enamel-' + meta.fdi + (narrow?'-n':''), x1: '0%', y1: '0%', x2: '0%', y2: '100%'},
        h('stop', {offset: '0%', stopColor: enamelLight}),
        h('stop', {offset: '50%', stopColor: baseColor}),
        h('stop', {offset: '100%', stopColor: enamelDark})
      ),
      h('radialGradient', {id: 'big-shine-' + meta.fdi + (narrow?'-n':''), cx: '40%', cy: '25%', r: '60%'},
        h('stop', {offset: '0%', stopColor: '#ffffff', stopOpacity: 0.7}),
        h('stop', {offset: '100%', stopColor: baseColor, stopOpacity: 0})
      )
    ),
    // Root
    h('path', {
      d: path.root,
      fill: condition === 'missing' ? 'transparent' : '#f0e4d6',
      stroke: condition === 'missing' ? '#e05252' : '#c4a98a',
      strokeWidth: 1,
      strokeDasharray: condition === 'missing' ? '3 3' : '0',
      transform: narrow ? 'scale(0.4 1)' : ''
    }),
    // Crown
    h('path', {
      d: path.crown,
      fill: 'url(#big-enamel-' + meta.fdi + (narrow?'-n':'') + ')',
      stroke: strokeColor,
      strokeWidth: 1.5,
      strokeLinejoin: 'round',
      transform: narrow ? 'scale(0.5 1)' : ''
    }),
    // Shine overlay
    condition !== 'missing' && h('path', {
      d: path.crown,
      fill: 'url(#big-shine-' + meta.fdi + (narrow?'-n':'') + ')',
      transform: narrow ? 'scale(0.5 1)' : ''
    }),
    // Anatomical markings
    meta.type === 'molar' && condition !== 'missing' && !narrow && h('g', null,
      h('circle', {cx: -7, cy: -16, r: 2, fill: enamelDark, opacity: 0.6}),
      h('circle', {cx: 7, cy: -16, r: 2, fill: enamelDark, opacity: 0.6}),
      h('circle', {cx: -6, cy: -5, r: 1.5, fill: enamelDark, opacity: 0.6}),
      h('circle', {cx: 6, cy: -5, r: 1.5, fill: enamelDark, opacity: 0.6}),
      h('path', {d: 'M 0 -22 L 0 0', stroke: '#7a6b5a', strokeWidth: 0.6, opacity: 0.5})
    ),
    meta.type === 'premolar' && condition !== 'missing' && !narrow && h('g', null,
      h('circle', {cx: -5, cy: -22, r: 2, fill: enamelDark, opacity: 0.6}),
      h('circle', {cx: 5, cy: -22, r: 2, fill: enamelDark, opacity: 0.6}),
      h('path', {d: 'M -3 -22 L 3 -22', stroke: '#7a6b5a', strokeWidth: 0.6, opacity: 0.5})
    ),
    meta.type === 'canine' && condition !== 'missing' && !narrow && h('circle', {cx: 0, cy: -28, r: 1.5, fill: '#ffffff', opacity: 0.8}),
    // Condition symbol overlay
    cond.symbol && h('text', {
      x: 0, y: -8,
      fontSize: 14,
      textAnchor: 'middle',
      fill: condFg(condition),
      fontWeight: 'bold',
      style: {transform: 'scaleY(' + flipY + ')'},
    }, cond.symbol)
  );
}

// Top-down (occlusal/incisal) view of a tooth
function SingleToothTop({meta, condition, baseColor}){
  const cond = CONDITIONS[condition || 'healthy'];
  const w = meta.type === 'molar' ? 100 : meta.type === 'premolar' ? 80 : 60;
  return h('svg', {
    width: w, height: w * 0.7,
    viewBox: '-15 -10 30 20',
    style: {overflow: 'visible'}
  },
    h('defs', null,
      h('radialGradient', {id: 'top-' + meta.fdi, cx: '50%', cy: '50%', r: '70%'},
        h('stop', {offset: '0%', stopColor: '#ffffff', stopOpacity: 0.9}),
        h('stop', {offset: '60%', stopColor: baseColor, stopOpacity: 1}),
        h('stop', {offset: '100%', stopColor: cond.stroke, stopOpacity: 1})
      )
    ),
    meta.type === 'incisor' && h('rect', {x: -10, y: -2, width: 20, height: 4, rx: 1, fill: 'url(#top-' + meta.fdi + ')', stroke: cond.stroke, strokeWidth: 0.6}),
    meta.type === 'canine' && h('polygon', {points: '-8,2 0,-6 8,2 0,4', fill: 'url(#top-' + meta.fdi + ')', stroke: cond.stroke, strokeWidth: 0.6}),
    meta.type === 'premolar' && h('ellipse', {cx: 0, cy: 0, rx: 9, ry: 5.5, fill: 'url(#top-' + meta.fdi + ')', stroke: cond.stroke, strokeWidth: 0.6}),
    meta.type === 'molar' && h('rect', {x: -12, y: -7, width: 24, height: 14, rx: 3, fill: 'url(#top-' + meta.fdi + ')', stroke: cond.stroke, strokeWidth: 0.6}),
    // Cusp markers from top view
    meta.type === 'molar' && condition !== 'missing' && h('g', null,
      h('circle', {cx: -7, cy: -3.5, r: 1, fill: '#7a6b5a', opacity: 0.6}),
      h('circle', {cx: 7, cy: -3.5, r: 1, fill: '#7a6b5a', opacity: 0.6}),
      h('circle', {cx: -7, cy: 3.5, r: 1, fill: '#7a6b5a', opacity: 0.6}),
      h('circle', {cx: 7, cy: 3.5, r: 1, fill: '#7a6b5a', opacity: 0.6}),
      h('path', {d: 'M 0 -5 L 0 5', stroke: '#7a6b5a', strokeWidth: 0.4, opacity: 0.5}),
      h('path', {d: 'M -10 0 L 10 0', stroke: '#7a6b5a', strokeWidth: 0.4, opacity: 0.5})
    ),
    meta.type === 'premolar' && condition !== 'missing' && h('g', null,
      h('circle', {cx: -4, cy: 0, r: 1.2, fill: '#7a6b5a', opacity: 0.6}),
      h('circle', {cx: 4, cy: 0, r: 1.2, fill: '#7a6b5a', opacity: 0.6}),
      h('path', {d: 'M 0 -4 L 0 4', stroke: '#7a6b5a', strokeWidth: 0.4, opacity: 0.5})
    )
  );
}

function surfaceDescription(s, type){
  const map = {
    mesial: 'Toward midline',
    distal: 'Away from midline',
    occlusal: 'Chewing surface (back teeth)',
    incisal: 'Cutting edge (front teeth)',
    buccal: 'Toward cheek',
    labial: 'Toward lips',
    lingual: 'Toward tongue/palate',
  };
  return map[s] || '';
}

// Main dental chart (overview)
function DentalChart3D({teethData, patientHistory, onToothEdit}){
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('buccal'); // 'buccal' (side) | 'occlusal' (top)

  // FDI standard chart layout:
  //   Upper arch (Maxilla): Right side (Q1) then left side (Q2) — viewer's perspective
  //   FDI Q1 = upper right:  18 17 16 15 14 13 12 11   |   21 22 23 24 25 26 27 28  = Q2 upper left
  //   FDI Q4 = lower right:  48 47 46 45 44 43 42 41   |   31 32 33 34 35 36 37 38  = Q3 lower left
  // We split into two rows of two halves so the midline is always centered.

  const Q1 = [18,17,16,15,14,13,12,11];
  const Q2 = [21,22,23,24,25,26,27,28];
  const Q4 = [48,47,46,45,44,43,42,41];
  const Q3 = [31,32,33,34,35,36,37,38];

  // Stats
  const conditionsTotal = Object.entries(teethData)
    .filter(([k,v]) => v && v !== 'healthy' && !k.includes('_surfaces'))
    .length;
  const surfacesTotal = Object.entries(teethData)
    .filter(([k,v]) => k.includes('_surfaces') && v && typeof v === 'object')
    .reduce((sum,[,v]) => sum + Object.values(v).filter(x => x && x !== 'healthy').length, 0);

  const renderTooth = (fdi) => h(ClinicalTooth, {
    key: fdi,
    fdi,
    condition: teethData[fdi],
    surfaceData: teethData[fdi + '_surfaces'],
    selected: selected === fdi,
    onSelect: setSelected,
    viewMode: viewMode,
  });

  return h('div', {className: 'fdi-chart'},
    // Chart title bar
    h('div', {className: 'fdi-title-bar'},
      h('div', null,
        h('div', {className: 'fdi-chart-title'}, 'Dental Chart'),
        h('div', {className: 'fdi-chart-sub'}, 'FDI World Dental Federation notation')
      ),
      // View toggle
      h('div', {className: 'fdi-view-toggle'},
        h('button', {
          type: 'button',
          className: 'fdi-view-btn' + (viewMode === 'buccal' ? ' act' : ''),
          onClick: () => setViewMode('buccal'),
          title: 'Buccal/labial view (side)'
        }, '🦷 Side View'),
        h('button', {
          type: 'button',
          className: 'fdi-view-btn' + (viewMode === 'occlusal' ? ' act' : ''),
          onClick: () => setViewMode('occlusal'),
          title: 'Occlusal/incisal view (top)'
        }, '👁 Top View')
      ),
      h('div', {className: 'fdi-stats'},
        h('div', {className: 'fdi-stat'},
          h('div', {className: 'fdi-stat-num'}, conditionsTotal),
          h('div', {className: 'fdi-stat-lbl'}, 'whole-tooth')
        ),
        h('div', {className: 'fdi-stat'},
          h('div', {className: 'fdi-stat-num'}, surfacesTotal),
          h('div', {className: 'fdi-stat-lbl'}, 'surfaces')
        ),
        h('div', {className: 'fdi-stat'},
          h('div', {className: 'fdi-stat-num'}, 32 - conditionsTotal),
          h('div', {className: 'fdi-stat-lbl'}, 'healthy')
        )
      )
    ),

    // The main chart - upper arch on top, lower on bottom
    // Upper gum strip (above upper teeth - matches real anatomy when looking at patient's mouth)
    h('div', {className: 'fdi-gum fdi-gum-upper'}),
    h('div', {className: 'fdi-arch fdi-upper'},
      // Quadrant labels (right of viewer = patient's left)
      h('div', {className: 'fdi-quad-lbl fdi-q1-lbl'}, 'Q1 · Upper Right'),
      h('div', {className: 'fdi-quad-lbl fdi-q2-lbl'}, 'Q2 · Upper Left'),
      // Q1 row (8 → 1, right to centerline)
      h('div', {className: 'fdi-row fdi-q1'},
        Q1.map(fdi =>
          h('div', {key: fdi, className: 'fdi-cell'},
            h('div', {className: 'fdi-num fdi-num-top'}, fdi),
            renderTooth(fdi)
          )
        )
      ),
      // Centerline divider
      h('div', {className: 'fdi-midline'}),
      // Q2 row (1 → 8, centerline to left)
      h('div', {className: 'fdi-row fdi-q2'},
        Q2.map(fdi =>
          h('div', {key: fdi, className: 'fdi-cell'},
            h('div', {className: 'fdi-num fdi-num-top'}, fdi),
            renderTooth(fdi)
          )
        )
      )
    ),

    // Bite line separator
    h('div', {className: 'fdi-bite-line'},
      h('span', null, 'Occlusal Plane / Bite Line')
    ),

    // Lower arch
    h('div', {className: 'fdi-arch fdi-lower'},
      h('div', {className: 'fdi-quad-lbl fdi-q4-lbl'}, 'Q4 · Lower Right'),
      h('div', {className: 'fdi-quad-lbl fdi-q3-lbl'}, 'Q3 · Lower Left'),
      h('div', {className: 'fdi-row fdi-q4'},
        Q4.map(fdi =>
          h('div', {key: fdi, className: 'fdi-cell'},
            renderTooth(fdi),
            h('div', {className: 'fdi-num fdi-num-bot'}, fdi)
          )
        )
      ),
      h('div', {className: 'fdi-midline'}),
      h('div', {className: 'fdi-row fdi-q3'},
        Q3.map(fdi =>
          h('div', {key: fdi, className: 'fdi-cell'},
            renderTooth(fdi),
            h('div', {className: 'fdi-num fdi-num-bot'}, fdi)
          )
        )
      )
    ),
    // Lower gum strip (below lower teeth)
    h('div', {className: 'fdi-gum fdi-gum-lower'}),

    // Tooth detail modal
    selected && h(ToothDetailModal, {
      fdi: selected,
      condition: teethData[selected] || 'healthy',
      surfaceData: teethData[selected + '_surfaces'] || {},
      patientHistory: patientHistory || [],
      onClose: () => setSelected(null),
      onConditionChange: (fdi, k) => onToothEdit(fdi, k),
      onSurfaceChange: (fdi, surface, condition) => onToothEdit(fdi, condition, surface)
    }),

    // Stats by condition
    h('div', {className: 'fdi-condition-stats'},
      CONDITION_KEYS.filter(k => k !== 'healthy').map(k => {
        const count = Object.entries(teethData).filter(([key, v]) => v === k && !key.includes('_surfaces')).length;
        if (count === 0) return null;
        const c = CONDITIONS[k];
        return h('div', {key: k, className: 'fdi-cstat'},
          h('span', {className: 'fdi-cstat-sw', style: {background: c.color, border: '1.5px solid ' + c.stroke}},
            c.symbol && h('span', {style: {fontSize: 9, color: condFg(k), fontWeight: 700}}, c.symbol)
          ),
          h('span', {className: 'fdi-cstat-lbl'}, c.label),
          h('span', {className: 'fdi-cstat-num'}, count)
        );
      })
    ),

    // Enhanced Legend
    h('div', {className: 'fdi-legend'},
      h('div', {className: 'fdi-legend-title'}, '📋 Condition Legend'),
      h('div', {className: 'fdi-legend-items'},
        CONDITION_KEYS.map(k => {
          const c = CONDITIONS[k];
          return h('div', {key: k, className: 'fdi-legend-item'},
            h('span', {className: 'fdi-legend-sw', style: {background: c.color, border: '1.5px solid ' + c.stroke}},
              h('span', {style: {fontSize: 9, color: condFg(k), fontWeight: 700}}, c.symbol || '○')
            ),
            h('span', {style: {fontWeight: 600}}, c.label),
            h('span', {style: {fontSize: 10, color: '#64748b', marginLeft: 3}}, '— ' + c.desc)
          );
        })
      ),
      // Surface reference
      h('div', {style: {marginTop: 10, borderTop: '1px solid var(--bd)', paddingTop: 8}}),
      h('div', {className: 'fdi-legend-title'}, '🦷 Surface Reference'),
      h('div', {style: {display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 8px', fontSize: 11}},
        [
          ['Mesial (M)', 'Surface facing the midline'],
          ['Distal (D)', 'Surface away from midline'],
          ['Occlusal (O)', 'Chewing surface (back teeth)'],
          ['Incisal (I)', 'Cutting edge (front teeth)'],
          ['Buccal (B)', 'Outer face toward cheek'],
          ['Labial (La)', 'Outer face toward lips'],
          ['Lingual (Li)', 'Inner face toward tongue/palate'],
        ].map(([name, desc]) => h('div', {key: name, style: {display: 'flex', flexDirection: 'column', padding: '3px 5px', background: '#f0f7f5', borderRadius: 4}},
          h('span', {style: {fontWeight: 600, color: '#0a5f54'}}, name),
          h('span', {style: {color: '#64748b', fontSize: 10}}, desc)
        ))
      ),
      // Tooth type reference
      h('div', {style: {marginTop: 10, borderTop: '1px solid var(--bd)', paddingTop: 8}}),
      h('div', {className: 'fdi-legend-title'}, '📐 Tooth Type Reference'),
      h('div', {style: {display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 8px', fontSize: 11}},
        [
          ['Incisors', '#1, 2, 7, 8 (each quadrant)', 'Flat edge, biting'],
          ['Canines', '#3 (each quadrant)', 'Pointed cusp, tearing'],
          ['Premolars', '#4, 5 (each quadrant)', '2 cusps, chewing'],
          ['Molars', '#6, 7, 8 (each quadrant)', '4+ cusps, grinding'],
        ].map(([type, pos, fn]) => h('div', {key: type, style: {padding: '3px 5px', background: '#f0f7f5', borderRadius: 4}},
          h('div', {style: {fontWeight: 600, color: '#0a5f54'}}, type),
          h('div', {style: {color: '#334155', fontSize: 10}}, pos),
          h('div', {style: {color: '#64748b', fontSize: 10}}, fn)
        ))
      )
    ),

    // Help line
    h('div', {className: 'fdi-help'},
      '💡 Click any tooth to view detail, assign conditions, and mark surfaces with the 2D surface map. Side View shows buccal anatomy; Top View shows occlusal surface patterns.'
    )
  );
}




