var STATE_NONE = 1
var STATE_EXPLODED = 2
var STATE_REFORMING = 3
var STATE_PHASED = 4
var STATE_PERGATORY = 5
var STATE_FLEE = 6
var STATE_RAGE = 7

let movementStates = [STATE_NONE, STATE_PHASED, STATE_FLEE, STATE_RAGE]

class Wisp {
  constructor(startX, startY, size, color, context) {
    this.color = color;
    this.context = context;
    this.flow = { // simulate slither motion
      angle: 0,
      up: true,
      RATE: 3 * Math.PI / 180,
      TERMINAL: 30 * Math.PI / 180
    }
    this.particulate = [];
    this.position = {
      x: startX, y: startY,
      set: (x, y) => {
        this.position.x = x
        this.position.y = y
      }
    }
    this.size = size;
    this.state = STATE_NONE;
    this.tail = {
      joint: [], // [{perpLine: {cos: 0, sin: 0}, position: {x: 0: y: 0}}]
      lastLength: 0, // track length since last length check
      length: () => this.size * 2,
      reset: () => {
        this.tail.joint = []
        this.tail.lastLength = 0
        this.tail.sync()
      },
      sync: () => {
        let currentLen = this.tail.length()
        if (currentLen != this.tail.lastLength) {
          for (let i = 0; i < currentLen - this.tail.lastLength; i++) {
            let x = this.position.x
            let y = this.position.y
            if (this.tail.lastLength != 0) {
              x = this.tail.joint[this.tail.lastLength - 1].position.x
              y = this.tail.joint[this.tail.lastLength - 1].position.y
            }
            this.tail.joint.push({perpLine: {cos: 0, sin: 0}, position: {x: x, y: y}})
          }
          this.tail.lastLength = currentLen
        }
      }
    }
    this.waypoint = {
      x: startX, y: startY,
      xVector: 0, yVector: 0,
      distToTargetSqrd: 0,
      angleToTarget: 0,
      set: (x, y) => {
        this.waypoint.x = x
        this.waypoint.y = y
      }
    }
    this.velocity = {
      magnitude: 0,
      direction: 0,
      ACCELERATION: 0.02,
      TURN_RATE: 10 * Math.PI / 180,
      TERMINAL: 4
    }
  }

