const Vector = require('./vector.js')
const Box = require('./box.js')
const Physics = require('./physics.js')
const GameMap = require('./game_map.js')

const SlowDown = new Vector(1200, 0) // temp 

class Entity extends Box {
	constructor(id) {
		this.id = id
		this.vel = new Vector(0, 0)
		this.acc = new Vector(0, 0)
		this.standing = false
	}

	//Friction force
	brakes(dt) {
		if (Math.abs(this.vel.x) <= SlowDown.x * dt) this.vel.x = 0
		else this.vel.x -= Math.sign(this.vel.x) * SlowDown.x * dt

		if (Math.abs(this.vel.y) <= SlowDown.y * dt) this.vel.y = 0
		else this.vel.y -= Math.sign(this.vel.y) * SlowDown.y * dt
	}

	updateSpeed(dt) {
		return this.vel.add(this.acc.mula(dt));
	}

	updatePosition(vel, dt) {
		return this.pos.add(vel.mula(dt));
	}

	update(dt) {

	}
}
