# Next-Gen Engine — Cyber Drift

Esta pasta contém a nova base técnica do jogo. Ela ainda não substitui o loop legado: a migração será feita depois de validar a física e a pista separadamente, para preservar garagem, recordes, ghosts e backend.

## Exemplo de inicialização dos módulos

O exemplo abaixo demonstra a ligação entre os módulos. Ele é um ponto de partida de integração, não substitui a migração do `main.js` atual.

```js
import * as THREE from 'three';
import { createSportsCarMesh } from '../game/Car.js';
import {
    PhysicsWorld,
    VehicleController,
    Engine,
    TrackBuilder,
    AudioSynth,
    VFXSystem,
    RenderPipeline,
    EnvironmentBuilder,
    CameraRig,
    LightingRig
} from './engine/index.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 9, -18);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const lighting = new LightingRig(scene, renderer);
const cameraRig = new CameraRig(camera);
const environment = new EnvironmentBuilder(renderer);
scene.environment = environment.create();

const physics = await PhysicsWorld.create({ fixedTimeStep: 1 / 120 });
physics.createGround();

const trackBuilder = new TrackBuilder({ scene, physics, width: 14, samples: 900 });
trackBuilder.build([
    [-60, 0, -20], [-35, 0, -60], [25, 0, -62], [62, 0, -20],
    [55, 0, 42], [0, 0, 65], [-55, 0, 40], [-68, 0, 0]
]);

const carAsset = createSportsCarMesh();
scene.add(carAsset.mesh);

const vehicle = new VehicleController({
    physics,
    spawn: { x: -60, y: 0.56, z: -20, heading: 2.58 },
    visual: carAsset
});

const post = new RenderPipeline(renderer, scene, camera);
const audio = new AudioSynth();
const vfx = new VFXSystem(scene);
const keys = new Set();

function updateInput() {
    vehicle.setInput({
        throttle: keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0,
        reverse: keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0,
        brake: keys.has('KeyX') ? 1 : 0,
        steer: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
            - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
        handbrake: keys.has('Space') ? 1 : 0
    });
}

window.addEventListener('keydown', event => {
    keys.add(event.code);
    updateInput();
    audio.start();
});
window.addEventListener('keyup', event => {
    keys.delete(event.code);
    updateInput();
});
window.addEventListener('blur', () => {
    keys.clear();
    updateInput();
});

const engine = new Engine({
    fixedTimeStep: 1 / 120,
    onFixedUpdate(dt) {
        vehicle.preStep(dt);
        physics.step(dt);
        vehicle.postStep();
    },
    onRender(dt, alpha) {
        vehicle.syncVisual(alpha);
        cameraRig.update(carAsset.mesh, vehicle.speedKmh, dt);
        lighting.follow(carAsset.mesh);
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

engine.start();
```

## Módulos

- `PhysicsWorld`: inicialização WASM, gravidade e timestep.
- `VehicleController`: rigid body do chassi, quatro rodas raycast, suspensão, tração, ré e frenagem.\n\nControles do exemplo: W acelera, S engata ré, X freia, A/D esterçam e Espaço aciona o freio de mão.
- `TrackBuilder`: spline 3D, elevação, banking, asfalto, zebras e colisores de barreira.
- `Engine`: acumulador de timestep fixo e interpolação visual.
- `AudioSynth`: motor e chiado dos pneus sintetizados via Web Audio API.
- `VFXSystem`: fumaça e faíscas em InstancedMesh, além do buffer de skidmarks.
- `RenderPipeline`: RenderPass, Bloom e SMAA.
- `EnvironmentBuilder`: environment map procedural de golden hour convertido em PMREM.
- `CameraRig` e `LightingRig`: câmera spring-arm, FOV dinâmico e iluminação com sombras.
- `UIManager`: atualização desacoplada do HUD por data-attributes.

## Dependências e integração

- `three` e `@dimforge/rapier3d-compat` são instalados pelo npm.
- Os addons do Three.js são importados de `three/addons/...`; mantenha todos na mesma versão do pacote principal.
- Rapier usa metros e segundos; mantenha a escala física consistente ao migrar as pistas antigas.
- O controlador nativo chama-se `DynamicRayCastVehicleController` e é criado por `world.createVehicleController(chassis)`.
- Chame `vehicle.preStep(dt)` antes de `physics.step(dt)` e `vehicle.postStep()` logo depois.
- O áudio só inicia após interação do usuário, conforme as políticas de autoplay dos navegadores.
- Não remova os sistemas antigos antes de validar colisões, direção, voltas, garagem e persistência no jogo integrado.
