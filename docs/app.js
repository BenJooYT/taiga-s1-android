import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { STLLoader } from './vendor/STLLoader.js';

const PARTS = {
  twin_block:    { label: 'Crankcase',     stats: '44/44 steps · IoU 1.0 · 100×60×50' },
  head_twin:     { label: 'Head plate',    stats: '44/44 steps · IoU 1.0 · bores ±25, bolts ±36/±22' },
  sump_twin:     { label: 'Oil pan',       stats: '14/14 steps · IoU 1.0 · 2 mm shell' },
  piston:        { label: 'Piston ×2',      stats: '11/11 steps · IoU 1.0 · Ø29 in Ø30 bores' },
  flywheel:      { label: 'Flywheel',      stats: '27/27 steps · IoU 1.0 · crank bore + 6 holes' },
  mount_base:    { label: 'Bed plate',     stats: '48/48 steps · IoU 1.0 · 140×100, 8 holes' },
  pulley:        { label: 'Pulley',        stats: '27/27 steps · IoU 1.0 · bore + 5 holes' },
  exhaust_flange:{ label: 'Exhaust flange',stats: '28/28 steps · IoU 1.0 · Ø30 port' },
  intake_flange: { label: 'Intake flange', stats: '27/27 steps · IoU 1.0 · Ø24 port' },
  round_bolt:    { label: 'Bolt ×8',        stats: '16/16 steps · IoU 1.0 · Ø5.6 shaft' },
};
// assembly instances: [partId, pos, rot, explode]
const RY90 = ['ry90'], RX180 = ['rx180'];
const ASM = [
  ['mount_base', [0,0,-35]],
  ['round_bolt', [58,38,-21], RX180], ['round_bolt', [-58,38,-21], RX180],
  ['round_bolt', [58,-38,-21], RX180], ['round_bolt', [-58,-38,-21], RX180],
  ['sump_twin', [0,0,-25]],
  ['twin_block', [0,0,0]],
  ['flywheel', [-65,0,25], RY90], ['pulley', [55,0,25], RY90],
  ['piston', [-25,0,20]], ['piston', [25,0,5]],
  ['head_twin', [0,0,50]],
  ['exhaust_flange', [-25,0,62]], ['intake_flange', [25,0,62]],
  ['round_bolt', [36,22,66], RX180], ['round_bolt', [-36,22,66], RX180],
  ['round_bolt', [36,-22,66], RX180], ['round_bolt', [-36,-22,66], RX180],
];
const EX = { mount_base:[0,0,-70], round_bolt:[0,0,0], sump_twin:[0,0,-38], twin_block:[0,0,0],
  flywheel:[-55,0,0], pulley:[55,0,0], piston:[0,0,62], head_twin:[0,0,34],
  exhaust_flange:[0,0,76], intake_flange:[0,0,76] };
const EX_BOLT_TOP = [0,0,115], EX_BOLT_BOT = [0,0,-110];

