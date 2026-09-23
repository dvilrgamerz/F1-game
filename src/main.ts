import * as THREE from 'three';
import './styles.css';
import { ARDENNE_GP } from './v3/track/ardenneGP';
import { PitStopSystem } from './v3/race/PitStopSystem';
import type { TireCompoundId } from './v3/types';

type CameraMode = 'chase' | 'cockpit' | 'broadcast';
type TouchAction = 'left' | 'right' | 'throttle' | 'brake' | 'ers';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7fb3db);
scene.fog = new THREE.FogExp2(0x9fc3dd, 0.0018);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.08, 2600);

const hemi = new THREE.HemisphereLight(0xddeeff, 0x42552f, 2.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3.4);
sun.position.set(120, 220, 90);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -250;
sun.shadow.camera.right = 250;
sun.shadow.camera.top = 250;
sun.shadow.camera.bottom = -250;
scene.add(sun);

const grass = new THREE.Mesh(
  new THREE.PlaneGeometry(2200, 2200),
  new THREE.MeshStandardMaterial({ color: 0x487a32, roughness: 1 })
);
grass.rotation.x = -Math.PI / 2;
grass.receiveShadow = true;
scene.add(grass);

const trackPoints = ARDENNE_GP.controlPoints.map(({ x, y, z }) => new THREE.Vector3(x, y, z));

const trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, 'centripetal', 0.45);
const TRACK_WIDTH = ARDENNE_GP.widthMeters;
const RACE_LAPS = ARDENNE_GP.laps;
const TRACK_SAMPLES = 1400;
const centerline = Array.from({ length: TRACK_SAMPLES }, (_, i) => trackCurve.getPointAt(i / TRACK_SAMPLES));

function makeTrackRibbon(width: number, y: number, material: THREE.Material): THREE.Mesh {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= TRACK_SAMPLES; i++) {
    const t = (i % TRACK_SAMPLES) / TRACK_SAMPLES;
    const p = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const l = p.clone().addScaledVector(side, width / 2);
    const r = p.clone().addScaledVector(side, -width / 2);
    positions.push(l.x, l.y + y, l.z, r.x, r.y + y, r.z);
    uvs.push(0, i / 12, 1, i / 12);
  }
  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material);
  mesh.receiveShadow = true;
  return mesh;
}

scene.add(makeTrackRibbon(TRACK_WIDTH + 74, -0.22, new THREE.MeshStandardMaterial({ color: 0x426f31, roughness: 1 })));
scene.add(makeTrackRibbon(TRACK_WIDTH + 10.5, 0.045, new THREE.MeshStandardMaterial({ color: 0x2d8b57, roughness: 0.96 })));
scene.add(makeTrackRibbon(TRACK_WIDTH + 3.2, 0.08, new THREE.MeshStandardMaterial({ color: 0xb7b7b0, roughness: 1 })));
scene.add(makeTrackRibbon(TRACK_WIDTH, 0.14, new THREE.MeshStandardMaterial({ color: 0x292a2c, roughness: 0.86, metalness: 0.04 })));

let pitCurve: THREE.CatmullRomCurve3 | null = null;
let pitLaneLength = 1;
let pitBoxPosition = new THREE.Vector3();
const PIT_BOX_T = 0.56;

function addTrackEnvironment() {
  const gravelMat = new THREE.MeshStandardMaterial({ color: 0xc8ad7f, roughness: 1 });
  const gravelZones = [
    { t: .27, side: 1, rx: 24, rz: 13 },
    { t: .49, side: -1, rx: 26, rz: 15 },
    { t: .77, side: 1, rx: 22, rz: 13 }
  ];
  for (const zone of gravelZones) {
    const p = trackCurve.getPointAt(zone.t);
    const tangent = trackCurve.getTangentAt(zone.t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const gravel = new THREE.Mesh(new THREE.CircleGeometry(1, 48), gravelMat);
    gravel.scale.set(zone.rx, zone.rz, 1);
    gravel.rotation.x = -Math.PI / 2;
    gravel.rotation.z = -Math.atan2(tangent.x, tangent.z);
    gravel.position.copy(p).addScaledVector(side, zone.side * (TRACK_WIDTH / 2 + 15));
    gravel.position.y = p.y + .055;
    gravel.receiveShadow = true;
    scene.add(gravel);
  }

  const barrierGeo = new THREE.BoxGeometry(3.2, 1.15, .34);
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: .35, roughness: .55 });
  const barrierCount = 320;
  const barriers = new THREE.InstancedMesh(barrierGeo, barrierMat, barrierCount);
  const markerGeo = new THREE.BoxGeometry(.18, 1.16, .37);
  const markerMat = new THREE.MeshStandardMaterial({ color: 0xd71920, roughness: .7 });
  const markers = new THREE.InstancedMesh(markerGeo, markerMat, barrierCount);
  const treeGeo = new THREE.ConeGeometry(2.3, 7.5, 7);
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x245c31, roughness: 1 });
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, 110);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < barrierCount; i++) {
    const t = i / barrierCount;
    const p = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const sign = i % 2 === 0 ? 1 : -1;
    dummy.position.copy(p).addScaledVector(side, sign * (TRACK_WIDTH / 2 + 13.5));
    dummy.position.y = p.y + .58;
    dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
    dummy.updateMatrix();
    barriers.setMatrixAt(i, dummy.matrix);
    markers.setMatrixAt(i, dummy.matrix);
  }

  for (let i = 0; i < 110; i++) {
    const t = (i * .037 + .013) % 1;
    const p = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const sign = i % 2 === 0 ? 1 : -1;
    dummy.position.copy(p).addScaledVector(side, sign * (TRACK_WIDTH / 2 + 28 + (i % 5) * 3));
    dummy.position.y = p.y + 3.75;
    dummy.rotation.set(0, i * .73, 0);
    dummy.scale.setScalar(.75 + (i % 4) * .08);
    dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
  }

  barriers.castShadow = true;
  markers.castShadow = true;
  trees.castShadow = true;
  scene.add(barriers, markers, trees);

  // Functional pit lane from configured entry to exit.
  const pitPts: THREE.Vector3[] = [];
  const pitSpan = (1 - ARDENNE_GP.pitEntry) + ARDENNE_GP.pitExit;
  for (let i = 0; i <= 36; i++) {
    const u = i / 36;
    const raw = ARDENNE_GP.pitEntry + u * pitSpan;
    const t = raw % 1;
    const p = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const blend = Math.sin(u * Math.PI);
    pitPts.push(p.clone().addScaledVector(side, -blend * 21).add(new THREE.Vector3(0, .12, 0)));
  }
  const activePitCurve = new THREE.CatmullRomCurve3(pitPts, false, 'centripetal');
  pitCurve = activePitCurve;
  pitLaneLength = activePitCurve.getLength();
  pitBoxPosition.copy(activePitCurve.getPointAt(PIT_BOX_T));

  const pitSamples = 170;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= pitSamples; i++) {
    const t = i / pitSamples;
    const p = activePitCurve.getPointAt(t);
    const tangent = activePitCurve.getTangentAt(Math.min(t, .999)).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const l = p.clone().addScaledVector(side, 3.4);
    const r = p.clone().addScaledVector(side, -3.4);
    pos.push(l.x,l.y+.005,l.z,r.x,r.y+.005,r.z);
  }
  for (let i=0;i<pitSamples;i++) {
    const a=i*2; idx.push(a,a+2,a+1,a+1,a+2,a+3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx); g.computeVertexNormals();
  const pit = new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x34363a,roughness:.9}));
  pit.receiveShadow=true;
  scene.add(pit);

  // Pit box and simple crew markers make the stop location easy to read.
  const boxTangent = activePitCurve.getTangentAt(PIT_BOX_T).normalize();
  const pitBox = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 8.5),
    new THREE.MeshBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: .42, side: THREE.DoubleSide })
  );
  pitBox.rotation.x = -Math.PI / 2;
  pitBox.rotation.z = -Math.atan2(boxTangent.x, boxTangent.z);
  pitBox.position.copy(pitBoxPosition).add(new THREE.Vector3(0, .03, 0));
  scene.add(pitBox);

  const crewGeo = new THREE.CylinderGeometry(.22, .28, 1.55, 8);
  const crewMat = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: .75 });
  const crewOffsets = [
    [-2.15, -1.8], [2.15, -1.8], [-2.15, 1.8], [2.15, 1.8]
  ];
  const pitSide = new THREE.Vector3(-boxTangent.z, 0, boxTangent.x).normalize();
  for (const [sideOffset, forwardOffset] of crewOffsets) {
    const crew = new THREE.Mesh(crewGeo, crewMat);
    crew.position.copy(pitBoxPosition)
      .addScaledVector(pitSide, sideOffset)
      .addScaledVector(boxTangent, forwardOffset);
    crew.position.y += .8;
    crew.castShadow = true;
    scene.add(crew);
  }
}
addTrackEnvironment();

