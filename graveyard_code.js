// Arrived at destination
if (this.waypoint.distToTargetSqrd) {
  // generate new destination
  if (gameMode == GAME_MODE.ROAM || gameMode == GAME_MODE.NONE) {
  	if (goop.waypoint.distToTargetSqrd < 5 && goop.state == Entity.STATE.NONE) { // if arrived
  		goop.waypoint.x = view.x + Math.floor(Math.random() * view.width)
  		goop.waypoint.y = view.y + Math.floor(Math.random() * view.height)
  	}
  } else
  if (gameMode == GAME_MODE.CHASE || gameMode == GAME_MODE.HORDE) {
  	if (player.state == Entity.STATE.NONE) {
  		goop.waypoint.x = player.position.x
  		goop.waypoint.y = player.position.y
  	}
  }
}




// Color based on size
if (upgrades.vision && gameMode != GAME_MODE.NONE && player.state == Entity.STATE.NONE && goop.state != Entity.STATE.RAGE) {
	if (goop.size < player.size) {
		goop.color = setRgbaAlpha(goop.color, 0.2)
	} else
	if (goop.size == player.size) {
		goop.color = setRgbaAlpha(goop.color, 0.5)
	} else {
		goop.color = setRgbaAlpha(goop.color, 1)
	}
}




// State updater based on particulates
if (this.particulate.length == 0 ) {
  if (this.state == Entity.STATE.EXPLODED) this.state = Entity.STATE.PERGATORY
  else if (this.state == Entity.STATE.REFORMING) this.state = Entity.STATE.NONE
}




// turn limiter
let MAX_TURN_RATE = 60
this.maxTurnRate = Math.min(MAX_TURN_RATE, 180) / 180 * Math.PI
let turnAmount = boundAngle(this.acceleration.angle() - this.velocity.angle())
if (turnAmount < Math.PI) {
  this.velocity.angle(boundAngle(this.velocity.angle() + Math.min(turnAmount, this.maxTurnRate)))
} else {
  this.velocity.angle(boundAngle(this.velocity.angle() - Math.min(2*Math.PI - turnAmount, this.maxTurnRate)))
}




// Inserts goop into collection based on size
function insertSortedGoop(newGoop) {
  let insertedGoop = false
  for (let w = 0; w < goops.length; w++) {
    if (newGoop.size < goops[w].size) {
      goops.splice(w, 0, newGoop)
      insertedGoop = true
      break;
    }
  }
  if (!insertedGoop) {
    goops.push(newGoop)
  }
}




// Mouse control
if (input.mouse.down) {
  player.waypoint.set(input.mouse.x, input.mouse.y)
}
if (input.mouse.buttons['2'] !== undefined) {
  if (input.mouse.buttons['2'] === true) {
    player.waypoint.set(undefined, undefined)
  }
}


// Side Drawer
{/* <div class="side-drawer" id="side-drawer">
<p class="drawer-title">World Settings</p>

<table>
  <col width="100">
  <col width="40">
  <tr>
    <td class="label"><p>Max Goops</p></td>
    <td><input class="number" type="text" id="input-max-goops" placeholder="20"></td>
  </tr>
  <tr>
    <td><p>Spawn Rate</p></td>
    <td><input class="number" type="text" id="input-spawn-rate" placeholder="1"></td>
  </tr>
  <tr>
    <td><p>Max Speed</p></td>
    <td><input class="number" type="text" id="input-max-speed" placeholder="4"></td>
  </tr>
  <tr>
    <td><p>Turn Rate</p></td>
    <td><input class="number" type="text" id="input-turn-rate" placeholder="3"></td>
  </tr>
</table>

<button class="button" id="button-restart" onclick="gameOver">Restart</button>

<div class="drawer-close-button" id="drawer-close-button"></div>
</div> */}



// Get to waypoint with turns
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
// which direction goop should turn to get to target fastest
this.waypoint.angleToTarget = Math.atan2(this.waypoint.yVector, this.waypoint.xVector); // atan2 expensive?
this.waypoint.angleToTarget = Goop.boundAngle(this.waypoint.angleToTarget);
const angleDifference = this.waypoint.angleToTarget - this.velocity.direction;
// if difference is less than its ability to turn, then its close enough to go straight towards target
if (Math.abs(angleDifference) > this.velocity.TURN_RATE) { // determining CW or CCW is less turning
  if ((angleDifference < Math.PI && angleDifference > 0) || (angleDifference < - Math.PI)) {
    this.velocity.direction += (this.velocity.TURN_RATE);
  } else {
    this.velocity.direction -= (this.velocity.TURN_RATE);
  }
  this.velocity.direction = Goop.boundAngle(this.velocity.direction);
} else { // heading in straight line.
  this.velocity.direction = this.waypoint.angleToTarget;
}
if (this.state != STATE_RAGE) {
  // calc stopping dist needed. need current vel in dir to target
  const velVecToTarget = projection(
    {x: Math.cos(this.velocity.direction) * this.velocity.magnitude, y: Math.sin(this.velocity.direction) * this.velocity.magnitude},
    {x: this.waypoint.xVector, y: this.waypoint.yVector}
  )
  const velToTarget = Math.sqrt(Math.pow(velVecToTarget.x,2) + Math.pow(velVecToTarget.y,2)); // sqrt
  // how fast Goop can decelerate in target direction
  const decelVecToTarget = projection(
    {x: Math.cos(this.velocity.direction) * this.velocity.ACCELERATION, y: Math.sin(this.velocity.direction) * this.velocity.ACCELERATION},
    {x: this.waypoint.xVector, y: this.waypoint.yVector}
  )
  const decelToTarget = Math.sqrt(Math.pow(decelVecToTarget.x,2) + Math.pow(decelVecToTarget.y,2)); // sqrt
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





// RGBA for mobs
let mobColor = (alpha = 1) => `rgba(${140 + Math.random() * 40}, ${180 + Math.random() * 40}, 80, ${alpha})`
let setRgbaAlpha = (rgba, alpha) => {
  alpha = (alpha == NaN) ? 1 : alpha || 1
  if (rgba.lastIndexOf(',') == -1) return rgba
  return rgba.substring(0, rgba.lastIndexOf(',')) + `,${alpha})`
}
