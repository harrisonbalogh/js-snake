
import EntityObject from './entity.js'
import * as Entity from './entity.js'

/**
 * Test visual.
 */
export default class BgBox extends EntityObject {
  constructor(x, y, size, color) {
    super(x, y, Entity.COLLIDER_FILTER.NONE)

    this.color = color
    this.size = size
  }

  update() {
    super.update()
  }

  render(context) {
    super.render(context)

    context.fillStyle = this.color
    context.beginPath()
    context.rect(this.position.x - this.size / 2, this.position.y - this.size / 2, this.size, this.size)
    context.fill()
  }
}
