# What is ECS?

You could read my article about it - [Why ECS matter?](https://www.namekdev.net/2017/03/why-entity-component-systems-matter/)

# Features

* ComponentFamily `.all` and `.not`
* register custom things (like Context2D) to access it across all systems (using `BaseSystem.inject()`)
* entity add/remove events for systems (`onEntityAdded(entity)`, `onEntityRemoved(entity)`)
* tagging (`TagManager`)

Tech: ES6, Flowtype

# API

* `World`
  * `process(deltaTime)` - the method you have to call in game loop
  * `register(objName, obj)` - save any object for later (accessible for Systems)
  * `getSystem<T: BaseSystem>(typeOrName: Class<T> | string): T`
  * `getEntitiesForSystem(systemName: string)`
  * `getEntitiesByTag(tag: string)` - uses `TagManager.getEntities(tag)`
  * `newEntity(): Entity`
  * `deleteEntity(entityIdOrEntity: number | Entity, onNextFrame: ?boolean)`
  * `getEntity(id: number)` - will throw Error if not found
  * `setComponent()`, `getComponent()`, `hasComponent()`, `deleteComponent()` - also used by `Entity` helpers
  * `tagManager` - reference to `TagManager`
* `Entity` - just an `id` with some helpers calling `World` methods. Create using `World.newEntity()`.
  * `destroy()` - remove entity from world with it's all components
  * `get(cmpTypeId, dontThrowErrorOnLack = false)`
  * `get$(cmpTypeId)` - equivalent of `get(cmpTypeId, true)`
  * `set(cmpTypeId, componentData)`
  * `del(cmpTypeId)` - remove component
  * `has(cmpTypeId): boolean`
  * `toggle(cmpTypeId)` - sets or remove a component - if setting then with empty object (`{}`)
  * `tag(tag: string)` - set a tag
  * `untag(tag: string)` - remove a tag
  * `hasTag(tag: string): boolean`
  * `toggleTag(tag: string): boolean` - toggles a tag, then returns equivalent of `hasTag(tag)`
* `BaseSystem`
  * just a basic loop that takes `deltaTime` in `process(dt)` and no entities
  * `inject(objName)` - gets an object registered into `World`
  * `tagManager` - a reference for convenience
* `EntitySystem` (extends `BaseSystem`)
  * takes `ComponentFamily` into constructor
  * `process(dt, entities)`
* `ComponentFamily` - define which entites will fall into system based on component acceptance list
  * `all(...componentTypeIds)` - entity has to contain all defined components
  * `not(...componentTypeIds)` - entity can't have any of given component type
* `TagManager` (automatically added to every `World` instance)
  * `tag(entityOrId, tag: string): Entity`
  * `untag(entityOrId)`
  * `hasTag(entityOrId): boolean`
  * `toggleTag(entityOrId): boolean` - toggles a tag, then returns equivalent of `hasTag(tag)`
  * `getEntities(tag: string): Array<Entity>` - get all entities having the tag

# Example usage

First, let's import all the things:

```js
import {
  BaseSystem, ComponentFamily, Entity, EntitySystem, World
} from "./ecs.js";
```

Now, define some **component types**:

```js
let counter = 0
function i() {
  return counter++
}

const c = {
    Shape: i()
,   Color: i()
,   Position: i()
,   Velocity: i()
,   Invisible: i()
}

```

Now some **entity systems**:
```js
export class EntityFactoryManager extends BaseSystem {
    // TODO: put some helper methods for entity creation, like createFireball()
}

export class ShapeRenderSystem extends EntitySystem {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D

    constructor() {
        super(
            // all entities having Shape component but not having Invisible component
            ComponentFamily
                .all(c.Shape)
                .not(c.Invisible)
        )
    }

    init() {
        this.canvas = this.inject(Constants.Canvas)
        this.ctx = this.inject(Constants.Context2D)
    }

    // called 
    begin() {
        this.ctx.fillStyle = 'steelblue'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    process(dt: number, e: Entity) {
        const ctx = this.ctx

        // TODO render those entities
    }
}

export class AvatarLogicSystem extends EntitySystem {
    input: InputSystem

    constructor() {
        // the avatar has to contain both Avatar and Position components 
        super(ComponentFamily.all(c.Avatar, c.Position))
    }
    init() {
        this.input = this.getSystem(InputSystem)
    }

    process(dt: number, e: Entity) {
        let avatar = e.get(c.Avatar)
        let pos = e.get(c.Position)

        // TODO logic for the player
    }
}
```

Finally, put it all together and actually run it:

```js
const canvas: any = document.getElementById('canvas')
const ctx: any = canvas.getContext('2d')

// initialize the ECS World with entity systems
let world = new World([
    EntityFactoryManager

    // logic
,   GameStateSystem
,   InputSystem
,   AvatarLogicSystem

    // render
,   ShapeRenderSystem
])
  .register(Constants.Canvas, canvas)
  .register(Constants.Context2D, ctx)
  .init() //it's very important to call this!

// "player" entity
world.newEntity()
  .set(c.Avatar, { doesSomething: false })
  .set(c.Shape, newShapeCircle(20))
  .set(c.Color, {fill: 'blue'})
  .set(c.Position, {x: 80, y: 200})


// launch the game loop
{
    let prevTime = Date.now()

    function processWorld() {
        let curTime = Date.now()
        let deltaTime = (curTime - prevTime)/1000
        prevTime = curTime
        world.process(deltaTime)
        requestAnimationFrame(processWorld)
    }
    processWorld()
}
```

# Dev

1. `npm run watch`
2. `http-server` in directory where `index.html` is
3. open [localhost:8080](http://localhost:8080)

