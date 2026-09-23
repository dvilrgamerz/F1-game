import * as THREE from 'three';
import './styles.css';

type CameraMode = 'chase' | 'cockpit' | 'broadcast';
type TouchAction = 'left' | 'right' | 'throttle' | 'brake';

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

const trackPoints = [
  [-250, -25], [-180, -145], [-25, -195], [125, -180], [250, -115], [325, 0],
  [285, 120], [170, 175], [55, 150], [-25, 95], [-120, 145], [-245, 125], [-320, 40]
].map(([x, z]) => new THREE.Vector3(x, 0.12, z));

const trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, 'centripetal', 0.45);
const TRACK_WIDTH = 15.5;
const TRACK_SAMPLES = 1100;
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
    positions.push(l.x, y, l.z, r.x, y, r.z);
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

scene.add(makeTrackRibbon(TRACK_WIDTH + 3.2, 0.08, new THREE.MeshStandardMaterial({ color: 0xb7b7b0, roughness: 1 })));
scene.add(makeTrackRibbon(TRACK_WIDTH, 0.14, new THREE.MeshStandardMaterial({ color: 0x2a2b2c, roughness: 0.86, metalness: 0.04 })));

// Start line
const startP = trackCurve.getPointAt(0);
const startT = trackCurve.getTangentAt(0).normalize();
const startAngle = Math.atan2(startT.x, startT.z);
const startLine = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH, 2.8), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
startLine.rotation.x = -Math.PI / 2;
startLine.rotation.z = -startAngle;
startLine.position.copy(startP).setY(0.17);
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
  dummy.position.y = 1.05;
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

  const wheelGeo = new THREE.CylinderGeometry(.43, .43, .34, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelLocs = [
    [-1.05, .45, -1.72], [1.05, .45, -1.72], [-1.02, .45, 1.58], [1.02, .45, 1.58]
  ];
  for (const [x, y, z] of wheelLocs) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.position.set(x, y, z);
    w.castShadow = true;
    car.add(w);
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
  drs: false,
  ersDeploy: false,
  offTrack: false
};
scene.add(player.car);

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
  if (e.code === 'KeyE') player.drs = !player.drs;
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

