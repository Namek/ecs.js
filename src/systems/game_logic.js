// @flow

import {
  BaseSystem, ComponentFamily, Entity, EntitySystem
} from "../ecs.js"
import {GamepadInputSystem, newShapeRect} from "./engine.js"
import EntityFactoryManager from "./entity_factory.js"
import {c, C, T} from '../enums/index.js'


export class GameStateSystem extends BaseSystem {
  factory: EntityFactoryManager


  init() {
    this.factory = this.getSystem(EntityFactoryManager)
    this.factory.spawnBlock()
  }
}

export class AvatarInputSystem extends BaseSystem {
  gamepadInput: GamepadInputSystem

  init() {
    this.gamepadInput = this.getSystem(GamepadInputSystem)
  }

  process(dt: number) {
    const avatar: Entity = this.tagManager.getEntity(T.Avatar)
    
    if (this.gamepadInput.isAnyGamepadConnected) {
      const [axisX, axisY, axisXMoves, axisYMoves, axisMoves] = this.gamepadInput.getLeftStick(0.2)

      // TODO interpret moves from gamepad and input
    }
    else {
      // TODO use keyboard, i guess!
    }
  }
}

export class AvatarLogicSystem extends EntitySystem {
  input: AvatarInputSystem

  constructor() {
    super(ComponentFamily.all(c.Avatar, c.Position))
  }
  init() {
    this.input = this.getSystem(AvatarInputSystem)
  }
  process(dt: number, e: Entity) {
    let avatar = e.get(c.Avatar)
    let pos = e.get(c.Position)
    const [axisX, axisY, axisXMoves, axisYMoves, axisMoves] = this.input.getLeftStick(0.2)

    if (axisMoves) {
      if (axisXMoves)
        pos.x += axisX * C.AVATAR_SPEED * dt

      if (axisYMoves)
        pos.y += axisY * C.AVATAR_SPEED * dt
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
    super(ComponentFamily.all(c.Block, c.Position, c.Shape))
  }

  init() {
    this.canvas = this.inject(C.Canvas)
  }

  process(dt: number, e: Entity) {
    let block = e.get(c.Block)
    let pos = e.get(c.Position)
    let shape = e.get(c.Shape)

    pos.y += block.speed * dt
    shape.rotation = (shape.rotation + 150 * dt) % 360

    if (pos.y > this.canvas.clientHeight) {
      e.destroy()
    }
  }
}