// Formula-style kerbs: place red/white raised strips on the inside of meaningful bends.
function addCornerKerbs() {
  const kerbSamples = 240;
  const placements: Array<{ t: number; sideSign: number; red: boolean }> = [];

  for (let i = 0; i < kerbSamples; i++) {
    const t = i / kerbSamples;
    const nextT = ((i + 1) % kerbSamples) / kerbSamples;
    const tangent = trackCurve.getTangentAt(t).normalize();
    const nextTangent = trackCurve.getTangentAt(nextT).normalize();

    // Y component of tangent cross-product in the XZ plane.
    const turn = tangent.z * nextTangent.x - tangent.x * nextTangent.z;
    if (Math.abs(turn) < 0.008) continue;

    // sideSign +1 uses the curve's left normal, -1 the right normal.
    const sideSign = turn < 0 ? 1 : -1;
    placements.push({ t, sideSign, red: i % 2 === 0 });
  }

  const kerbGeo = new THREE.BoxGeometry(1.45, 0.13, 3.4);
  const redMat = new THREE.MeshStandardMaterial({ color: 0xd71920, roughness: 0.82 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f2, roughness: 0.82 });
  const redCount = placements.filter(k => k.red).length;
  const whiteCount = placements.length - redCount;
  const redKerbs = new THREE.InstancedMesh(kerbGeo, redMat, redCount);
  const whiteKerbs = new THREE.InstancedMesh(kerbGeo, whiteMat, whiteCount);
  const dummy = new THREE.Object3D();
  let redIndex = 0;
  let whiteIndex = 0;

  for (const k of placements) {
    const p = trackCurve.getPointAt(k.t);
    const tangent = trackCurve.getTangentAt(k.t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    dummy.position.copy(p).addScaledVector(side, k.sideSign * (TRACK_WIDTH / 2 + 0.58));
    dummy.position.y = p.y + 0.22;
    dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
    dummy.updateMatrix();

    if (k.red) redKerbs.setMatrixAt(redIndex++, dummy.matrix);
    else whiteKerbs.setMatrixAt(whiteIndex++, dummy.matrix);
  }

  redKerbs.castShadow = true;
  redKerbs.receiveShadow = true;
  whiteKerbs.castShadow = true;
  whiteKerbs.receiveShadow = true;
  scene.add(redKerbs, whiteKerbs);
}
addCornerKerbs();

// Start line
const startP = trackCurve.getPointAt(0);
const startT = trackCurve.getTangentAt(0).normalize();
const startAngle = Math.atan2(startT.x, startT.z);
const startLine = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH, 2.8), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
startLine.rotation.x = -Math.PI / 2;
startLine.rotation.z = -startAngle;
startLine.position.copy(startP).add(new THREE.Vector3(0, 0.17, 0));
scene.add(startLine);

