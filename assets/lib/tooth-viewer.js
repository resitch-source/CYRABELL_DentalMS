// CYRABELL — real tooth 3D viewer module (lazy-loaded GLTF photogrammetry scans)
// Exposes window.CyrabellMountTooth(container, opts) -> handle
import * as THREE from './three.module.min.js';
import { GLTFLoader } from './GLTFLoader.js';

const MODEL_CACHE = {}; // url -> Promise<THREE.Object3D (cloneable source)>

// Per-tooth-type anatomical orientation in MODEL space (all scans are crown-up, long axis = Y).
// azimuth0 = world-azimuth (radians, around Y, atan2(z,x)) that corresponds to BUCCAL/LABIAL.
// dir = +1 or -1 handedness going buccal -> mesial -> lingual -> distal.
// These are sensible defaults; the side-panel remains the source of truth for exact labels.
const ORIENT_DEFAULT = { azimuth0: 0, dir: 1, occlusalFrac: 0.62 };

function classifySurface(localNormal, localPointN, toothClass, orient){
  // localNormal: face normal in model-local space; localPointN: point normalized in bbox [-1..1]
  const o = orient || ORIENT_DEFAULT;
  const ny = localNormal.y;
  // Top-facing & in the crown upper region -> occlusal / incisal
  if (ny > 0.55 && localPointN.y > (o.occlusalFrac - 1)) {
    return (toothClass === 'incisor' || toothClass === 'canine') ? 'incisal' : 'occlusal';
  }
  // Otherwise classify by horizontal azimuth of the normal
  let az = Math.atan2(localNormal.z, localNormal.x) - o.azimuth0;
  while (az > Math.PI) az -= Math.PI*2;
  while (az < -Math.PI) az += Math.PI*2;
  if (o.dir < 0) az = -az;
  // Quadrants: buccal(0) -> mesial(90) -> lingual(180) -> distal(270)
  const q = Math.round(az / (Math.PI/2)) & 3;
  const buccalKey = (toothClass === 'incisor' || toothClass === 'canine') ? 'labial' : 'buccal';
  return [buccalKey, 'mesial', 'lingual', 'distal'][q];
}

function buildEnv(renderer){
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50,32,16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 vP;void main(){vec3 d=normalize(vP);float y=d.y*0.5+0.5;vec3 c=mix(vec3(0.42,0.46,0.52),vec3(0.95,0.97,1.0),y);float k=max(0.0,dot(d,normalize(vec3(-0.4,1.0,0.7))));c+=vec3(1.0)*pow(k,26.0)*0.9;gl_FragColor=vec4(c,1.0);}'
  }));
  s.add(sky);
  const tex = pm.fromScene(s, 0.0).texture;
  pm.dispose();
  return tex;
}

function loadModel(url){
  if (!MODEL_CACHE[url]) {
    MODEL_CACHE[url] = new Promise((res, rej) => {
      new GLTFLoader().load(url, g => res(g.scene), undefined, rej);
    });
  }
  return MODEL_CACHE[url];
}

