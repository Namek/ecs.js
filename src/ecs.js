// @flow

export class World {
  allEntities: Array<Entity>
  lastEntityId: number

  // systemName -> entities[]
  entitiesBySystem: { [systemName: string]: Array<Entity> }

  // entityId -> {componentTypes: [int], components:{cmpTypeId -> data}}
  components: { [entityId: number]: {
    componentTypes: Array<number>,
    components: { [cmpTypeId: number]: Object }
  } }

  systems: Array<BaseSystem>
  systemsByName: Object
  tagManager: TagManager

  onNextFrameActions: Array<() => void>
  entitiesToBeUpdated: Array<any>

  injections: { [key: string]: any }


  constructor(systemsTypes: Array<Class<BaseSystem>>) {
    this.allEntities = []
    this.lastEntityId = 0
    this.entitiesBySystem = {}
    this.components = {}
    this.systems = []
    this.systemsByName = {}
    this.onNextFrameActions = []
    this.entitiesToBeUpdated = []
    this.injections = {}

    const makeSystem = <T>(type: Class<BaseSystem>): T => {
      let system = new type()
      let name = type.name
      system.world = this
      this.systems.push(system)
      this.systemsByName[name] = system

      if (system instanceof EntitySystem) {
        this.entitiesBySystem[name] = []
      }

      return (system: any)
    }

    this.tagManager = makeSystem(TagManager)
    for (let type of systemsTypes) {
      let system = makeSystem(type)
      system.tagManager = this.tagManager
    }
  }

  init(): World {
    for (let system of this.systems) {
      system.init()
    }
    return this
  }

  register(key: string, obj: any): World {
    this.injections[key] = obj
    return this
  }

  process(deltaTime: number) {
    for (let system of this.systems) {
      system.begin()
      system._process(deltaTime)
      system.end()
    }

    for (let action of this.onNextFrameActions) {
      action()
    }
    this.onNextFrameActions.length = 0

    for (let i = 0, n = this.entitiesToBeUpdated.length; i < n; i += 2) {
      this._updateEntitySystemBelongingness(this.entitiesToBeUpdated[i], this.entitiesToBeUpdated[i+1])
    }
    this.entitiesToBeUpdated.length = 0
  }

  getSystem<T: BaseSystem>(typeOrName: Class<T> | string): T {
    let name = _toSystemName(typeOrName)
    let system = this.systemsByName[name]
    if (!system) {
      throw new Error(`System ${name} not found!`)
    }
    return system
  }

  getEntitiesForSystem(systemName: string) {
    return this.entitiesBySystem[systemName]
  }

  getEntitiesByTag(tag: string) {
    return this.tagManager.getEntities(tag)
  }

  newEntity() {
    let entity = new Entity(this, ++this.lastEntityId)
    this.allEntities.push(entity)
    return entity
  }

  deleteEntity(entityIdOrEntity: number | Entity, onNextFrame: ?boolean) {
    let id: number = entityIdOrEntity instanceof Entity
      ? entityIdOrEntity.id : entityIdOrEntity

    let entity: Entity = entityIdOrEntity instanceof Entity
      ? entityIdOrEntity : this.getEntity(entityIdOrEntity)

    if (onNextFrame) {
      this.onNextFrameActions.push(
        this.deleteEntity.bind(this, id, false)
      )
    }
    else {
      // remove all components for this entity
      delete this.components[id]

      // clear the cache for systems
      for (let systemName in this.entitiesBySystem) {
        if (!this.entitiesBySystem.hasOwnProperty(systemName)) {
          continue
        }

        let systemEntities = this.entitiesBySystem[systemName]
        let entityIndex = _findEntityIndex(id, systemEntities)

        if (entityIndex >= 0) {
          let entity = systemEntities.splice(entityIndex, 1)[0]

          let system = this.systemsByName[systemName]
          system.onEntityRemoved(entity)
        }
      }
    }
  }

  getEntity(id: number): Entity {
    let idx = _findEntityIndex(id, this.allEntities)

    if (idx < 0) {
      throw new Error(`Entity ${id} not found!`)
    }

    return this.allEntities[idx]
  }

  getComponent(cmpTypeId: number, entityId: number, dontThrowErrorComponentNotFound: ?boolean) {
    let entityComponents = this.components[entityId]
    if (!entityComponents) {
      throw new Error(`Entity ${entityId} was not found!`)
    }

    let component = entityComponents.components[cmpTypeId]
    if (!dontThrowErrorComponentNotFound && !component) {
      throw new Error(`Component ${cmpTypeId} not found for entity ${entityId}!`)
    }
    return component
  }