// Sparse trackside posts for speed/depth cues.
const postGeo = new THREE.BoxGeometry(0.45, 2.1, 0.45);
const postMat = new THREE.MeshStandardMaterial({ color: 0xe6e8ed, roughness: .7 });
const posts = new THREE.InstancedMesh(postGeo, postMat, 130);
const dummy = new THREE.Object3D();
for (let i = 0; i < 130; i++) {
  const t = i / 130;
  const p = trackCurve.getPointAt(t);
  const tangent = trackCurve.getTangentAt(t).normalize();
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  const sign = i % 2 ? 1 : -1;
  dummy.position.copy(p).addScaledVector(side, sign * (TRACK_WIDTH / 2 + 4.8));
  dummy.position.y = p.y + 1.05;
  dummy.rotation.y = Math.atan2(tangent.x, tangent.z);
  dummy.updateMatrix();
  posts.setMatrixAt(i, dummy.matrix);
}
posts.castShadow = true;
scene.add(posts);

function createFormulaCar(bodyColor: number): THREE.Group {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: .3, roughness: .38 });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x111214, metalness: .2, roughness: .5 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x090909, roughness: .92 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.85, .25, 4.5), carbon);
  floor.position.y = .36;
  car.add(floor);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(.68, .4, 3.2), bodyMat);
  nose.position.set(0, .62, -1.15);
  nose.rotation.x = .02;
  car.add(nose);

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.2, .72, 1.7), bodyMat);
  cockpit.position.set(0, .9, .4);
  car.add(cockpit);

  const engine = new THREE.Mesh(new THREE.BoxGeometry(1.25, .7, 1.9), bodyMat);
  engine.position.set(0, .85, 1.55);
  car.add(engine);

  const frontWing = new THREE.Mesh(new THREE.BoxGeometry(3.3, .12, .65), carbon);
  frontWing.position.set(0, .35, -2.62);
  car.add(frontWing);
  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(2.25, .16, .58), carbon);
  rearWing.position.set(0, 1.28, 2.4);
  car.add(rearWing);

  const rearEndplateGeo = new THREE.BoxGeometry(.10, .78, .72);
  const rearEndL = new THREE.Mesh(rearEndplateGeo, carbon);
  rearEndL.position.set(-1.08, 1.02, 2.38);
  const rearEndR = rearEndL.clone();
  rearEndR.position.x = 1.08;
  car.add(rearEndL, rearEndR);

  const frontEndplateGeo = new THREE.BoxGeometry(.10, .46, .78);
  const frontEndL = new THREE.Mesh(frontEndplateGeo, carbon);
  frontEndL.position.set(-1.58, .48, -2.62);
  const frontEndR = frontEndL.clone();
  frontEndR.position.x = 1.58;
  car.add(frontEndL, frontEndR);

  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.62, .22, .82), carbon);
  diffuser.position.set(0, .30, 2.18);
  diffuser.rotation.x = -.12;
  car.add(diffuser);

  const sidePodL = new THREE.Mesh(new THREE.BoxGeometry(.62, .48, 1.75), bodyMat);
  sidePodL.position.set(-.77,.64,.62);
  const sidePodR = sidePodL.clone();
  sidePodR.position.x = .77;
  car.add(sidePodL, sidePodR);

  const haloBar = new THREE.Mesh(new THREE.BoxGeometry(1.05,.09,.09), carbon);
  haloBar.position.set(0,1.42,.12);
  const haloStem = new THREE.Mesh(new THREE.BoxGeometry(.09,.52,.09), carbon);
  haloStem.position.set(0,1.17,-.15);
  car.add(haloBar, haloStem);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(.28, 18, 12),
    new THREE.MeshStandardMaterial({ color: 0xf3f4f6, metalness: .1, roughness: .28 }),
  );
  helmet.position.set(0, 1.25, .18);
  car.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(.37, .10, .16),
    new THREE.MeshStandardMaterial({ color: 0x111820, metalness: .45, roughness: .18 }),
  );
  visor.position.set(0, 1.28, -.06);
  visor.rotation.x = -.16;
  car.add(visor);

  const suspensionMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, metalness: .55, roughness: .35 });
  const suspensionGeo = new THREE.BoxGeometry(.06, .06, 1.12);
  const suspensionPoints = [
    [-.72, .56, -1.05, -1.02, .48, -1.66],
    [.72, .56, -1.05, 1.02, .48, -1.66],
    [-.68, .56, 1.10, -1.00, .48, 1.54],
    [.68, .56, 1.10, 1.00, .48, 1.54],
  ] as const;
  for (const [x1,y1,z1,x2,y2,z2] of suspensionPoints) {
    const bar = new THREE.Mesh(suspensionGeo, suspensionMat);
    const a = new THREE.Vector3(x1,y1,z1);
    const b = new THREE.Vector3(x2,y2,z2);
    const mid = a.clone().add(b).multiplyScalar(.5);
    bar.position.copy(mid);
    bar.scale.z = a.distanceTo(b) / 1.12;
    bar.lookAt(b);
    car.add(bar);
  }

  const wheelGeo = new THREE.CylinderGeometry(.43, .43, .34, 24);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelLocs = [
    [-1.05, .45, -1.72], [1.05, .45, -1.72], [-1.02, .45, 1.58], [1.02, .45, 1.58]
  ];
  const rimGeo = new THREE.CylinderGeometry(.24, .24, .36, 18);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x2d3036, metalness: .8, roughness: .28 });
  const brakeGeo = new THREE.CylinderGeometry(.17, .17, .365, 18);
  brakeGeo.rotateZ(Math.PI / 2);
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, metalness: .6, roughness: .5 });

  for (const [x, y, z] of wheelLocs) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.position.set(x, y, z);
    w.castShadow = true;
    car.add(w);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(x, y, z);
    car.add(rim);

    const disc = new THREE.Mesh(brakeGeo, brakeMat);
    disc.position.set(x, y, z);
    car.add(disc);
  }

  car.traverse(obj => {
    if (obj instanceof THREE.Mesh) obj.castShadow = true;
  });
  return car;
}

interface DriverState {
  progress: number;
  lap: number;
  speed: number;
}

const player = {
  car: createFormulaCar(0xe31937),
  position: new THREE.Vector3(),
  heading: 0,
  speed: 0,
  steer: 0,
  throttle: 0,
  brake: 0,
  progress: 0,
  previousProgress: 0,
  lap: 1,
  lapStartedAt: 0,
  bestLap: Number.POSITIVE_INFINITY,
  ers: 1,
  tyre: 1,
  tyreTemp: 90,
  drs: false,
  drsReady: false,
  ersDeploy: false,
  slipstream: 0,
  onKerb: false,
  surface: 'TRACK',
  offTrack: false,
  compound: 'MEDIUM' as TireCompoundId
};
scene.add(player.car);

