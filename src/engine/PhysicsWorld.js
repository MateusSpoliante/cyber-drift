import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
    static async create({ gravity = { x: 0, y: -9.81, z: 0 }, fixedTimeStep = 1 / 120 } = {}) {
        await RAPIER.init();
        return new PhysicsWorld(gravity, fixedTimeStep);
    }

    constructor(gravity, fixedTimeStep) {
        this.RAPIER = RAPIER;
        this.fixedTimeStep = fixedTimeStep;
        this.world = new RAPIER.World(gravity);
        this.world.timestep = fixedTimeStep;
        this.world.numSolverIterations = 6;
        this.world.maxCcdSubsteps = 2;
        this.disposed = false;
    }

    createGround({ size = 2000, height = -1, friction = 1.2 } = {}) {
        const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, height, 0));
        const collider = RAPIER.ColliderDesc.cuboid(size * 0.5, 0.1, size * 0.5)
            .setFriction(friction)
            .setRestitution(0);
        this.world.createCollider(collider, body);
        return body;
    }

    step(dt = this.fixedTimeStep) {
        if (this.disposed) return;
        this.world.timestep = dt;
        this.world.step();
    }

    dispose() {
        if (this.disposed) return;
        this.world.free();
        this.disposed = true;
    }
}

export { RAPIER };
