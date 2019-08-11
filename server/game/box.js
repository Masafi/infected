const Vector = require('./vector.js')

class Box {
	constructor(pos, dim) {
		this.pos = pos || new Vector()
		this.dim = dim || new Vector()
	}

	getCenter() {
		return this.pos.add(this.dim.diva(2))
	}
}

module.exports = Box