const pitStop = new PitStopSystem();
let pitLaneProgress = 0;
let pitPenaltySeconds = 0;
let pitStopCount = 0;

const aiColors = [0x3478f6,0xf0b429,0x54b948,0xae67ff,0xff7f32,0x36c2cf,0xe65c96,0xffffff,0xb8bcc7,0x8d99ae];
const aiCars: Array<{ car: THREE.Group } & DriverState & { lane: number; baseSpeed: number }> = [];
for (let i = 0; i < 19; i++) {
  const car = createFormulaCar(aiColors[i % aiColors.length]);
  scene.add(car);
  aiCars.push({ car, progress: 0.006 + i * 0.0026, lap: 0, speed: 0, lane: ((i % 3) - 1) * 1.3, baseSpeed: 74 + (i % 7) * 1.8 });
}

const keys = new Set<string>();
const touch = new Set<TouchAction>();
let cameraMode: CameraMode = 'chase';
let raceStarted = false;
let paused = false;
let raceStartAt = 0;
let finished = false;

addEventListener('keydown', e => {
  keys.add(e.code);
  if (e.code === 'KeyC') cameraMode = cameraMode === 'chase' ? 'cockpit' : cameraMode === 'cockpit' ? 'broadcast' : 'chase';
  if (e.code === 'KeyR') resetPlayer(true);
  if (e.code === 'Escape' && raceStarted) togglePause();
  if (e.code === 'KeyE' && player.drsReady) player.drs = !player.drs;
  if (e.code === 'KeyP') togglePitRequest();
});
addEventListener('keyup', e => keys.delete(e.code));

for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-touch]')) {
  const action = btn.dataset.touch as TouchAction;
  const on = (e: Event) => { e.preventDefault(); touch.add(action); };
  const off = (e: Event) => { e.preventDefault(); touch.delete(action); };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('pointerleave', off);
}
document.querySelector<HTMLButtonElement>('#mobile-drs')?.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (player.drsReady) player.drs = !player.drs;
});

function resetPlayer(keepRace = false) {
  const p = trackCurve.getPointAt(0.002);
  const tangent = trackCurve.getTangentAt(0.002).normalize();
  player.position.copy(p).add(new THREE.Vector3(0, .22, 0));
  player.heading = Math.atan2(tangent.x, tangent.z);
  player.speed = 0;
  player.steer = 0;
  player.progress = .002;
  player.previousProgress = .002;
  player.car.position.copy(player.position);
  player.car.rotation.set(0, player.heading, 0);
  if (!keepRace) {
    player.lap = 1;
    player.ers = 1;
    player.tyre = 1;
    player.tyreTemp = 90;
    player.bestLap = Number.POSITIVE_INFINITY;
  }
}
resetPlayer();

function nearestTrackProgress(pos: THREE.Vector3): { progress: number; distance: number } {
  let best = Infinity;
  let bestI = 0;
  const approx = Math.floor(player.progress * TRACK_SAMPLES);
  const window = 75;
  for (let offset = -window; offset <= window; offset++) {
    const i = (approx + offset + TRACK_SAMPLES) % TRACK_SAMPLES;
    const p = centerline[i];
    const dx = pos.x - p.x;
    const dz = pos.z - p.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) { best = d2; bestI = i; }
  }
  if (best > 10000) {
    for (let i = 0; i < TRACK_SAMPLES; i += 5) {
      const p = centerline[i];
      const d2 = (pos.x - p.x) ** 2 + (pos.z - p.z) ** 2;
      if (d2 < best) { best = d2; bestI = i; }
    }
  }
  return { progress: bestI / TRACK_SAMPLES, distance: Math.sqrt(best) };
}

function wrappedProgressGap(a: number, b: number) {
  let gap = b - a;
  if (gap < 0) gap += 1;
  return gap;
}

function closestCarAhead() {
  let bestGap = 1;
  let bestLane = 99;
  for (const ai of aiCars) {
    const lapDelta = ai.lap - (player.lap - 1);
    if (lapDelta < 0 || lapDelta > 1) continue;
    const gap = lapDelta === 0 ? wrappedProgressGap(player.progress, ai.progress) : 1 - player.progress + ai.progress;
    if (gap > 0 && gap < bestGap) {
      bestGap = gap;
      bestLane = Math.abs(ai.lane);
    }
  }
  return { gap: bestGap, lane: bestLane };
}

function isGravelTrap(progress: number, distance: number) {
  if (distance < TRACK_WIDTH / 2 + 7) return false;
  const zones = [.27,.49,.77];
  return zones.some(z => {
    const d = Math.min(Math.abs(progress-z), 1-Math.abs(progress-z));
    return d < .045;
  });
}

function togglePitRequest() {
  if (pitStop.state.phase === 'REQUESTED') {
    pitStop.cancel();
    showMessage('PIT REQUEST CANCELLED');
    return;
  }
  if (pitStop.state.phase !== 'NONE') return;

  const select = document.querySelector<HTMLSelectElement>('#pit-compound');
  const compound = (select?.value ?? 'MEDIUM') as TireCompoundId;
  pitStop.request({ compound, repairFrontWing: false });
  showMessage(`BOX THIS LAP · ${compound}`, 3200);
}

function completeLapIfNeeded(raceTime: number) {
  if (player.previousProgress > .88 && player.progress < .12 && raceTime - player.lapStartedAt > 15) {
    const lapTime = raceTime - player.lapStartedAt;
    player.bestLap = Math.min(player.bestLap, lapTime);
    player.lap += 1;
    player.lapStartedAt = raceTime;
    showMessage(`LAP ${player.lap - 1} · ${formatTime(lapTime)}`);
    if (player.lap > RACE_LAPS) {
      finished = true;
      showMessage(`CHEQUERED FLAG · BEST ${formatTime(player.bestLap)}`, 5000);
      window.setTimeout(showFinalClassification, 900);
    }
  }
}

