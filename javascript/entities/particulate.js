class Particulate {
  constructor(startX, startY, radius, velDirection, velMagnitude, color, state) {

    this.radius = radius;
    this.radiusStarting = radius;

    this.position = {
      x: startX,
      y: startY
    }
    this.velocity = {
      magnitude: velMagnitude,
      startingMagnitude: velMagnitude,
      direction: velDirection,
      ACCELERATION: 0.07,
    }

    this.color = color;

    this.remove = false;

    this.state = state
  }

  update() {
    this.position.x += this.velocity.magnitude * Math.cos(this.velocity.direction);
    this.position.y += this.velocity.magnitude * Math.sin(this.velocity.direction);

    if (this.state == STATE_REFORMING) {
      this.velocity.magnitude += this.velocity.ACCELERATION;
      this.radius += 0.1;

      if (this.radius >= 3) {
        this.remove = true
      }
    } else
    {
      this.velocity.magnitude -= this.velocity.ACCELERATION;
      this.radius = this.velocity.magnitude/this.velocity.startingMagnitude * this.radiusStarting;
      if (this.velocity.magnitude <= 0) {
        this.remove = true
      }
    }
  }

  render(context) {
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(
      this.position.x,
      this.position.y,
      this.radius/2,
      0, 2 * Math.PI, false
    );
    context.fill();

    context.strokeStyle = this.color;
    context.beginPath();
    context.arc(
      this.position.x,
      this.position.y,
      this.radius,
      0, 2 * Math.PI, false
    );
    context.stroke();
  }
}
