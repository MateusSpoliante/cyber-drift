import * as THREE from 'three';

export class EnvironmentBuilder {
    constructor(renderer) {
        this.renderer = renderer;
        this.pmrem = new THREE.PMREMGenerator(renderer);
        this.pmrem.compileEquirectangularShader();
        this.environmentTarget = null;
        this.sourceTexture = null;
    }

    create() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const context = canvas.getContext('2d');

        const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#263b59');
        gradient.addColorStop(0.38, '#71839a');
        gradient.addColorStop(0.62, '#f2a36e');
        gradient.addColorStop(1, '#422b3c');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        const sunGlow = context.createRadialGradient(760, 315, 8, 760, 315, 170);
        sunGlow.addColorStop(0, 'rgba(255, 226, 174, 0.95)');
        sunGlow.addColorStop(0.22, 'rgba(255, 179, 112, 0.38)');
        sunGlow.addColorStop(1, 'rgba(255, 150, 90, 0)');
        context.fillStyle = sunGlow;
        context.fillRect(560, 115, 400, 400);

        this.sourceTexture = new THREE.CanvasTexture(canvas);
        this.sourceTexture.mapping = THREE.EquirectangularReflectionMapping;
        this.sourceTexture.colorSpace = THREE.SRGBColorSpace;
        this.environmentTarget = this.pmrem.fromEquirectangular(this.sourceTexture);
        return this.environmentTarget.texture;
    }

    dispose() {
        this.environmentTarget?.dispose();
        this.sourceTexture?.dispose();
        this.pmrem.dispose();
    }
}
