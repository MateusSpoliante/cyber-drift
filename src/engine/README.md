# Next-Gen Engine — Cyber Drift

Esta pasta contém a nova base técnica do jogo. Ela ainda não substitui o loop legado: a migração será feita depois de validar a física e a pista separadamente, para não perder garagem, recordes, ghosts e backend.

## Inicialização

```js
import * as THREE from 'three';
import {
    PhysicsWorld,
    VehicleController,
    Engine,
    TrackBuilder,
    AudioSynth,
    VFXSystem,
    RenderPipeline,
    EnvironmentBuilder
} from './engine/index.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const lighting = new LightingRig(scene, renderer);
const cameraRig = new CameraRig(camera);

const physics = await PhysicsWorld.create({ fixedTimeStep: 1 / 120 });
physics.createGround();

const trackBuilder = new TrackBuilder({ scene, physics, width: 14, samples: 900 });
trackBuilder.build([
    [-60, 0, -20], [-35, 0, -60], [25, 0, -62], [62, 0, -20],
    [55, 0, 42], [0, 0, 65], [-55, 0, 40], [-68, 0, 0]
]);

const vehicle = new VehicleController({
    physics,
    spawn: { x: -60, y: 1.2, z: -20 }
});

const environment = new EnvironmentBuilder(renderer);
scene.environment = environment.create();
const post = new RenderPipeline(renderer, scene, camera);
const audio = new AudioSynth();
const vfx = new VFXSystem(scene);

const engine = new Engine({
    fixedTimeStep: 1 / 120,
    onFixedUpdate(dt) {
        vehicle.preStep(dt);
        physics.step(dt);
        vehicle.postStep();
    },
    onRender(dt, alpha) {
        vehicle.syncVisual(alpha);
        audio.update({
            speed: vehicle.speedKmh,
            throttle: vehicle.input.throttle,
            slipAngle: vehicle.slipAngle,
            drifting: vehicle.isDrifting
        });
        vfx.update(dt);
        post.render(dt);
    }
});

window.addEventListener('keydown', event => {
    if (event.code === 'KeyW') vehicle.setInput({ ...vehicle.input, throttle: 1 });
    if (event.code === 'KeyA') vehicle.setInput({ ...vehicle.input, steer: -1 });
    if (event.code === 'KeyD') vehicle.setInput({ ...vehicle.input, steer: 1 });
    if (event.code === 'Space') vehicle.setInput({ ...vehicle.input, handbrake: 1 });
});
window.addEventListener('keyup', event => {
    if (['KeyW', 'KeyA', 'KeyD', 'Space'].includes(event.code)) {
        vehicle.setInput({ throttle: 0, brake: 0, steer: 0, handbrake: 0 });
    }
});
window.addEventListener('pointerdown', () => audio.start(), { once: true });
engine.start();
```

## Módulos

- `PhysicsWorld`: inicialização WASM, gravidade e timestep.
- `VehicleController`: rigid body do chassi, quatro rodas raycast, suspensão e controles.
- `TrackBuilder`: spline 3D, elevação, banking, malha de asfalto e colisores.
- `Engine`: acumulador de timestep fixo e interpolação visual.
- `AudioSynth`: motor e pneus sintetizados em tempo real.
- `VFXSystem`: fumaça em InstancedMesh e buffer de skidmarks.
- `RenderPipeline`: RenderPass, Bloom e SMAA.
- `EnvironmentBuilder`: mapa de ambiente via PMREM.
- `UIManager`: atualização de elementos HUD por data-attributes.

## Dependências

`three` e `@dimforge/rapier3d-compat` são instalados pelo npm. Os addons do Three.js são importados de `three/addons`; não use cópias separadas de versões diferentes do Three.

## Notas de integração

- Rapier usa metros e segundos; mantenha a escala física consistente ao migrar as pistas antigas.
- O controlador nativo chama-se `DynamicRayCastVehicleController` e é criado por `world.createVehicleController(chassis)`.
- A chamada `vehicle.preStep(dt)` deve ocorrer antes de `physics.step(dt)`; `vehicle.postStep()` deve ocorrer logo depois.
- O áudio só inicia depois de uma interação do usuário, conforme as políticas de autoplay dos navegadores.
- Esta base ainda precisa ser ligada ao carro visual, câmera, HUD e estados de corrida do jogo principal. Não remova os sistemas antigos antes dessa validação.