export function mountToothViewer(container, opts){
  opts = opts || {};
  const toothClass = opts.toothClass || 'molar';
  const orient = opts.orient || ORIENT_DEFAULT;
  let disposed = false;

  const W = container.clientWidth || 360, H = container.clientHeight || 360;
  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(32, W/H, 0.01, 1000);
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true});
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.style.touchAction = 'none';

  scene.environment = buildEnv(renderer);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(-2,4,5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xd6e6ff, 0.6); fill.position.set(4,1,1); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xbcd6ff, 0.7); rim.position.set(0,-1,-5); scene.add(rim);

  const root = new THREE.Group(); scene.add(root);
  let model = null, baseDist = 4, meshes = [];
  const markers = new THREE.Group(); root.add(markers);
  const raycaster = new THREE.Raycaster();
  let tgtX = 0.12, tgtY = 0.5, curX = tgtX, curY = tgtY;

  // interaction
  let down=false, moved=false, lx=0, ly=0;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e=>{down=true;moved=false;lx=e.clientX;ly=e.clientY;el.setPointerCapture(e.pointerId);el.style.cursor='grabbing';});
  el.addEventListener('pointermove', e=>{ if(!down)return; const dx=e.clientX-lx,dy=e.clientY-ly; if(Math.abs(dx)+Math.abs(dy)>3)moved=true; tgtY+=dx*0.01; tgtX+=dy*0.01; tgtX=Math.max(-1.5,Math.min(1.5,tgtX)); lx=e.clientX; ly=e.clientY; });
  el.addEventListener('pointerup', e=>{ down=false; el.style.cursor='grab'; if(!moved) pick(e); });
  el.addEventListener('pointercancel', ()=>{down=false;el.style.cursor='grab';});
  el.addEventListener('wheel', e=>{ e.preventDefault(); camera.position.z=Math.max(baseDist*0.4,Math.min(baseDist*3,camera.position.z*(1+e.deltaY*0.001))); }, {passive:false});

  function pick(e){
    if (!model || !opts.onPick) return;
    const r = el.getBoundingClientRect();
    const m = new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
    raycaster.setFromCamera(m, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return;
    const hit = hits[0];
    // normal in world -> model-local (root space)
    const nWorld = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const nLocal = nWorld.clone(); // root currently rotated; undo root rotation
    nLocal.applyQuaternion(root.quaternion.clone().invert());
    // point normalized within bbox
    const pLocal = root.worldToLocal(hit.point.clone());
    const pN = new THREE.Vector3(
      _bbox.max.x>_bbox.min.x ? (pLocal.x-_center.x)/(_size.x/2) : 0,
      _bbox.max.y>_bbox.min.y ? (pLocal.y-_center.y)/(_size.y/2) : 0,
      _bbox.max.z>_bbox.min.z ? (pLocal.z-_center.z)/(_size.z/2) : 0
    );
    const surf = classifySurface(nLocal.normalize(), pN, toothClass, orient);
    opts.onPick(surf, hit.point.clone());
  }

  // Detect crown vs root end along Y: roots taper (smaller sustained XZ radius).
  // Returns true if the model needs flipping (crown currently points DOWN).
  function needsFlip(obj){
    obj.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(obj);
    const minY=b.min.y, maxY=b.max.y, span=maxY-minY; if(span<=0) return false;
    const cx=(b.min.x+b.max.x)/2, cz=(b.min.z+b.max.z)/2;
    const NB=10, sum=new Array(NB).fill(0), cnt=new Array(NB).fill(0);
    const v=new THREE.Vector3();
    obj.traverse(o=>{ if(!o.isMesh) return; const pos=o.geometry.attributes.position; const wm=o.matrixWorld;
      for(let i=0;i<pos.count;i++){ v.fromBufferAttribute(pos,i).applyMatrix4(wm);
        let bi=Math.floor((v.y-minY)/span*NB); if(bi<0)bi=0; if(bi>=NB)bi=NB-1;
        const r=Math.hypot(v.x-cx, v.z-cz); sum[bi]+=r; cnt[bi]++; }
    });
    const rad=i=>cnt[i]?sum[i]/cnt[i]:0;
    // mean radius of top 30% vs bottom 30%
    let top=0,tn=0,bot=0,bn=0;
    for(let i=0;i<3;i++){bot+=rad(i);bn++;}
    for(let i=NB-3;i<NB;i++){top+=rad(i);tn++;}
    top/=tn; bot/=bn;
    // crown end has the larger sustained radius; if top (high Y) is smaller, crown is at bottom -> flip
    return top < bot;
  }

  let _bbox=new THREE.Box3(), _center=new THREE.Vector3(), _size=new THREE.Vector3();
  function frame(obj){
    obj.position.set(0,0,0);
    obj.rotation.set(0,0,0);
    obj.updateMatrixWorld(true);
    if (orient.autoFlip !== false && needsFlip(obj)) { obj.rotateX(Math.PI); }
    obj.updateMatrixWorld(true);
    root.rotation.set(0,0,0);
    root.updateMatrixWorld(true);
    _bbox.setFromObject(obj);
    _bbox.getSize(_size); _bbox.getCenter(_center);
    obj.position.set(-_center.x,-_center.y,-_center.z);
    obj.updateMatrixWorld(true);
    const maxDim = Math.max(_size.x,_size.y,_size.z);
    const dist = (maxDim/2)/Math.tan((camera.fov*Math.PI/180)/2)*1.7;
    baseDist = dist;
    camera.position.set(0,0,dist); camera.lookAt(0,0,0);
    camera.near = dist/100; camera.far = dist*100; camera.updateProjectionMatrix();
  }

  const VIEWS = { front:[0.10,0], back:[0.10,Math.PI], left:[0.10,-Math.PI/2], right:[0.10,Math.PI/2], top:[Math.PI/2-0.1,0], iso:[0.28,0.55] };
  function setView(v){ const a=VIEWS[v]||VIEWS.iso; tgtX=a[0]; tgtY=a[1]; }

  // colored surface markers from a surfaces map {surfKey: conditionKey}
  function setSurfaces(surfaces, conditions){
    while (markers.children.length) markers.remove(markers.children[0]);
    if (!surfaces || !model) return;
    const sphereGeo = new THREE.SphereGeometry(Math.max(_size.x,_size.z)*0.10, 16, 12);
    const buccalKey = (toothClass==='incisor'||toothClass==='canine') ? 'labial' : 'buccal';
    const topKey = (toothClass==='incisor'||toothClass==='canine') ? 'incisal' : 'occlusal';
    // anatomical placement in model-local centered coords
    const hx=_size.x/2, hy=_size.y/2, hz=_size.z/2;
    const az0 = orient.azimuth0||0, dir = orient.dir||1;
    function azPos(stepIndex){ // 0 buccal,1 mesial,2 lingual,3 distal
      let ang = az0 + dir*stepIndex*(Math.PI/2);
      return new THREE.Vector3(Math.cos(ang)*hx*0.95, 0, Math.sin(ang)*hz*0.95);
    }
    const placements = {
      [buccalKey]: azPos(0), mesial: azPos(1), lingual: azPos(2), distal: azPos(3),
      [topKey]: new THREE.Vector3(0, hy*0.85, 0)
    };
    Object.entries(surfaces).forEach(([k,cond])=>{
      if (!cond || cond==='healthy') return;
      const c = (conditions && conditions[cond]) || null; if(!c) return;
      const pos = placements[k]; if(!pos) return;
      const mat = new THREE.MeshStandardMaterial({color:new THREE.Color(c.color), emissive:new THREE.Color(c.color), emissiveIntensity:0.35, roughness:0.4, metalness:0});
      const s = new THREE.Mesh(sphereGeo, mat);
      s.position.copy(pos);
      markers.add(s);
    });
  }

  function animate(){
    if (disposed) return;
    requestAnimationFrame(animate);
    curX += (tgtX-curX)*0.15; curY += (tgtY-curY)*0.15;
    root.rotation.x = curX; root.rotation.y = curY;
    renderer.render(scene, camera);
  }

  function onResize(){ const w=container.clientWidth||W, hh=container.clientHeight||H; camera.aspect=w/hh; camera.updateProjectionMatrix(); renderer.setSize(w,hh); }
  window.addEventListener('resize', onResize);

  const handle = {
    setView,
    setSurfaces: (s,c)=>{ handle._s=s; handle._c=c; if(model) setSurfaces(s,c); },
    isReady: ()=>!!model,
    dispose(){ disposed=true; window.removeEventListener('resize',onResize); try{renderer.dispose();}catch(e){} if(renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); }
  };

  loadModel(opts.modelUrl).then(src=>{
    if (disposed) return;
    model = src.clone(true);
    model.traverse(o=>{ if(o.isMesh){ meshes.push(o); } });
    root.add(model);
    frame(model);
    setView(opts.view || 'iso');
    if (handle._s) setSurfaces(handle._s, handle._c);
    if (opts.onReady) opts.onReady();
  }).catch(err=>{ if(opts.onError) opts.onError(err); });

  animate();
  return handle;
}

window.CyrabellMountTooth = mountToothViewer;
window.CyrabellToothReady = true;
