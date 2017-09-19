// @flow

import {
  BaseSystem, ComponentFamily, Entity, EntitySystem, World
} from "./ecs.js";
import {
  InputSystem, ShapeRenderSystem, newShapeRect, newShapeCircle
} from "./systems/engine.js"
import {
  AvatarLogicSystem
} from "./systems/game_logic.js"

import c from './components.js'
import C from './constants.js'



let world = new World([
  InputSystem,
  AvatarLogicSystem,
  ShapeRenderSystem
])
world.newEntity()
  .set(c.Avatar, { doesSomething: false })
  .set(c.Shape, newShapeCircle(20))
  .set(c.Color, {fill: 'blue'})
  .set(c.Spatial, {x: 80, y: 200})

function processWorld() {
  world.process(0.016)
  requestAnimationFrame(() => processWorld())
}

window.addEventListener("gamepadconnected", function (e) {
  let gamepad = window.navigator.getGamepads()[e.gamepad.index];

  console.log(
    "Gamepad connected at index %d: %s. %d buttons, %d axes.",
    gamepad.index, gamepad.id,
    gamepad.buttons.length, gamepad.axes.length
  );

  world.getSystem(InputSystem).gamepad = gamepad

  processWorld()
})
