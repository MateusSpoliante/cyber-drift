import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

export class RenderPipeline {
    constructor(renderer, scene, camera, {
        bloomStrength = 0.32,
        bloomRadius = 0.35,
        bloomThreshold = 0.88
    } = {}) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.composer = new EffectComposer(renderer);
        this.composer.addPass(new RenderPass(scene, camera));

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(1, 1),
            bloomStrength,
            bloomRadius,
            bloomThreshold
        );
        this.composer.addPass(this.bloomPass);
        this.composer.addPass(new SMAAPass());
        this.setSize(window.innerWidth, window.innerHeight);
    }

    setSize(width, height) {
        this.composer.setSize(width, height);
    }

    render(deltaTime) {
        this.composer.render(deltaTime);
    }

    dispose() {
        this.composer.dispose();
        this.bloomPass.dispose();
    }
}
