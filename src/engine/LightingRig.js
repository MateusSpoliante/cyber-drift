import * as THREE from 'three';

export class LightingRig {
    constructor(scene, renderer, {
        shadowMapSize = 2048,
        sunColor = 0xffc28a,
        sunIntensity = 3.1
    } = {}) {
        this.scene = scene;
        this.renderer = renderer;

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.12;

        this.hemisphere = new THREE.HemisphereLight(0xffe5c5, 0x293747, 1.15);
        scene.add(this.hemisphere);

        this.sun = new THREE.DirectionalLight(sunColor, sunIntensity);
        this.sun.position.set(-90, 120, -55);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
        this.sun.shadow.camera.left = -180;
        this.sun.shadow.camera.right = 180;
        this.sun.shadow.camera.top = 180;
        this.sun.shadow.camera.bottom = -180;
        this.sun.shadow.camera.near = 1;
        this.sun.shadow.camera.far = 420;
        this.sun.shadow.bias = -0.00012;
        this.sun.shadow.normalBias = 0.025;
        this.sun.target.position.set(0, 0, 0);
        scene.add(this.sun, this.sun.target);

        scene.background = new THREE.Color(0xf0a36d);
        scene.fog = new THREE.Fog(0xe6a078, 170, 1100);
    }

    follow(target) {
        if (!target) return;
        this.sun.target.position.copy(target.position);
        this.sun.position.copy(target.position).add(new THREE.Vector3(-90, 120, -55));
        this.sun.target.updateMatrixWorld();
    }
}