  update() {
    for (let p = 0; p < this.particulate.length; p++) {
      this.particulate[p].update()
      if (this.particulate[p].remove) {
        this.particulate.splice(p, 1)
        p--
        continue;
      }
    }
    if (this.particulate.length == 0 ) {
      if (this.state == STATE_EXPLODED) this.state = STATE_PERGATORY
      else if (this.state == STATE_REFORMING) this.state = STATE_NONE
    }

    if (!movementStates.includes(this.state)) return;

    this.waypoint.xVector = this.waypoint.x - this.position.x;
    this.waypoint.yVector = this.waypoint.y - this.position.y;
    this.waypoint.distToTargetSqrd = Math.pow(this.waypoint.x - this.position.x, 2) + Math.pow(this.waypoint.y - this.position.y, 2);
    // which direction wisp should turn to get to target fastest
    this.waypoint.angleToTarget = Math.atan2(this.waypoint.yVector, this.waypoint.xVector); // atan2 expensive?
    this.waypoint.angleToTarget = Wisp.normalizeAngle(this.waypoint.angleToTarget);
    const angleDifference = this.waypoint.angleToTarget - this.velocity.direction;
    // if difference is less than its ability to turn, then its close enough to go straight towards target
    if (Math.abs(angleDifference) > this.velocity.TURN_RATE) { // determining CW or CCW is less turning
      if ((angleDifference < Math.PI && angleDifference > 0) || (angleDifference < - Math.PI)) {
        this.velocity.direction += (this.velocity.TURN_RATE);
      } else {
        this.velocity.direction -= (this.velocity.TURN_RATE);
      }
      this.velocity.direction = Wisp.normalizeAngle(this.velocity.direction);
    } else { // heading in straight line.
      this.velocity.direction = this.waypoint.angleToTarget;
    }
    if (this.state != STATE_RAGE) {
      // calc stopping dist needed. need current vel in dir to target
      const velVecToTarget = Wisp.projection(
        Math.cos(this.velocity.direction) * this.velocity.magnitude, Math.sin(this.velocity.direction) * this.velocity.magnitude,
        this.waypoint.xVector, this.waypoint.yVector
      );
      const velToTarget = Math.sqrt(Math.pow(velVecToTarget[0],2) + Math.pow(velVecToTarget[1],2)); // sqrt
      // how fast Wisp can decelerate in target direction
      const decelVecToTarget = Wisp.projection(
        Math.cos(this.velocity.direction) * this.velocity.ACCELERATION, Math.sin(this.velocity.direction) * this.velocity.ACCELERATION,
        this.waypoint.xVector, this.waypoint.yVector
      );
      const decelToTarget = Math.sqrt(Math.pow(decelVecToTarget[0],2) + Math.pow(decelVecToTarget[1],2)); // sqrt
      // ... See Notebook for derivation... modified from D = 0.5 * (V^2 / A)
      let stoppingDistanceToTarget = (velToTarget / decelToTarget) * (0.5 * velToTarget + RENDER_HERTZ/1000) + decelToTarget / (2 * velToTarget * RENDER_HERTZ/1000);
      // starting from stop. V and A are used as denominators so avoid letting it calculate when these are zero
      if (velToTarget == 0 || decelToTarget == 0) {
        stoppingDistanceToTarget = 0; // guarantee apply acceleration as well as avoid NaN value.
      }
      const distToWaypointSqrd = Math.pow(this.waypoint.xVector, 2) + Math.pow(this.waypoint.yVector, 2);
      // Check if need to start slowing down or can speed up still...
      if (distToWaypointSqrd > Math.pow(stoppingDistanceToTarget, 2)) { // speed up
        this.velocity.magnitude += this.velocity.ACCELERATION;// * (1 + 1 * (this.state == STATE_PHASED));
        this.velocity.magnitude = Math.min(this.velocity.magnitude, this.velocity.TERMINAL);// * (1 + 2 * (this.state == STATE_PHASED)));
      } else { // speed down
        this.velocity.magnitude -= this.velocity.ACCELERATION;// * (1 + 1 * (this.state == STATE_PHASED));
        this.velocity.magnitude = Math.max(this.velocity.magnitude, 0);
      }
    } else {
      // Rage state. Never slow down
      this.velocity.magnitude += this.velocity.ACCELERATION
      this.velocity.magnitude = Math.min(this.velocity.magnitude, this.velocity.TERMINAL)
    }

    // Control slither movement.
    if (this.flow.up) {
      this.flow.angle += this.flow.RATE;
      if (this.flow.angle > this.flow.TERMINAL) {
        this.flow.up = false;
      }
    } else {
      this.flow.angle -= this.flow.RATE;
      if (this.flow.angle < -this.flow.TERMINAL) {
        this.flow.up = true;
      }
    }
    // Apply velocity
    this.position.x += this.velocity.magnitude * Math.cos(this.velocity.direction + this.flow.angle);
    this.position.y += this.velocity.magnitude * Math.sin(this.velocity.direction + this.flow.angle);

    // Record location and perpendicular rays for current tail joint
    this.tail.sync()
    let tailJoint = this.tail.joint.pop()
    let ang = this.velocity.direction + this.flow.angle - Math.PI/2
    tailJoint.perpLine = {cos: Math.cos(ang), sin: Math.sin(ang)}
    tailJoint.position = {x: this.position.x, y: this.position.y}
    this.tail.joint.unshift(tailJoint)
  }

  render() {
    if (movementStates.includes(this.state)) {
      let color = this.color
      if (this.state == STATE_RAGE) {
        color = "red"
      }

      if (this.state != STATE_PHASED) {
        // tail fill if not phased
        this.context.strokeStyle = color
        for (let i = 0; i < this.tail.length(); i++) {
          let joint = this.tail.joint[i]
          let spread = this.size * ((this.tail.length() - 1 - i) / this.tail.length())
          let perpX = spread * joint.perpLine.cos
          let perpY = spread * joint.perpLine.sin

          this.context.beginPath();
          this.context.moveTo(joint.position.x + perpX, joint.position.y + perpY);
          this.context.lineTo(joint.position.x - perpX, joint.position.y - perpY);
          this.context.stroke();
        }
      }

      // tail stroke render Side 1
      this.context.strokeStyle = color
      this.context.beginPath();
      for (let i = 0; i < this.tail.length() - 1; i++) {
        let joint = this.tail.joint[i]
        let spread = this.size * ((this.tail.length() - 1 - i) / this.tail.length())
        let perpX = spread * joint.perpLine.cos
        let perpY = spread * joint.perpLine.sin
        if (i == 0) {
          this.context.moveTo(joint.position.x + perpX, joint.position.y + perpY)
        } else {
          this.context.lineTo(this.tail.joint[i+1].position.x + perpX, this.tail.joint[i+1].position.y + perpY);
        }
      }
      this.context.stroke();
      // tail stroke render Side 2
      this.context.beginPath();
      for (let i = 0; i < this.tail.length() - 1; i++) {
        let joint = this.tail.joint[i]
        let spread = this.size * ((this.tail.length() - 1 - i) / this.tail.length())
        let perpX = spread * joint.perpLine.cos
        let perpY = spread * joint.perpLine.sin
        if (i == 0) {
          this.context.moveTo(joint.position.x - perpX, joint.position.y - perpY)
        } else {
          this.context.lineTo(this.tail.joint[i+1].position.x - perpX, this.tail.joint[i+1].position.y - perpY);
        }
      }
      this.context.stroke();

      // Render head
      this.context.fillStyle = __color_foreground
      this.context.beginPath()
      this.context.arc(this.position.x, this.position.y, this.size, 0, 2 * Math.PI, false)
      this.context.fill()

      if (this.state != STATE_PHASED) {
        this.context.fillStyle = color
        this.context.beginPath()
        this.context.arc(this.position.x, this.position.y, this.size * 0.75, 0, 2 * Math.PI, false)
        this.context.fill()
      }

      let strokeMod = 1
      if (this.velocity.magnitude < 1) strokeMod = 2
      let ang = this.velocity.direction + this.flow.angle - Math.PI/2
      this.context.strokeStyle = color
      this.context.beginPath()
      this.context.arc(this.position.x, this.position.y, this.size, ang, ang + Math.PI * strokeMod, false)
      this.context.stroke()
    }

    for (let p = 0; p < this.particulate.length; p++) {
      this.particulate[p].render(this.context)
    }
  }

