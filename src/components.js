// @flow

let counter = 0
function c() {
  return counter++
}

export default {
  //
  // Engine Component Types
  //


  /** Shape
   *
   *  - type: 'line' | 'rect'
   *
   *  @if type='line'
   *  @optional cSpatial
   *  @optional cColor
   *  - x0
   *  - y0
   *  - x1
   *  - y1
   *  @endif
   *
   *  @if type == 'rect'
   *  @needs cSpatial
   *  @optional cColor
   *  - width
   *  - height
   *  - rotation
   *  @endif
   *
   *  @if type == 'circle
   *  @needs cSpatial
   *  @optional cColor
   *  - radius
   *  @endif
   */
  Shape: c(),

  /** Color
   *  - fill: string
   *  - stroke: string
   */
  Color: c(),

  /** Position
   *  - x
   *  - y
   */
  Position: c(),

  /** Velocity
   *  - x
   *  - y
   */
  Velocity: c(),

  /** Invisible
   * @tag
   */
  Invisible: c(),


  //
  // Game Logic Component Types
  //

  /** Avatar
   * - doesSomething: bool
   */
  Avatar: c()


, Block: c()
}
