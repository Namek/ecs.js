// @flow

import {
  BaseSystem, ComponentFamily, Entity, EntitySystem
} from "../ecs.js"
import {InputSystem} from "./engine.js"
import c from '../components.js'
import C from '../constants.js'

export class AvatarLogicSystem extends EntitySystem {
  input: InputSystem

  constructor() {
    super(ComponentFamily.all(c.Avatar))
  }
  init() {
    this.input = this.getSystem(InputSystem)
  }
  process(dt: number, e: Entity) {
    let avatar = e.get(c.Avatar)
    let spatial = e.get(c.Spatial)
    let [axisX, axisY, axisXMoves, axisYMoves, axisMoves] = this.input.getLeftStick(0.2)

    if (axisMoves) {
      if (axisXMoves)
        spatial.x += axisX * C.AVATAR_SPEED * dt

      if (axisYMoves)
        spatial.y += axisY * C.AVATAR_SPEED * dt

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
}