  setComponent(cmpTypeId: number, entityId: number, data: Object, onNextFrame: ?boolean) {
    if (onNextFrame) {
      this.onNextFrameActions.push(
        this.setComponent.bind(this, cmpTypeId, entityId, data)
      )
    }
    else {
      let cmps = this.components[entityId]
      if (!cmps) {
        cmps = this.components[entityId] = {
          componentTypes: [],
          components: {}
        }
      }
      if (cmps.componentTypes.indexOf(cmpTypeId) < 0) {
        cmps.componentTypes.push(cmpTypeId)
      }
      cmps.components[cmpTypeId] = data

      this.entitiesToBeUpdated.push(entityId, cmps.componentTypes)
    }
  }

  deleteComponent(cmpTypeId: number, entityId: number, onNextFrame: ?boolean) {
    if (onNextFrame) {
      this.onNextFrameActions.push(
        this.deleteComponent.bind(this, entityId, cmpTypeId)
      )
    }
    else {
      const cmps = this.components[entityId]
      if (cmps) {
        delete cmps.components[cmpTypeId]
        let idx = cmps.componentTypes.indexOf(cmpTypeId)
        cmps.componentTypes.splice(idx, 1)

        this._updateEntitySystemBelongingness(entityId, cmps.componentTypes)
      }
    }
  }

  hasComponent(cmpTypeId: number, entityId: number) {
    return !!this.getComponent(cmpTypeId, entityId, true)
  }

  _updateEntitySystemBelongingness(entityId: number, componentTypes: Array<number>) {
    for (let system of this.systems) {
      if (!(system instanceof EntitySystem)) {
        continue
      }
      let systemEntities = this.entitiesBySystem[system.constructor.name]
      let idx = _findEntityIndex(entityId, systemEntities)
      let belongsToSystem = idx >= 0
      let canBeAdopted = system.componentFamily.accepts(componentTypes)

      if (canBeAdopted && !belongsToSystem) {
        let entity = this.getEntity(entityId)

        systemEntities.push(entity)
        system.onEntityAdded(entity)
      }
      else if (!canBeAdopted && belongsToSystem) {
        if (idx < 0) {
          throw new Error(`Entity ${entityId} not found when looked for the system ${system.constructor.name}`)
        }

        let entity = systemEntities.splice(idx, 1)[0]
        system.onEntityRemoved(entity)
      }
    }
  }
}


export class Entity {
  world: World
  id: number

  constructor(world: World, id: number) {
    this.world = world
    this.id = id
  }

  get(cmpTypeId: number, dontThrowErrorOnLack: ?boolean) {
    return this.world.getComponent(cmpTypeId, this.id, dontThrowErrorOnLack)
  }

  get$(cmpTypeId: number) {
    return this.get(cmpTypeId, true)
  }

  set(cmpTypeId: number, data: Object) {
    this.world.setComponent(cmpTypeId, this.id, data)
    return this
  }

  del(cmpTypeId: number, onNextFrame: ?boolean) {
    this.world.deleteComponent(cmpTypeId, this.id, onNextFrame)
    return this
  }

  has(cmpTypeId: number) {
    return this.world.hasComponent(cmpTypeId, this.id)
  }

  toggle(cmpTypeId: number) {
    const has = this.has(cmpTypeId)

    if (has) {
      this.del(cmpTypeId)
    }
    else {
      this.set(cmpTypeId, { })
    }

    return !has
  }

  destroy() {
    this.world.deleteEntity(this.id)
  }

  tag(tag: string): Entity {
    this.world.tagManager.tag(this, tag)
    return this
  }

  untag(tag: string) {
    this.world.tagManager.untag(this, tag)
  }

  hasTag(tag: string): boolean {
    return this.world.tagManager.hasTag(this, tag)
  }

  toggleTag(tag: string): boolean {
    return this.world.tagManager.toggleTag(this, tag)
  }
}

export function ComponentFamily() {
  function indicesToArray(indices) {
    const max = Math.max.apply(null, indices)
    const n = max + 1
    let arr = Array(n).fill(false)
    for (let idx of indices) {
      arr[idx] = true
    }
    return arr
  }

  this.all = (...indices) => {
    this._allCache = indices
    return this
  }
  this.not = (...indices) => {
    this._notCache = indicesToArray(indices)
    return this
  }
  this.accepts = cmpTypesIds => {
    if (this._allCache) {
      for (let id of this._allCache) {
        if (cmpTypesIds.indexOf(id) < 0)
          return false
      }
    }

    if (this._notCache) {
      for (let id of cmpTypesIds) {
        if (this._notCache[id] === true) {
          return false
        }
      }
    }

    return true
  }
}
ComponentFamily.all = (...indices) => {
  return new ComponentFamily().all(...indices)
}
ComponentFamily.not = (...indices) => {
  return new ComponentFamily().not(...indices)
}


export class BaseSystem {
  world: World
  tagManager: TagManager

  getSystem<T : BaseSystem>(systemNameOrType : Class<T> | string): T {
    return this.world.getSystem(systemNameOrType)
  }

  init() { }
  begin() { }
  end() { }

  inject(key: string): any {
    let obj = this.world.injections[key]

    if (!obj) {
      throw new Error(`inject: '${key}' not found!`)
    }

    return obj
  }

