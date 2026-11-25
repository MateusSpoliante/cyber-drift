import * as THREE from 'three';
import { CircuitData } from '../track/monzaTrack';
import { CameraMode, CarSnapshot, GhostFrame } from '../types/sim';

export class FormulaScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private circuit: CircuitData;

  private carGroup: THREE.Group;
  private carBodyGroup: THREE.Group;
  private frontLeftWheel: THREE.Group;
  private frontRightWheel: THREE.Group;
  private rearLeftWheel: THREE.Mesh;
  private rearRightWheel: THREE.Mesh;
  private brakeLights: THREE.MeshStandardMaterial;

  private ghostGroup: THREE.Group;
  private cameraMode: CameraMode = 'tcam';
  private smoothCamPos = new THREE.Vector3();
  private smoothCamLook = new THREE.Vector3();

  constructor(container: HTMLElement, circuit: CircuitData) {
    this.circuit = circuit;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b111e');
    this.scene.fog = new THREE.FogExp2('#0b111e', 0.0014);

    this.camera = new THREE.PerspectiveCamera(
      62,
      container.clientWidth / container.clientHeight,
      0.15,
      1400
    );

    this.setupLighting();
    this.buildEnvironment();
    this.buildTrack();

    const carBuilt = this.buildFormulaCar(false);
    this.carGroup = carBuilt.root;
    this.carBodyGroup = carBuilt.body;
    this.frontLeftWheel = carBuilt.fl;
    this.frontRightWheel = carBuilt.fr;
    this.rearLeftWheel = carBuilt.rl;
    this.rearRightWheel = carBuilt.rr;
    this.brakeLights = carBuilt.brakeMat;
    this.scene.add(this.carGroup);

    const ghostBuilt = this.buildFormulaCar(true);
    this.ghostGroup = ghostBuilt.root;
    this.ghostGroup.visible = false;
    this.scene.add(this.ghostGroup);

    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    this.camera.aspect = parent.clientWidth / parent.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
  };

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
  }

  public getCameraMode(): CameraMode {
    return this.cameraMode;
  }

  private setupLighting(): void {
    const hemi = new THREE.HemisphereLight('#93c5fd', '#1e293b', 0.85);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fff7ed', 2.4);
    sun.position.set(220, 320, -180);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 1100;
    const d = 550;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    this.scene.add(sun);
  }

  private buildEnvironment(): void {
    // Grass infield / park ground (Autodromo Nazionale Monza park feel)
    const groundGeo = new THREE.PlaneGeometry(2600, 2600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#16271c',
      roughness: 0.95,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Instanced trees around Monza Royal Park
    const treeCount = 450;
    const trunkGeo = new THREE.CylinderGeometry(0.45, 0.7, 4.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#3f2e21', roughness: 0.9 });
    const crownGeo = new THREE.ConeGeometry(4.2, 11, 7);
    const crownMat = new THREE.MeshStandardMaterial({ color: '#1b3b24', roughness: 0.85 });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
    const dummy = new THREE.Object3D();

    let placed = 0;
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    while (placed < treeCount) {
      const tx = (rand() - 0.5) * 1400 + 200;
      const tz = (rand() - 0.5) * 1400 - 100;
      const q = this.circuit.queryPosition(tx, tz);
      if (q.distanceFromCenter > 26) {
        const scale = 0.8 + rand() * 0.9;
        dummy.position.set(tx, 2.25 * scale, tz);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        trunks.setMatrixAt(placed, dummy.matrix);

        dummy.position.set(tx, 8.5 * scale, tz);
        dummy.updateMatrix();
        crowns.setMatrixAt(placed, dummy.matrix);
        placed++;
      }
    }
    this.scene.add(trunks, crowns);
  }

  private buildTrack(): void {
    const samples = this.circuit.samples;
    const n = samples.length;

    const roadVertices: number[] = [];
    const roadIndices: number[] = [];
    const roadColors: number[] = [];

    const kerbVertices: number[] = [];
    const kerbIndices: number[] = [];
    const kerbColors: number[] = [];

    const barrierVertices: number[] = [];
    const barrierIndices: number[] = [];

    const hw = this.circuit.trackHalfWidth;
    const kw = this.circuit.kerbWidth;
    const bw = hw + kw + this.circuit.runoffWidth;

    for (let i = 0; i <= n; i++) {
      const s = samples[i % n];
      const p = s.pos;
      const r = s.right;

      // Asphalt ribbon
      const leftEdge = p.clone().addScaledVector(r, -hw);
      const rightEdge = p.clone().addScaledVector(r, hw);
      roadVertices.push(leftEdge.x, 0.01, leftEdge.z);
      roadVertices.push(rightEdge.x, 0.01, rightEdge.z);

      // Subtle racing line darkening
      const shade = 0.14 + 0.015 * Math.sin(i * 0.25);
      roadColors.push(shade, shade, shade + 0.01);
      roadColors.push(shade, shade, shade + 0.01);

      // Kerbs (red/white Italian Monza style)
      const isRed = Math.floor(i / 3) % 2 === 0;
      const kc = isRed ? [0.85, 0.12, 0.15] : [0.92, 0.93, 0.95];

      const lKerbOut = p.clone().addScaledVector(r, -(hw + kw));
      const rKerbOut = p.clone().addScaledVector(r, hw + kw);

      kerbVertices.push(lKerbOut.x, 0.025, lKerbOut.z);
      kerbVertices.push(leftEdge.x, 0.015, leftEdge.z);
      kerbVertices.push(rightEdge.x, 0.015, rightEdge.z);
      kerbVertices.push(rKerbOut.x, 0.025, rKerbOut.z);

      for (let k = 0; k < 4; k++) {
        kerbColors.push(kc[0], kc[1], kc[2]);
      }

      // Guardrails / Armco barriers
      const lBar = p.clone().addScaledVector(r, -bw);
      const rBar = p.clone().addScaledVector(r, bw);
      barrierVertices.push(lBar.x, 0, lBar.z);
      barrierVertices.push(lBar.x, 1.15, lBar.z);
      barrierVertices.push(rBar.x, 0, rBar.z);
      barrierVertices.push(rBar.x, 1.15, rBar.z);

      if (i < n) {
        const base = i * 2;
        roadIndices.push(base, base + 1, base + 2);
        roadIndices.push(base + 1, base + 3, base + 2);

        const kBase = i * 4;
        kerbIndices.push(kBase, kBase + 1, kBase + 4);
        kerbIndices.push(kBase + 1, kBase + 5, kBase + 4);
        kerbIndices.push(kBase + 2, kBase + 3, kBase + 6);
        kerbIndices.push(kBase + 3, kBase + 7, kBase + 6);

        const bBase = i * 4;
        barrierIndices.push(bBase, bBase + 4, bBase + 1);
        barrierIndices.push(bBase + 1, bBase + 4, bBase + 5);
        barrierIndices.push(bBase + 2, bBase + 3, bBase + 6);
        barrierIndices.push(bBase + 3, bBase + 7, bBase + 6);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
    roadGeo.setAttribute('color', new THREE.Float32BufferAttribute(roadColors, 3));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.05,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    const kerbGeo = new THREE.BufferGeometry();
    kerbGeo.setAttribute('position', new THREE.Float32BufferAttribute(kerbVertices, 3));
    kerbGeo.setAttribute('color', new THREE.Float32BufferAttribute(kerbColors, 3));
    kerbGeo.setIndex(kerbIndices);
    kerbGeo.computeVertexNormals();

    const kerbMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.65,
    });
    this.scene.add(new THREE.Mesh(kerbGeo, kerbMat));

    const barGeo = new THREE.BufferGeometry();
    barGeo.setAttribute('position', new THREE.Float32BufferAttribute(barrierVertices, 3));
    barGeo.setIndex(barrierIndices);
    barGeo.computeVertexNormals();
    const barMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      metalness: 0.6,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    this.scene.add(new THREE.Mesh(barGeo, barMat));

    // Start/Finish Gantry & Line
    const startSample = samples[8];
    const lineGeo = new THREE.PlaneGeometry(hw * 2, 1.8);
    const lineMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
    const startLine = new THREE.Mesh(lineGeo, lineMat);
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.copy(startSample.pos).add(new THREE.Vector3(0, 0.03, 0));
    startLine.rotation.z = Math.atan2(-startSample.tangent.x, -startSample.tangent.z);
    this.scene.add(startLine);

    // Gantry arch
    const gantryGroup = new THREE.Group();
    const pillarGeo = new THREE.BoxGeometry(0.8, 7.5, 0.8);
    const gantryMat = new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.5, roughness: 0.3 });
    const leftPillar = new THREE.Mesh(pillarGeo, gantryMat);
    leftPillar.position.set(-hw - 1.5, 3.75, 0);
    const rightPillar = new THREE.Mesh(pillarGeo, gantryMat);
    rightPillar.position.set(hw + 1.5, 3.75, 0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 4, 1.3, 1.2), gantryMat);
    beam.position.set(0, 7.2, 0);
    gantryGroup.add(leftPillar, rightPillar, beam);
    gantryGroup.position.copy(startSample.pos);
    gantryGroup.rotation.y = Math.atan2(-startSample.tangent.x, -startSample.tangent.z);
    this.scene.add(gantryGroup);

    // Braking marker boards (150m, 100m, 50m) at key braking zones
    this.addBrakingBoards(samples);
  }

  private addBrakingBoards(samples: CircuitData['samples']): void {
    const brakingIndices = [130, 310, 665, 920]; // Approaching Chicanes, Ascari, Parabolica
    const boardMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
    const boardGeo = new THREE.BoxGeometry(0.15, 1.1, 1.6);

    for (const baseIdx of brakingIndices) {
      for (let step = 0; step < 3; step++) {
        const idx = (baseIdx - step * 18 + samples.length) % samples.length;
        const s = samples[idx];
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.copy(s.pos).addScaledVector(s.right, -(this.circuit.trackHalfWidth + 3.2));
        board.position.y = 1.2;
        board.rotation.y = Math.atan2(-s.tangent.x, -s.tangent.z);
        this.scene.add(board);
      }
    }
  }

  private buildFormulaCar(isGhost: boolean) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const primaryMat = isGhost
      ? new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.34, wireframe: false })
      : new THREE.MeshStandardMaterial({ color: '#dc2626', metalness: 0.45, roughness: 0.25 });

    const carbonMat = isGhost
      ? new THREE.MeshBasicMaterial({ color: '#0284c7', transparent: true, opacity: 0.28 })
      : new THREE.MeshStandardMaterial({ color: '#18181b', metalness: 0.3, roughness: 0.55 });

    const tireMat = isGhost
      ? new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.3 })
      : new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.85 });

    const brakeMat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#ef4444',
      emissiveIntensity: 0,
    });

    // Monocoque chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.46, 3.4), primaryMat);
    chassis.position.set(0, 0.44, 0.15);
    chassis.castShadow = !isGhost;
    body.add(chassis);

    // Nose cone
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 1.55), primaryMat);
    nose.position.set(0, 0.34, -2.05);
    nose.castShadow = !isGhost;
    body.add(nose);

    // Sidepods
    const leftPod = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 1.85), primaryMat);
    leftPod.position.set(-0.56, 0.42, 0.35);
    const rightPod = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 1.85), primaryMat);
    rightPod.position.set(0.56, 0.42, 0.35);
    body.add(leftPod, rightPod);

    // Engine cover / Airbox
    const airbox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 1.45), primaryMat);
    airbox.position.set(0, 0.82, 0.55);
    body.add(airbox);

    // Halo cockpit protection
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 20, Math.PI), carbonMat);
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.set(0, 0.72, -0.35);
    const haloPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.26), carbonMat);
    haloPillar.position.set(0, 0.62, -0.66);
    haloPillar.rotation.x = -0.35;
    body.add(haloRing, haloPillar);

    // Driver Helmet
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 16, 16),
      isGhost ? primaryMat : new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.6, roughness: 0.2 })
    );
    helmet.position.set(0, 0.68, -0.18);
    body.add(helmet);

    // Front Wing
    const frontWing = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.07, 0.52), carbonMat);
    frontWing.position.set(0, 0.16, -2.65);
    body.add(frontWing);

    // Rear Wing
    const rearWing = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.24, 0.36), carbonMat);
    rearWing.position.set(0, 0.96, 2.05);
    const rwEndL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.48), primaryMat);
    rwEndL.position.set(-0.58, 0.84, 2.05);
    const rwEndR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.48), primaryMat);
    rwEndR.position.set(0.58, 0.84, 2.05);
    body.add(rearWing, rwEndL, rwEndR);

    // Rear Rain / Brake LED light
    const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.08), brakeMat);
    rainLight.position.set(0, 0.38, 2.22);
    body.add(rainLight);

    // Wheels
    const createWheel = (width: number) => {
      const geo = new THREE.CylinderGeometry(0.33, 0.33, width, 22);
      geo.rotateZ(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, tireMat);
      mesh.castShadow = !isGhost;
      return mesh;
    };

    const flGroup = new THREE.Group();
    flGroup.position.set(-0.92, 0.33, -1.75);
    flGroup.add(createWheel(0.34));

    const frGroup = new THREE.Group();
    frGroup.position.set(0.92, 0.33, -1.75);
    frGroup.add(createWheel(0.34));

    const rlMesh = createWheel(0.42);
    rlMesh.position.set(-0.94, 0.33, 1.65);

    const rrMesh = createWheel(0.42);
    rrMesh.position.set(0.94, 0.33, 1.65);

    root.add(flGroup, frGroup, rlMesh, rrMesh);

    return {
      root,
      body,
      fl: flGroup,
      fr: frGroup,
      rl: rlMesh,
      rr: rrMesh,
      brakeMat,
    };
  }

  public render(snapshot: CarSnapshot, ghost: GhostFrame | null): void {
    // Update player car transform
    this.carGroup.position.set(snapshot.x, snapshot.y, snapshot.z);
    this.carGroup.rotation.y = snapshot.yaw;

    this.carBodyGroup.rotation.z = snapshot.roll;
    this.carBodyGroup.rotation.x = snapshot.pitch;

    // Front wheel steering + rotation
    this.frontLeftWheel.rotation.y = -snapshot.steerAngle * 0.42;
    this.frontRightWheel.rotation.y = -snapshot.steerAngle * 0.42;
    this.frontLeftWheel.children[0].rotation.x = -snapshot.wheelSpinFL;
    this.frontRightWheel.children[0].rotation.x = -snapshot.wheelSpinFR;
    this.rearLeftWheel.rotation.x = -snapshot.wheelSpinRL;
    this.rearRightWheel.rotation.x = -snapshot.wheelSpinRR;

    // Brake light intensity
    this.brakeLights.emissiveIntensity = snapshot.brake > 0.05 ? 3.5 : 0.2;

    // Update Ghost Car
    if (ghost) {
      this.ghostGroup.visible = true;
      this.ghostGroup.position.set(ghost.x, ghost.y + 0.02, ghost.z);
      this.ghostGroup.rotation.y = ghost.yaw;
    } else {
      this.ghostGroup.visible = false;
    }

    // Update Camera
    const forward = new THREE.Vector3(-Math.sin(snapshot.yaw), 0, -Math.cos(snapshot.yaw));
    const right = new THREE.Vector3(Math.cos(snapshot.yaw), 0, -Math.sin(snapshot.yaw));
    const carPos = new THREE.Vector3(snapshot.x, snapshot.y, snapshot.z);

    if (this.cameraMode === 'cockpit') {
      const eye = carPos
        .clone()
        .add(new THREE.Vector3(0, 0.78, 0))
        .addScaledVector(forward, 0.18)
        .addScaledVector(right, snapshot.steerAngle * 0.08);
      const lookTarget = eye.clone().addScaledVector(forward, 35).add(new THREE.Vector3(0, -0.8, 0));
      this.camera.position.copy(eye);
      this.camera.lookAt(lookTarget);
    } else if (this.cameraMode === 'tcam') {
      const eye = carPos
        .clone()
        .add(new THREE.Vector3(0, 1.32, 0))
        .addScaledVector(forward, -0.58);
      const lookTarget = carPos.clone().addScaledVector(forward, 32).add(new THREE.Vector3(0, 0.35, 0));
      this.camera.position.copy(eye);
      this.camera.lookAt(lookTarget);
    } else {
      // Dynamic Chase Camera
      const desiredPos = carPos
        .clone()
        .add(new THREE.Vector3(0, 2.35, 0))
        .addScaledVector(forward, -6.2);
      const desiredLook = carPos.clone().addScaledVector(forward, 12).add(new THREE.Vector3(0, 0.85, 0));

      if (this.smoothCamPos.lengthSq() === 0) {
        this.smoothCamPos.copy(desiredPos);
        this.smoothCamLook.copy(desiredLook);
      } else {
        this.smoothCamPos.lerp(desiredPos, 0.22);
        this.smoothCamLook.lerp(desiredLook, 0.32);
      }
      this.camera.position.copy(this.smoothCamPos);
      this.camera.lookAt(this.smoothCamLook);
    }

    // Dynamic FOV sensation at high speeds (>250 km/h)
    const speedFactor = Math.min(1, Math.max(0, (snapshot.speedKmh - 160) / 180));
    const targetFov = (this.cameraMode === 'cockpit' ? 68 : 62) + speedFactor * 11;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * 0.15;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