function updatePitLane(dt: number, raceTime: number): boolean {
  if (!pitCurve) return false;

  // A request becomes a pit entry once the car reaches the configured entry line.
  if (pitStop.state.phase === 'REQUESTED') {
    pitStop.step({
      dt,
      progress: player.progress,
      speedMps: player.speed,
      inPitLane: false,
      inPitBox: false,
      laneClear: true,
      pitEntryProgress: ARDENNE_GP.pitEntry,
      pitExitProgress: ARDENNE_GP.pitExit,
      pitSpeedLimitMps: ARDENNE_GP.pitSpeedLimitMps,
    });
    if (pitStop.state.phase === 'ENTRY') {
      pitLaneProgress = 0;
      showMessage('PIT LANE · LIMITER', 2600);
    } else {
      return false;
    }
  }

  if (pitStop.state.phase === 'NONE') return false;

  const oldPhase = pitStop.state.phase;
  const inService = oldPhase === 'STOPPED' || oldPhase === 'SERVICE';
  const approachingBox = oldPhase === 'ENTRY' || oldPhase === 'LANE';
  const exiting = oldPhase === 'RELEASE' || oldPhase === 'EXIT';

  let targetSpeed = ARDENNE_GP.pitSpeedLimitMps - .7;
  if (approachingBox && pitLaneProgress > PIT_BOX_T - .075) {
    const remaining = Math.max(0, PIT_BOX_T - pitLaneProgress);
    targetSpeed = Math.min(targetSpeed, remaining * pitLaneLength * .85);
  }
  if (inService) targetSpeed = 0;
  if (exiting) targetSpeed = ARDENNE_GP.pitSpeedLimitMps - .5;

  const accel = targetSpeed > player.speed ? 8.5 : 22;
  player.speed = THREE.MathUtils.lerp(player.speed, targetSpeed, 1 - Math.exp(-dt * accel));

  if (!inService) {
    pitLaneProgress += (player.speed * dt) / Math.max(1, pitLaneLength);
  }
  if (approachingBox && pitLaneProgress >= PIT_BOX_T) {
    pitLaneProgress = PIT_BOX_T;
    player.speed = 0;
  }
  pitLaneProgress = THREE.MathUtils.clamp(pitLaneProgress, 0, 1);

  const p = pitCurve.getPointAt(pitLaneProgress);
  const tangent = pitCurve.getTangentAt(Math.min(.999, pitLaneProgress)).normalize();
  player.position.copy(p).add(new THREE.Vector3(0, .22, 0));
  player.heading = Math.atan2(tangent.x, tangent.z);
  player.car.position.copy(player.position);
  player.car.rotation.set(0, player.heading, 0);

  player.previousProgress = player.progress;
  const wrappedSpan = (1 - ARDENNE_GP.pitEntry) + ARDENNE_GP.pitExit;
  player.progress = (ARDENNE_GP.pitEntry + pitLaneProgress * wrappedSpan) % 1;
  completeLapIfNeeded(raceTime);

  const inPitBox = Math.abs(pitLaneProgress - PIT_BOX_T) < .008;
  const leavingLane = pitLaneProgress > .992;

  pitStop.step({
    dt,
    progress: leavingLane ? ARDENNE_GP.pitExit : player.progress,
    speedMps: player.speed,
    inPitLane: !leavingLane,
    inPitBox,
    laneClear: true,
    pitEntryProgress: ARDENNE_GP.pitEntry,
    pitExitProgress: ARDENNE_GP.pitExit,
    pitSpeedLimitMps: ARDENNE_GP.pitSpeedLimitMps,
  });

  if (pitStop.state.pitSpeeding) {
    pitPenaltySeconds = Math.max(pitPenaltySeconds, 5);
  }

  if (oldPhase === 'SERVICE' && pitStop.state.phase !== 'SERVICE') {
    player.compound = pitStop.state.compound;
    player.tyre = 1;
    player.tyreTemp = player.compound === 'SOFT' ? 88 : player.compound === 'HARD' ? 80 : 84;
    pitStopCount += 1;
    showMessage(`PIT STOP COMPLETE · ${player.compound}`, 3200);
  }

  if (pitStop.state.phase === 'NONE') {
    const exit = trackCurve.getPointAt(ARDENNE_GP.pitExit);
    const exitTangent = trackCurve.getTangentAt(ARDENNE_GP.pitExit).normalize();
    player.position.copy(exit).add(new THREE.Vector3(0, .22, 0));
    player.heading = Math.atan2(exitTangent.x, exitTangent.z);
    player.progress = ARDENNE_GP.pitExit;
    player.previousProgress = player.progress;
    player.car.position.copy(player.position);
    player.car.rotation.set(0, player.heading, 0);
    showMessage(pitPenaltySeconds > 0 ? `PIT EXIT · +${pitPenaltySeconds}s PENALTY` : 'PIT EXIT', 2600);
  }

  return true;
}

