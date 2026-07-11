// src/engine/entityPool.ts

import { AIEntity, ParticleEvent, EntityType, AIState } from './types';

export class EntityPool {
  private aiEntities: AIEntity[] = [];
  private particles: ParticleEvent[] = [];
  private warningLogged = false;

  acquireAIEntity(): AIEntity {
    if (this.aiEntities.length > 0) {
      const entity = this.aiEntities.pop()!;
      entity.isAlive = true;
      return entity;
    }
    
    if (!this.warningLogged && this.aiEntities.length === 0) {
      // PRD 6.4: 对象池耗尽时动态扩容并输出一次性警告日志
      console.warn("AIEntity Pool exhausted, expanding capacity.");
      this.warningLogged = true;
    }

    return {
      id: "",
      type: EntityType.Prey,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      facing: 0,
      mass: 0,
      radius: 0,
      isAlive: true,
      poolIndex: -1,
      aiState: AIState.Idle,
      perceptionRadius: 0,
      baseSpeed: 0,
      wanderTarget: { x: 0, y: 0 },
      targetEntityId: null,
      speciesIndex: 0,
      itemType: undefined,
      frozenUntil: null,
    };
  }

  releaseAIEntity(entity: AIEntity): void {
    entity.isAlive = false;
    entity.id = "";
    entity.targetEntityId = null;
    entity.itemType = undefined;
    entity.frozenUntil = null;
    this.aiEntities.push(entity);
  }

  acquireParticle(): ParticleEvent {
    if (this.particles.length > 0) {
      return this.particles.pop()!;
    }
    return {
      id: "",
      kind: "bubble_trail",
      position: { x: 0, y: 0 },
      createdAt: 0,
      ttlMs: 0,
    };
  }

  releaseParticle(particle: ParticleEvent): void {
    this.particles.push(particle);
  }
}
