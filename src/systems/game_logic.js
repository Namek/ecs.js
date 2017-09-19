// @flow

import {
  BaseSystem, ComponentFamily, Entity, EntitySystem
} from "../ecs.js"
import {InputSystem} from "./engine.js"
import c from '../components.js'
import C from '../constants.js'


export class GameStateSystem extends BaseSystem {
  factory: EntityFactoryManager


  init() {
    this.factory = this.getSystem(EntityFactoryManager)
    this.factory.spawnBlock()
  }
}

export class AvatarLogicSystem extends EntitySystem {
  input: InputSystem

  constructor() {
    super(ComponentFamily.all(c.Avatar, c.Position))
  }
  init() {
    this.input = this.getSystem(InputSystem)
  }
  process(dt: number, e: Entity) {
    let avatar = e.get(c.Avatar)
    let spatial = e.get(c.Position)
    let [axisX, axisY, axisXMoves, axisYMoves, axisMoves] = this.input.getLeftStick(0.2)

    if (axisMoves) {
      if (axisXMoves)
        spatial.x += axisX * C.AVATAR_SPEED * dt

      if (axisYMoves)
        spatial.y += axisY * C.AVATAR_SPEED * dt
    }

    if (this.input.wasButtonJustPressed('A') && !avatar.doesSomething) {
      avatar.doesSomething = true
      e.toggle(c.Invisible)
    }
    else if (this.input.wasButtonJustReleased('A') && avatar.doesSomething) {
      avatar.doesSomething = false
      e.toggle(c.Invisible)
    }
  }
}

export class BlockLogicSystem extends EntitySystem {
  canvas: any

  constructor() {
    super(ComponentFamily.all(c.Block, c.Position))
  }

  init() {
    this.canvas = this.inject(C.Canvas)
  }

  process(dt: number, e: Entity) {
    let block = e.get(c.Block)
    let pos = e.get(c.Position)

    pos.y += block.speed * dt

    if (pos.y > this.canvas.height) {
      e.destroy()
    }
  }
}

export class EntityFactoryManager extends BaseSystem {
  spawnPoints: Array<number>
  lastSpawnIndex: number

  constructor() {
    super()
    this.spawnPoints = [0.4, 0.2, 0.7, 0.1, 0.6]
    this.lastSpawnIndex = -1
  }

  spawnBlock() {
    this.lastSpawnIndex = (this.lastSpawnIndex + 1) % this.spawnPoints.length
    let x = this.spawnPoints[this.lastSpawnIndex]

    this.world.newEntity()
      .set(c.Block, {speed: 200})
      .set(c.Position, {x, y: 0})
  }
}