function updatePlayer(dt: number, raceTime: number) {
  const throttleTarget = (keys.has('KeyW') || keys.has('ArrowUp') || touch.has('throttle')) ? 1 : 0;
  const brakeTarget = (keys.has('KeyS') || keys.has('ArrowDown') || touch.has('brake')) ? 1 : 0;
  const steerTarget = (keys.has('KeyA') || keys.has('ArrowLeft') || touch.has('left') ? 1 : 0) + (keys.has('KeyD') || keys.has('ArrowRight') || touch.has('right') ? -1 : 0);
  player.throttle = THREE.MathUtils.lerp(player.throttle, throttleTarget, 1 - Math.exp(-dt * 8));
  player.brake = THREE.MathUtils.lerp(player.brake, brakeTarget, 1 - Math.exp(-dt * 12));
  player.steer = THREE.MathUtils.lerp(player.steer, steerTarget, 1 - Math.exp(-dt * 7));
  player.ersDeploy = (keys.has('Space') || touch.has('ers')) && player.ers > .005;

  if (updatePitLane(dt, raceTime)) return;

  const trackInfo = nearestTrackProgress(player.position);
  player.previousProgress = player.progress;
  player.progress = trackInfo.progress;
  const gravel = isGravelTrap(player.progress, trackInfo.distance);
  player.onKerb = trackInfo.distance > TRACK_WIDTH * .47 && trackInfo.distance <= TRACK_WIDTH * .59;
  player.offTrack = trackInfo.distance > TRACK_WIDTH * .59;
  player.surface = gravel ? 'GRAVEL' : player.offTrack ? 'RUNOFF' : player.onKerb ? 'KERB' : 'TRACK';

  const ahead = closestCarAhead();
  player.slipstream = THREE.MathUtils.clamp((.04 - ahead.gap) / .03, 0, 1);
  const drsZone = ARDENNE_GP.drsZones.some(zone =>
    player.progress >= zone.activationStart && player.progress <= zone.activationEnd
  );
  player.drsReady = drsZone && player.lap >= 2 && ahead.gap < .035;
  if (!player.drsReady || player.brake > .08) player.drs = false;

  const maxSpeed = player.drs && player.drsReady ? 104 : 97;
  const engineAccel = 25.5 * Math.pow(player.throttle, 1.12) * (1 - Math.min(player.speed / maxSpeed, .985));
  const ersAccel = player.ersDeploy ? 7.2 : 0;
  const draftDragScale = 1 - player.slipstream * .22;
  const drag = .00385 * player.speed * player.speed * draftDragScale;
  const rolling = gravel ? 10.5 : player.offTrack ? 5.6 : player.onKerb ? 1.25 : .52;
  const braking = 37.5 * player.brake;
  player.speed += (engineAccel + ersAccel - drag - rolling - braking) * dt;
  player.speed = THREE.MathUtils.clamp(player.speed, 0, maxSpeed);

  if (player.ersDeploy) player.ers = Math.max(0, player.ers - dt * .085);
  else player.ers = Math.min(1, player.ers + dt * (player.throttle < .3 ? .038 : .012));

  const steeringLimit = THREE.MathUtils.lerp(.61, .115, THREE.MathUtils.clamp(player.speed / 100, 0, 1));
  const targetTemp = player.compound === 'SOFT' ? 100 : player.compound === 'HARD' ? 94 : 98;
  const compoundGrip = player.compound === 'SOFT' ? 1.035 : player.compound === 'HARD' ? .975 : 1;
  const tempGrip = THREE.MathUtils.clamp(1 - Math.abs(player.tyreTemp - targetTemp) / 90, .72, 1);
  const wearGrip = THREE.MathUtils.lerp(.78, 1, player.tyre);
  const surfaceGrip = gravel ? .32 : player.offTrack ? .5 : player.onKerb ? .84 : 1;
  const grip = tempGrip * wearGrip * surfaceGrip * compoundGrip;
  const aeroGrip = THREE.MathUtils.lerp(.78, 1.18, THREE.MathUtils.clamp(player.speed / 92,0,1));
  const yawRate = player.steer * steeringLimit * grip * aeroGrip * (player.speed / 13) / (1 + player.speed / 36);
  player.heading += yawRate * dt;

  // Mild stability: car aligns toward track direction when on-track, preserving player control.
  if (!player.offTrack && player.speed > 8) {
    const tangent = trackCurve.getTangentAt(player.progress).normalize();
    const trackHeading = Math.atan2(tangent.x, tangent.z);
    let diff = trackHeading - player.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    player.heading += diff * dt * .24;
  }

  const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  player.position.addScaledVector(forward, player.speed * dt);
  player.position.y = trackCurve.getPointAt(player.progress).y + .22;
  player.car.position.copy(player.position);
  player.car.rotation.set(0, player.heading, 0);

  const heatIn = Math.abs(player.steer) * player.speed * .014 + player.brake * 5.8 + player.throttle * 1.3;
  const cooling = (player.tyreTemp - 82) * (.035 + player.speed * .00042);
  player.tyreTemp = THREE.MathUtils.clamp(player.tyreTemp + (heatIn - cooling) * dt, 65, 130);
  const heatWear = 1 + Math.max(0, player.tyreTemp - 103) * .025;
  const compoundWear = player.compound === 'SOFT' ? 1.22 : player.compound === 'HARD' ? .68 : .88;
  const wearRate = (Math.abs(player.steer) * .00005 + player.brake * .000032 + player.throttle * .000011) * (1 + player.speed / 85) * heatWear * compoundWear;
  player.tyre = Math.max(.52, player.tyre - wearRate * dt * 60);

  // Start/finish wrap detection.
  if (player.speed > 8) completeLapIfNeeded(raceTime);
}

function updateAI(dt: number, racing: boolean) {
  for (let i = 0; i < aiCars.length; i++) {
    const ai = aiCars[i];
    if (racing && !finished) {
      const ta = trackCurve.getTangentAt((ai.progress + .998) % 1).normalize();
      const tb = trackCurve.getTangentAt((ai.progress + .002) % 1).normalize();
      const cornerLoad = THREE.MathUtils.clamp(ta.angleTo(tb) * 160, 0, 28);
      const racingVariation = Math.sin(performance.now() * .00045 + i * 1.7) * 1.8;
      const target = ai.baseSpeed - cornerLoad + racingVariation;
      ai.speed = THREE.MathUtils.lerp(ai.speed, target, dt * 1.15);
      ai.lane = THREE.MathUtils.lerp(ai.lane, Math.sin(ai.progress * Math.PI * 10 + i * .8) * 1.65, dt * .55);
      const old = ai.progress;
      ai.progress = (ai.progress + (ai.speed * dt) / 1900) % 1;
      if (old > .95 && ai.progress < .05) ai.lap++;
    }
    const p = trackCurve.getPointAt(ai.progress);
    const tangent = trackCurve.getTangentAt(ai.progress).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    p.addScaledVector(side, ai.lane);
    p.y += .22;
    ai.car.position.copy(p);
    ai.car.rotation.y = Math.atan2(tangent.x, tangent.z);
  }
}

