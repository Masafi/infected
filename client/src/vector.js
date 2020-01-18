class Vector {
	constructor(x, y) {
		this.x = x || 0
		this.y = y || 0
	}

	add(v) {
		return new Vector(this.x + v.x, this.y + v.y)
	}

	adda(v) {
		return new Vector(this.x + v, this.y + v)
	}

	sub(v) {
		return new Vector(this.x - v.x, this.y - v.y)
	}

	suba(v) {
		return new Vector(this.x - v, this.y - v)
	}

	neg() {
		return new Vector(-this.x, -this.y)
	}

	mul(v) {
		return new Vector(this.x * v.x, this.y * v.y)
	}

	mula(v) {
		return new Vector(this.x * v, this.y * v)
	}

	div(v) {
		return new Vector(this.x / v.x, this.y / v.y)
	}

	diva(v) {
		return new Vector(this.x / v, this.y / v)
	}

	max(v) {
		return new Vector(Math.max(this.x, v.x), Math.max(this.y, v.y))
	}

	min(v) {
		return new Vector(Math.min(this.x, v.x), Math.min(this.y, v.y))
	}

	maxv() {
		return Math.max(this.x, this.y)
	}

	minv() {
		return Math.max(this.x, this.y)
	}

	round() {
		return new Vector(Math.floor(this.x), Math.floor(this.y))
	}

	abs() {
		return Math.sqrt(this.x * this.x + this.y * this.y)
	}

	absv() {
		return new Vector(Math.abs(this.x), Math.abs(this.y))
	}

	abs2() {
		return this.x * this.x + this.y * this.y
	}

	copy(v, b) {
		if (v == undefined) {
			return new Vector(this.x, this.y)
		}
		else if (b == undefined) {
			this.x = v.x
			this.y = v.y
		}
		else {
			this.x = v
			this.y = b
		}
	}

	set(x, y) {
		this.x = x
		this.y = y
	}

	toArr() {
		return [this.x, this.y]
	}
}
