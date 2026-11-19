import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class EnvironmentBuilder {
    constructor(renderer) {
        this.renderer = renderer;
        this.pmrem = new THREE.PMREMGenerator(renderer);
        this.pmrem.compileEquirectangularShader();
        this.environmentTarget = null;
    }

    create({ background = 0xffb36b } = {}) {
        const environmentScene = new RoomEnvironment();
        environmentScene.background = new THREE.Color(background);
        this.environmentTarget = this.pmrem.fromScene(environmentScene, 0.04);
        environmentScene.dispose?.();
        return this.environmentTarget.texture;
    }

    dispose() {
        this.environmentTarget?.dispose();
        this.pmrem.dispose();
    }
}