  /**
   * Generates particles with initial given properties.
   * - state State state of the particulate
   * - count Number how many particulate
   * - choke Degrees the size of radians arc that particles may cover
   * - dir Radians the central angle of arc spread
   * - angleVarianceDegs Degrees angle degrees variance (+/-) from particle direction
   * - speedVariance Number speed variance (+/-) from particleDirection
   */
  generateParticulate(state, count, choke, dir, angleVarianceDegs, speedVariance) {
    const vel = this.velocity.magnitude // the initial magnitude of spread
    const x = this.position.x + this.velocity.magnitude * Math.cos(this.velocity.direction + this.flow.angle)
    const y = this.position.y + this.velocity.magnitude * Math.sin(this.velocity.direction + this.flow.angle)
    choke *= (Math.PI / 180) // max choke reached at max speed \/
    const pChoke = choke + (2 * Math.PI - choke) * (1 - Math.min(this.velocity.magnitude / 2, 1.0))
    const speedMinimum = 2 // Minimum speed for particle

    for (let i = 0; i < count; i++) {
      let pDir = pChoke * (i/(count-1)) - pChoke/2 + dir // equal spread across choke
      pDir += (Math.random() * angleVarianceDegs * 2 - angleVarianceDegs) / 180 * Math.PI; // apply variance
      let pVel = Math.max(vel, speedMinimum) + Math.random() * speedVariance * 2 - speedVariance
      let pSize = this.size
      this.particulate.push(new Particulate(x, y, pSize, pDir, pVel, this.color, state));
    }
  }
  /// Ghost effect on
  phaseOut() {
    this.state = STATE_PHASED;
    this.velocity.magnitude -= 1
    this.generateParticulate(STATE_PHASED, 26, 30, this.velocity.direction, 1, 2)
  }
  /// Ghost effect off
  phaseIn() {
    this.state = STATE_NONE;
    this.generateParticulate(STATE_NONE, 10, 70, this.velocity.direction - Math.PI, 2, 1.5)
    this.velocity.magnitude += 1.5
  }
  /// Particles all directions
  explode() {
    this.state = STATE_EXPLODED
    this.velocity.magnitude = 1
    this.generateParticulate(STATE_EXPLODED, 36, 360, 0, 1, 0.8)
  }
  // Rejoin particles from explode()
  reform() {
    this.state = STATE_REFORMING;
    this.tail.reset()

    for (let x = 0; x < 12; x++) {
      const randDir = x/12 * (2*Math.PI) - (Math.random()*21 - 10)/180*Math.PI;
      this.particulate.push(new Particulate(
        this.position.x + this.size * 5 * Math.cos(randDir),
        this.position.y + this.size * 5 * Math.sin(randDir),
        0,
        Math.PI + randDir,
        0,
        this.color,
        this.state)
      );
    }
  }
  static dotProduct(aX, aY, bX, bY) {
    return aX * bX + aY * bY;
  }
  // Project a onto b
  static projection(aX, aY, bX, bY) {
    let calc = Wisp.dotProduct(aX, aY, bX, bY) / (bX * bX + bY * bY);
    let xComponent = bX * calc;
    let yComponent = bY * calc;
    return [xComponent, yComponent];
  }
  static normalizeAngle(angle) {
    let newAngle = angle;
    while (newAngle < 0) {
      newAngle += 2 * Math.PI;
    }
    while (newAngle > 2 * Math.PI) {
       newAngle -= 2 * Math.PI;
     }
    return newAngle;
  }
}