function updateCamera(dt: number) {
  const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  const side = new THREE.Vector3(forward.z, 0, -forward.x);
  let desired = new THREE.Vector3();
  let look = player.position.clone().addScaledVector(forward, 8);

  if (cameraMode === 'chase') {
    desired.copy(player.position).addScaledVector(forward, -9.5).addScaledVector(side, .1).add(new THREE.Vector3(0, 4.2, 0));
  } else if (cameraMode === 'cockpit') {
    desired.copy(player.position).addScaledVector(forward, .15).add(new THREE.Vector3(0, 1.35, 0));
    look = player.position.clone().addScaledVector(forward, 20).add(new THREE.Vector3(0, 1.05, 0));
  } else {
    const anchor = trackCurve.getPointAt((player.progress + .025) % 1);
    const tangent = trackCurve.getTangentAt((player.progress + .025) % 1).normalize();
    const broadcastSide = new THREE.Vector3(-tangent.z, 0, tangent.x);
    desired.copy(anchor).addScaledVector(broadcastSide, 24).add(new THREE.Vector3(0, 9, 0));
    look = player.position.clone().add(new THREE.Vector3(0, .8, 0));
  }

  camera.position.lerp(desired, 1 - Math.exp(-dt * (cameraMode === 'broadcast' ? 3 : 8)));
  camera.lookAt(look);
}

function computePosition(): number {
  const playerScore = (player.lap - 1) + player.progress;
  let ahead = 0;
  for (const ai of aiCars) {
    const score = ai.lap + ai.progress;
    if (score > playerScore) ahead++;
  }
  return Math.min(20, ahead + 1);
}

const els = {
  hud: document.querySelector<HTMLElement>('#hud')!,
  start: document.querySelector<HTMLElement>('#start-overlay')!,
  pause: document.querySelector<HTMLElement>('#pause-overlay')!,
  mobile: document.querySelector<HTMLElement>('#mobile-controls')!,
  position: document.querySelector<HTMLElement>('#position')!,
  lap: document.querySelector<HTMLElement>('#lap')!,
  status: document.querySelector<HTMLElement>('#race-status')!,
  lapTime: document.querySelector<HTMLElement>('#lap-time')!,
  best: document.querySelector<HTMLElement>('#best-time')!,
  speed: document.querySelector<HTMLElement>('#speed')!,
  gear: document.querySelector<HTMLElement>('#gear')!,
  throttle: document.querySelector<HTMLElement>('#throttle-bar')!,
  brake: document.querySelector<HTMLElement>('#brake-bar')!,
  ers: document.querySelector<HTMLElement>('#ers-bar')!,
  tyre: document.querySelector<HTMLElement>('#tyre-bar')!,
  ersText: document.querySelector<HTMLElement>('#ers-text')!,
  tyreText: document.querySelector<HTMLElement>('#tyre-text')!,
  temp: document.querySelector<HTMLElement>('#temp-bar')!,
  tempText: document.querySelector<HTMLElement>('#temp-text')!,
  drs: document.querySelector<HTMLElement>('#drs-indicator')!,
  ersInd: document.querySelector<HTMLElement>('#ers-indicator')!,
  draft: document.querySelector<HTMLElement>('#draft-indicator')!,
  surface: document.querySelector<HTMLElement>('#surface-indicator')!,
  pit: document.querySelector<HTMLElement>('#pit-indicator')!,
  pitStatus: document.querySelector<HTMLElement>('#pit-status')!,
  compound: document.querySelector<HTMLElement>('#compound-text')!,
  lights: document.querySelector<HTMLElement>('#start-lights')!,
  countdown: document.querySelector<HTMLElement>('#countdown')!,
  message: document.querySelector<HTMLElement>('#message')!,
  minimap: document.querySelector<HTMLCanvasElement>('#minimap')!,
};

