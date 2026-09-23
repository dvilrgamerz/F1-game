import RAPIER from '@dimforge/rapier3d-compat';

export interface ChassisConfig {
  massKg: number;
  halfExtents: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
}

export class RapierWorld {
  readonly world: RAPIER.World;

  private constructor(world: RAPIER.World) {
    this.world = world;
    this.world.timestep = 1 / 60;
  }

  static async create() {
    await RAPIER.init();
    return new RapierWorld(new RAPIER.World({ x: 0, y: -9.81, z: 0 }));
  }

  createChassis(config: ChassisConfig) {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(config.position.x, config.position.y, config.position.z)
        .setLinearDamping(0.02)
        .setAngularDamping(0.05)
        .setCcdEnabled(true),
    );

    const collider = RAPIER.ColliderDesc.cuboid(
      config.halfExtents.x,
      config.halfExtents.y,
      config.halfExtents.z,
    )
      .setMass(config.massKg)
      .setFriction(0.25)
      .setRestitution(0.03);

    this.world.createCollider(collider, body);
    return body;
  }

  step() {
    this.world.step();
  }
}

export { RAPIER };
