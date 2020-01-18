const Vector = require('./vector.js')
const Box = require('./box.js')

const EPS = 1e-6
const DTINF = 1000
const G = 1000

class Physics {
	constuctor() {

	}

	updatePosition(pos, vel, dt) {
		return pos.add(vel.mula(dt))
	}

	intersectsAABB(a, b) {
		return   !(a.pos.x > b.pos.x + b.dim.x
				|| a.pos.x + a.dim.x < b.pos.x
				|| a.pos.y > b.pos.y + b.dim.y
				|| a.pos.y + a.dim.y < b.pos.y)
	}

	sweptAABB(a, b, v) {
		let invEntry = new Vector()
		let invExit = new Vector()
		if (v.x >= 0) {
			invEntry.x = b.pos.x - (a.pos.x + a.dim.x)
			invExit.x = (b.pos.x + b.dim.x) - a.pos.x
		}
		else {
			invEntry.x = (b.pos.x + b.dim.x) - a.pos.x
			invExit.x = b.pos.x - (a.pos.x + a.dim.x)
		}
		if (v.y >= 0) {
			invEntry.y = b.pos.y - (a.pos.y + a.dim.y)
			invExit.y = (b.pos.y + b.dim.y) - a.pos.y
		}
		else {
			invEntry.y = (b.pos.y + b.dim.y) - a.pos.y
			invExit.y = b.pos.y - (a.pos.y + a.dim.y)
		}
		let entry = new Vector()
		let exit = new Vector()
		if (v.x == 0) {
			entry.x = (invEntry.x > 0 ? 1 : -1) * DTINF
			exit.x = (invExit.x > 0 ? 1 : -1) * DTINF
		}
		else {
			entry.x = invEntry.x / v.x
			exit.x = invExit.x / v.x
		}
		if (v.y == 0) {
			entry.y = (invEntry.y > 0 ? 1 : -1) * DTINF
			exit.y = (invExit.y > 0 ? 1 : -1) * DTINF
		}
		else {
			entry.y = invEntry.y / v.y
			exit.y = invExit.y / v.y
		}
		let entryTime = entry.maxv()
		let exitTime = exit.minv()

		let intersectRes = {
			dt: DTINF,
			proj: new Vector(1, 1)
		}
		// this is an "if ( not (no intersection) )"
		if (!(entryTime > exitTime // main if
		 || entry.x < -EPS && entry.y < -EPS // some eps sheiit
		 || entry.x - DTINF > EPS
		 || entry.y - DTINF > EPS)) {
			if (entry.x - EPS > entry.y) {
				if (v.x >= 0) {
					normal.set(-1, 0)
				}
				else {
					normal.set(1, 0)
				}
			}
			else {
				if (v.y >= 0) {
					normal.set(0, -1)
				}
				else {
					normal.set(0, 1)
				}
			}
			intersectRes.dt = entryTime
		}
		return intersectRes
	}

	collision(a, b, dt) {
		let relv = b.vel != undefined ? a.vel.sub(b.vel) : a.vel

		let bigBox = new Box()
		bigBox.pos = a.pos.min(this.updatePosition(a.pos, relv, dt))
		bigBox.dim = a.pos.max(this.updatePosition(a.pos, relv, dt)).add(a.dim).sub(bigBox.pos)
		if (this.intersectsAABB(bigBox, b)) {
			return this.sweptAABB(a, b, relv)
		}
		else {
			return {
				dt: DTINF,
				proj: new Vector(1, 1)
			}
		}
	}

	collisionObstacles(object, obstacles, prevCollision) {
		let collidedIds = []
		let intersectRes = {
			dt: prevCollision.dt,
			proj: new Vector(1, 1)
		}
		obstacles.forEach((obj, i) => {
			let curIntersectRes = this.collision(object, obj, intersectRes.dt)
			if (Math.abs(curIntersectRes.dt - intersectRes.dt) <= EPS) {
				collidedIds.push(i)
			}
			else if (curIntersectRes.dt <= intersectRes.dt
			 && (prevCollision.proj.x && curIntersectRes.proj.y == 0
			 || prevCollision.proj.y && curIntersectRes.proj.x == 0)) {
				intersectRes = curIntersectRes
				collidedIds.length = 1
				collidedIds[0] = i
			}
		})
		intersectRes.dt = Math.max(0, intersectRes.dt)
		intersectRes.collidedIds = collidedIds
		return intersectRes
	}

	updateByData(object, data, obstacles, used) {
		var projVec = new Vector(data.proj.y, data.proj.x)
		if (object.standing != undefined) {
			object.standing = object.standing || data.proj.y == -1
		}
		// TODO
		object.pos = this.updatePosition(object.vel, data.dt - eps)
		object.vel = object.vel.mul(projVec.mul(projVec))

		data.obj.forEach((item) => {
			if (!used[item]) {
				object.onCollision(obstacles[item], data)
				obstacles[item].onCollision(object, data)
			}
			used[item] = true
		})
	}

	//Main collision function
	//Resolves every collision of object and obstacles
	collideAndResolve(object, obstacles, dt, self) {
		if (object.standing != undefined) {
			object.standing = false
		}

		var used = []
		used.length = obstacles.length
		used.fill(false)

		var collisionData = {
			dt: dt,
			proj: new Vector(this.vel.x, this.vel.y)
		}
		while (Math.abs(collisionData.dt) > eps) {
			let prevdt = collisionData.dt
			collisionData = this.collisionObstacles(object, obstacles, collisionData)
			this.updateByData(object, collisionData, obstacles, used)
			collisionData.proj = new Vector(this.vel.x, this.vel.y)
			collisionData.dt = prevdt - collisionData.dt
		}
	}
}

module.exports = new Physics();