function resetPlayer(keepRace = false) {
  const p = trackCurve.getPointAt(0.002);
  const tangent = trackCurve.getTangentAt(0.002).normalize();
  player.position.copy(p);
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

function updatePlayer(dt: number, raceTime: number) {
  const throttleTarget = (keys.has('KeyW') || keys.has('ArrowUp') || touch.has('throttle')) ? 1 : 0;
  const brakeTarget = (keys.has('KeyS') || keys.has('ArrowDown') || touch.has('brake')) ? 1 : 0;
  const steerTarget = (keys.has('KeyA') || keys.has('ArrowLeft') || touch.has('left') ? 1 : 0) + (keys.has('KeyD') || keys.has('ArrowRight') || touch.has('right') ? -1 : 0);
  player.throttle = THREE.MathUtils.lerp(player.throttle, throttleTarget, 1 - Math.exp(-dt * 8));
  player.brake = THREE.MathUtils.lerp(player.brake, brakeTarget, 1 - Math.exp(-dt * 12));
  player.steer = THREE.MathUtils.lerp(player.steer, steerTarget, 1 - Math.exp(-dt * 7));
  player.ersDeploy = keys.has('Space') && player.ers > .005;

  const trackInfo = nearestTrackProgress(player.position);
  player.previousProgress = player.progress;
  player.progress = trackInfo.progress;
  player.offTrack = trackInfo.distance > TRACK_WIDTH * .55;

  const drsZone = player.progress > .06 && player.progress < .20;
  if (!drsZone) player.drs = false;

  const maxSpeed = player.drs && drsZone ? 101 : 95;
  const engineAccel = 24 * player.throttle * (1 - Math.min(player.speed / maxSpeed, .98));
  const ersAccel = player.ersDeploy ? 6.5 : 0;
  const drag = .0039 * player.speed * player.speed;
  const rolling = player.offTrack ? 5.8 : .55;
  const braking = 35 * player.brake;
  player.speed += (engineAccel + ersAccel - drag - rolling - braking) * dt;
  player.speed = THREE.MathUtils.clamp(player.speed, 0, maxSpeed);

  if (player.ersDeploy) player.ers = Math.max(0, player.ers - dt * .085);
  else player.ers = Math.min(1, player.ers + dt * (player.throttle < .3 ? .038 : .012));

  const steeringLimit = THREE.MathUtils.lerp(.58, .12, THREE.MathUtils.clamp(player.speed / 95, 0, 1));
  const grip = player.offTrack ? .52 : THREE.MathUtils.lerp(.94, .82, 1 - player.tyre);
  const yawRate = player.steer * steeringLimit * grip * (player.speed / 13) / (1 + player.speed / 36);
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
  player.position.y = .22;
  player.car.position.copy(player.position);
  player.car.rotation.set(0, player.heading, 0);

  const wearRate = (Math.abs(player.steer) * .000055 + player.brake * .000035 + player.throttle * .000012) * (1 + player.speed / 80);
  player.tyre = Math.max(.58, player.tyre - wearRate * dt * 60);

  // Start/finish wrap detection.
  if (player.previousProgress > .88 && player.progress < .12 && player.speed > 8 && raceTime - player.lapStartedAt > 15) {
    const lapTime = raceTime - player.lapStartedAt;
    player.bestLap = Math.min(player.bestLap, lapTime);
    player.lap += 1;
    player.lapStartedAt = raceTime;
    showMessage(`LAP ${player.lap - 1} · ${formatTime(lapTime)}`);
    if (player.lap > 5) {
      finished = true;
      showMessage(`FINISH · BEST ${formatTime(player.bestLap)}`, 9000);
    }
  }
}

function updateAI(dt: number, racing: boolean) {
  for (let i = 0; i < aiCars.length; i++) {
    const ai = aiCars[i];
    if (racing && !finished) {
      const curvatureNoise = Math.sin(ai.progress * Math.PI * 14 + i) * 5;
      const target = ai.baseSpeed - Math.abs(curvatureNoise) + Math.sin(performance.now() * .0005 + i) * 2.5;
      ai.speed = THREE.MathUtils.lerp(ai.speed, target, dt * .8);
      const old = ai.progress;
      ai.progress = (ai.progress + (ai.speed * dt) / 1900) % 1;
      if (old > .95 && ai.progress < .05) ai.lap++;
    }
    const p = trackCurve.getPointAt(ai.progress);
    const tangent = trackCurve.getTangentAt(ai.progress).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    p.addScaledVector(side, ai.lane);
    ai.car.position.copy(p).setY(.22);
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
  drs: document.querySelector<HTMLElement>('#drs-indicator')!,
  ersInd: document.querySelector<HTMLElement>('#ers-indicator')!,
  countdown: document.querySelector<HTMLElement>('#countdown')!,
  message: document.querySelector<HTMLElement>('#message')!,
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

function updateHUD(raceTime: number, now: number) {
  els.position.textContent = `P${computePosition()}`;
  els.lap.textContent = `LAP ${Math.min(player.lap, 5)}/5`;
  els.lapTime.textContent = formatTime(Math.max(0, raceTime - player.lapStartedAt));
  els.best.textContent = formatTime(player.bestLap);
  els.speed.textContent = String(Math.round(player.speed * 3.6));
  els.gear.textContent = gearForSpeed(player.speed);
  els.throttle.style.width = `${player.throttle * 100}%`;
  els.brake.style.width = `${player.brake * 100}%`;
  els.ers.style.width = `${player.ers * 100}%`;
  els.tyre.style.width = `${player.tyre * 100}%`;
  els.ersText.textContent = `${Math.round(player.ers * 100)}%`;
  els.tyreText.textContent = `${Math.round(player.tyre * 100)}%`;
  const drsZone = player.progress > .06 && player.progress < .20;
  els.drs.classList.toggle('active', player.drs && drsZone);
  els.ersInd.classList.toggle('active', player.ersDeploy);
  els.status.textContent = finished ? 'CHEQUERED FLAG' : player.offTrack ? 'OFF TRACK' : cameraMode.toUpperCase();

  if (!raceStarted) return;
  const elapsed = (now - raceStartAt) / 1000;
  if (elapsed < 1) els.countdown.textContent = '3';
  else if (elapsed < 2) els.countdown.textContent = '2';
  else if (elapsed < 3) els.countdown.textContent = '1';
  else if (elapsed < 3.7) els.countdown.textContent = 'GO';
  else els.countdown.textContent = '';
}

let messageTimeout = 0;
function showMessage(text: string, duration = 2600) {
  els.message.textContent = text;
  els.message.classList.add('show');
  clearTimeout(messageTimeout);
  messageTimeout = window.setTimeout(() => els.message.classList.remove('show'), duration);
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
  raceStartAt = performance.now();
  player.lapStartedAt = 0;
  els.start.classList.remove('active');
  els.hud.classList.remove('hidden');
  if (matchMedia('(pointer: coarse)').matches || innerWidth < 800) els.mobile.classList.remove('hidden');
});
document.querySelector<HTMLButtonElement>('#resume-btn')!.addEventListener('click', togglePause);

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
      const countdownDone = raceStarted && (now - raceStartAt) / 1000 >= 3.1;
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