const canvas = document.getElementById('c'), errBox = document.getElementById('err');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1015);
const camera = new THREE.PerspectiveCamera(45, 1, 1, 5000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1d24, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(180, 260, 140); scene.add(key);
const grid = new THREE.GridHelper(400, 20, 0x2c313d, 0x1d2029); scene.add(grid);
const MAT = new THREE.MeshStandardMaterial({ color: 0x9fb2cc, metalness: 0.55, roughness: 0.42 });

const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; scene.add(root);
const loader = new STLLoader();
const geos = {};
let viewGroup = null, explodeT = 0, explodeTarget = 0, currentView = 'assembly';

function loadGeo(id) {
  return new Promise((res, rej) => loader.load('models/' + id + '.stl', g => { geos[id] = g; res(); }, undefined, rej));
}
function rotFor(r) {
  const e = new THREE.Euler();
  if (r === RY90) e.y = Math.PI / 2;
  if (r === RX180) e.x = Math.PI;
  return e;
}
function isTopBolt(p) { return p[2] > 0; }
function buildAssembly() {
  const g = new THREE.Group();
  for (const [id, p, r] of ASM) {
    const m = new THREE.Mesh(geos[id], MAT);
    m.position.set(...p); m.rotation.copy(rotFor(r));
    let ex = EX[id] || [0,0,0];
    if (id === 'round_bolt') ex = isTopBolt(p) ? EX_BOLT_TOP : EX_BOLT_BOT;
    m.userData.base = new THREE.Vector3(...p); m.userData.ex = new THREE.Vector3(...ex);
    g.add(m);
  }
  return g;
}
function fit(obj) {
  const b = new THREE.Box3().setFromObject(obj), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  const r = Math.max(s.x, s.y, s.z);
  camera.position.set(c.x + r * 1.05, c.y + r * 0.75, c.z + r * 1.05);
  controls.target.copy(c); controls.update();
}
function show(view) {
  currentView = view;
  if (viewGroup) { root.remove(viewGroup); }
  viewGroup = new THREE.Group();
  const cap = document.getElementById('caption'), stats = document.getElementById('stats');
  if (view === 'assembly') {
    viewGroup.add(buildAssembly());
    cap.textContent = 'Full assembly — 18 parts';
    stats.textContent = 'twin_engine_full.FCStd · block+head+sump+2 pistons\n+flywheel+pulley+bed+2 flanges+8 bolts';
  } else {
    const m = new THREE.Mesh(geos[view], MAT);
    viewGroup.add(m);
    cap.textContent = PARTS[view].label;
    stats.textContent = PARTS[view].stats + '\n' + view + '.FCStd in Files ↓';
  }
  root.add(viewGroup); fit(viewGroup);
  document.querySelectorAll('#partlist button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
  document.getElementById('explode').disabled = (view !== 'assembly');
}
function tick() {
  requestAnimationFrame(tick);
  explodeT += (explodeTarget - explodeT) * 0.12;
  if (viewGroup && currentView === 'assembly')
    for (const m of viewGroup.children)
      m.position.copy(m.userData.base).addScaledVector(m.userData.ex, explodeT);
  controls.autoRotate = document.getElementById('spin').checked;
  controls.update(); renderer.render(scene, camera);
}
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

(async () => {
  try { await Promise.all(Object.keys(PARTS).map(loadGeo)); }
  catch (e) { errBox.textContent = 'Model load failed: ' + e.message; return; }
  const pl = document.getElementById('partlist');
  const mk = (v, label, sub) => {
    const b = document.createElement('button'); b.dataset.v = v;
    b.innerHTML = label + (sub ? '<small>' + sub + '</small>' : '');
    b.onclick = () => show(v); pl.appendChild(b);
  };
  mk('assembly', 'Full assembly', '18 parts · explode slider');
  for (const [id, p] of Object.entries(PARTS)) mk(id, p.label, p.stats.split('·')[0].trim());
  document.getElementById('explode').oninput = e => explodeTarget = +e.target.value;
  const grid_ = document.getElementById('grid');
  for (const id of ['full_engine','twin_block','four_block','head_twin','sump_twin','piston','flywheel','mount_base','pulley','exhaust_flange','intake_flange','round_bolt'])
    grid_.insertAdjacentHTML('beforeend', `<figure><img loading="lazy" src="media/${id}.png" alt="${id}"><figcaption>${id.replace(/_/g,' ')}</figcaption></figure>`);
  const dl = document.getElementById('dllist');
  for (const f of ['twin_engine_full.FCStd','twin_block.FCStd','four_block.FCStd','head_twin.FCStd','sump_twin.FCStd','piston.FCStd','flywheel.FCStd','mount_base.FCStd','pulley.FCStd','exhaust_flange.FCStd','intake_flange.FCStd','round_bolt.FCStd'])
    dl.insertAdjacentHTML('beforeend', `<li><a href="files/${f}" download>${f}</a></li>`);
  resize(); show('assembly'); tick();
})();