function gearForSpeed(ms: number): string {
  const k = ms * 3.6;
  if (k < 5) return 'N';
  if (k < 55) return '1';
  if (k < 90) return '2';
  if (k < 125) return '3';
  if (k < 165) return '4';
  if (k < 205) return '5';
  if (k < 245) return '6';
  if (k < 285) return '7';
  return '8';
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '--:--.---';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

const minimapCtx = els.minimap.getContext('2d');
function drawMinimap() {
  if (!minimapCtx) return;
  const w = els.minimap.width, h = els.minimap.height;
  minimapCtx.clearRect(0,0,w,h);
  minimapCtx.strokeStyle = 'rgba(255,255,255,.42)';
  minimapCtx.lineWidth = 5;
  minimapCtx.lineCap = 'round';
  minimapCtx.beginPath();
  const xs = centerline.map(p=>p.x), zs = centerline.map(p=>p.z);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minZ=Math.min(...zs), maxZ=Math.max(...zs);
  const project=(p:THREE.Vector3)=>({
    x: 12+(p.x-minX)/(maxX-minX)*(w-24),
    y: 10+(p.z-minZ)/(maxZ-minZ)*(h-20)
  });
  centerline.forEach((p,i)=>{ const q=project(p); if(i===0) minimapCtx.moveTo(q.x,q.y); else minimapCtx.lineTo(q.x,q.y); });
  minimapCtx.closePath(); minimapCtx.stroke();

  const pp=project(player.position);
  minimapCtx.fillStyle='#ff314f'; minimapCtx.beginPath(); minimapCtx.arc(pp.x,pp.y,5,0,Math.PI*2); minimapCtx.fill();
  minimapCtx.fillStyle='rgba(255,255,255,.75)';
  for(let i=0;i<aiCars.length;i+=3){
    const q=project(aiCars[i].car.position); minimapCtx.beginPath(); minimapCtx.arc(q.x,q.y,2.3,0,Math.PI*2); minimapCtx.fill();
  }
}

function updateHUD(raceTime: number, now: number) {
  els.position.textContent = `P${computePosition()}`;
  els.lap.textContent = `LAP ${Math.min(player.lap, RACE_LAPS)}/${RACE_LAPS}`;
  els.lapTime.textContent = formatTime(Math.max(0, raceTime - player.lapStartedAt));
  els.best.textContent = formatTime(player.bestLap);
  els.speed.textContent = String(Math.round(player.speed * 3.6));
  els.gear.textContent = gearForSpeed(player.speed);
  els.throttle.style.width = `${player.throttle * 100}%`;
  els.brake.style.width = `${player.brake * 100}%`;
  els.ers.style.width = `${player.ers * 100}%`;
  els.tyre.style.width = `${player.tyre * 100}%`;
  els.temp.style.width = `${THREE.MathUtils.clamp((player.tyreTemp-65)/65,0,1)*100}%`;
  els.ersText.textContent = `${Math.round(player.ers * 100)}%`;
  els.tyreText.textContent = `${Math.round(player.tyre * 100)}%`;
  els.tempText.textContent = `${Math.round(player.tyreTemp)}°C`;
  els.drs.classList.toggle('ready', player.drsReady);
  els.drs.classList.toggle('active', player.drs);
  els.ersInd.classList.toggle('active', player.ersDeploy);
  els.draft.classList.toggle('active', player.slipstream > .25);
  els.surface.textContent = player.surface;
  els.surface.classList.toggle('warning', player.surface !== 'TRACK');
  const pitPhase = pitStop.state.phase;
  els.pit.textContent = pitPhase === 'NONE' ? 'PIT' : pitPhase;
  els.pit.classList.toggle('active', pitPhase !== 'NONE');
  els.pitStatus.textContent =
    pitPhase === 'SERVICE'
      ? `SERVICE ${Math.max(0, pitStop.state.requiredServiceS - pitStop.state.serviceElapsedS).toFixed(1)}s`
      : pitPhase === 'REQUESTED'
        ? `BOX THIS LAP · ${pitStop.state.compound}`
        : pitPhase !== 'NONE'
          ? `PIT · ${pitPhase}`
          : pitPenaltySeconds > 0
            ? `PENALTY +${pitPenaltySeconds}s`
            : `STOPS ${pitStopCount}`;
  els.compound.textContent = player.compound;
  els.status.textContent = finished ? 'CHEQUERED FLAG' : pitPhase !== 'NONE' ? `PIT ${pitPhase}` : player.drsReady ? 'DRS AVAILABLE' : player.slipstream > .35 ? 'SLIPSTREAM' : player.surface !== 'TRACK' ? player.surface : cameraMode.toUpperCase();
  drawMinimap();

  if (!raceStarted) return;
  const elapsed = (now - raceStartAt) / 1000;
  const lights = Array.from(els.lights.querySelectorAll('i'));
  els.lights.classList.toggle('show', elapsed < 5.9);
  els.lights.classList.toggle('go', elapsed >= 5);
  lights.forEach((light,i)=>light.classList.toggle('on', elapsed >= i+.65 && elapsed < 5));
  els.countdown.textContent = elapsed >= 5 && elapsed < 5.7 ? 'GO' : '';
}

let messageTimeout = 0;
function showMessage(text: string, duration = 2600) {
  els.message.textContent = text;
  els.message.classList.add('show');
  clearTimeout(messageTimeout);
  messageTimeout = window.setTimeout(() => els.message.classList.remove('show'), duration);
}

function showFinalClassification() {
  const overlay = document.querySelector<HTMLElement>('#finish-overlay');
  const body = document.querySelector<HTMLElement>('#results-body');
  const resultTitle = document.querySelector<HTMLElement>('#finish-title');
  if (!overlay || !body || !resultTitle) return;

  const entries = [
    {
      name: 'YOU · DVILR GP',
      score: (player.lap - 1) + player.progress,
      best: player.bestLap,
    },
    ...aiCars.map((ai, i) => ({
      name: `RIVAL ${String(i + 1).padStart(2, '0')}`,
      score: ai.lap + ai.progress,
      best: Number.POSITIVE_INFINITY,
    })),
  ].sort((a, b) => b.score - a.score);

  body.innerHTML = entries.map((entry, index) =>
    `<div class="result-row ${entry.name.startsWith('YOU') ? 'player-result' : ''}">
      <b>P${index + 1}</b>
      <span>${entry.name}</span>
      <em>${Number.isFinite(entry.best) ? formatTime(entry.best) : 'CLASSIFIED'}</em>
    </div>`
  ).join('');

  const pos = entries.findIndex(entry => entry.name.startsWith('YOU')) + 1;
  resultTitle.textContent = `P${pos} · RACE COMPLETE${pitPenaltySeconds ? ` · +${pitPenaltySeconds}s` : ''}`;
  overlay.classList.add('active');
  els.mobile.classList.add('hidden');
}

function togglePause() {
  paused = !paused;
  els.pause.classList.toggle('active', paused);
}

document.querySelector<HTMLButtonElement>('#start-btn')!.addEventListener('click', () => {
  raceStarted = true;
  paused = false;
  finished = false;
  resetPlayer(false);
  for (let i = 0; i < aiCars.length; i++) {
    aiCars[i].progress = .006 + i * .0026;
    aiCars[i].lap = 0;
    aiCars[i].speed = 0;
  }
  simTime = 0;
  raceStartAt = performance.now();
  player.lapStartedAt = 0;
  els.start.classList.remove('active');
  els.hud.classList.remove('hidden');
  if (matchMedia('(pointer: coarse)').matches || innerWidth < 800) els.mobile.classList.remove('hidden');
});
document.querySelector<HTMLButtonElement>('#resume-btn')!.addEventListener('click', togglePause);
document.querySelector<HTMLButtonElement>('#box-btn')!.addEventListener('click', togglePitRequest);

let last = performance.now();
let accumulator = 0;
let simTime = 0;
const FIXED = 1 / 120;

function loop(now: number) {
  requestAnimationFrame(loop);
  const rawDt = Math.min((now - last) / 1000, .05);
  last = now;

  if (!paused) {
    accumulator += rawDt;
    while (accumulator >= FIXED) {
      const countdownDone = raceStarted && (now - raceStartAt) / 1000 >= 5;
      if (raceStarted && countdownDone && !finished) {
        simTime += FIXED;
        updatePlayer(FIXED, simTime);
      }
      updateAI(FIXED, Boolean(raceStarted && countdownDone));
      accumulator -= FIXED;
    }
    updateCamera(rawDt);
  }

  updateHUD(simTime, now);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(innerWidth, innerHeight);
});

// Position camera before start screen.
updateCamera(1);