  onEntityAdded(e: Entity) { }
  onEntityRemoved(e: Entity) { }

  _process(deltaTime: number) {
    this.process(deltaTime)
  }
  process(deltaTime: number, ...optionalArgs: any) { }
}

export class EntitySystem extends BaseSystem {
  componentFamily: ComponentFamily

  constructor(componentFamily: ComponentFamily) {
    super()
    if (componentFamily.constructor !== ComponentFamily) {
      throw new Error(`ComponentFamily object expected for system: ${this.constructor.name}.`)
    }
    this.componentFamily = componentFamily
  }

  _process(deltaTime: number) {
    let systemName = this.constructor.name
    let entities = this.world.getEntitiesForSystem(systemName)
    this.processEntities(deltaTime, entities)
  }

  processEntities(deltaTime: number, entities: Array<Entity>) {
    for (let n = entities.length, i = n-1; i >= 0; i--) {
      this.process(deltaTime, entities[i])
    }
  }

  process(deltaTime: number, entity: Entity) { }
}

class TagManager extends EntitySystem {
  // entityId -> tags[]
  tagsByEntity: { [entityId: number]: Array<string> }

  // tag -> entities[]
  entitiesByTag: { [tag: string]: Array<Entity> }

  // tag -> entityId -> true
  entityMembershipByTag: { [tag: string]: { [entityId: number]: boolean } }


  constructor() {
    super(ComponentFamily.all())
    this.tagsByEntity = {}
    this.entitiesByTag = {}
    this.entityMembershipByTag = {}
  }

  onEntityRemoved(e: Entity) {
    const id = e.id

    if (this.tagsByEntity[id]) {
      delete this.tagsByEntity[id]

      for (let tag in this.entitiesByTag) {
        if (this.entitiesByTag.hasOwnProperty(tag)) {
          const tagEntities = this.entitiesByTag[tag]
          const idx = _findEntityIndex(id, tagEntities)

          if (idx >= 0) {
            tagEntities.splice(idx, 1)
            delete this.entityMembershipByTag[tag][id]
          }
        }
      }
    }
  }

  tag(e: Entity|number, tag: string) {
    const id = e instanceof Entity ? e.id : e
    const entity = e instanceof Entity ? e : this.world.getEntity(id)

    let entityTags = this.tagsByEntity[id]
    if (!entityTags) {
      entityTags = this.tagsByEntity[id] = [tag]
    }
    else {
      if (entityTags.indexOf(tag) < 0) {
        entityTags.push(tag)
      }
    }

    let tagEntities = this.entitiesByTag[tag]
    if (!tagEntities) {
      tagEntities = this.entitiesByTag[tag] = []
    }
    if (tagEntities.indexOf(entity) < 0) {
      tagEntities.push(entity)
    }

    let entities = this.entityMembershipByTag[tag]
    if (!entities) {
      entities = this.entityMembershipByTag[tag] = {}
    }
    entities[id] = true
  }

  untag(e: Entity|number, tag: string) {
    const id = e instanceof Entity ? e.id : e
    const entity = e instanceof Entity ? e : this.world.getEntity(id)

    let entityTags = this.tagsByEntity[id]
    if (entityTags) {
      let idx = entityTags.indexOf(tag)
      if (idx >= 0) {
        entityTags.splice(idx, 1)
      }
    }

    let tagEntities = this.entitiesByTag[tag]
    if (tagEntities) {
      let idx = tagEntities.indexOf(entity)
      if (idx >= 0) {
        tagEntities.splice(idx, 1)
      }
    }

    let entities = this.entityMembershipByTag[tag]
    if (entities) {
      delete entities[id]
    }
  }

  hasTag(e: Entity|number, tag: string): boolean {
    let id = e instanceof Entity ? e.id : e
    let entityTags = this.tagsByEntity[id]

    return entityTags.indexOf(tag) >= 0
  }

  toggleTag(e: Entity|number, tag: string): boolean {
    const entity = e instanceof Entity ? e : this.world.getEntity(e)
    const hadTag = this.hasTag(entity, tag)
    if (hadTag) {
      this.untag(entity, tag)
    }
    else {
      this.tag(entity, tag)
    }

    return !hadTag
  }

  getEntities(tag: string): Array<Entity> {
    return this.entitiesByTag[tag]
  }
}

function _findEntityIndex(id: number, collection: Array<Entity>): number {
  let min = 0
  let max = collection.length - 1

  while (min <= max) {
    let center = Math.floor((min + max)/2)
    let entity = collection[center]

    if (entity.id < id) {
      min = center + 1
    }
    else if (entity.id > id) {
      max = center - 1
    }
    else {
      return center
    }
  }

  return -1
}

function _toSystemName(typeOrName: any): string {
  if (typeOrName.constructor.prototype === String)
    return typeOrName
  else
    return typeOrName.name
}