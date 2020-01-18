const Box = require('../box.js')
const BlockInfo = require('../block_info.js')

const { BlockSize } = require('../consts.js')

const MultiTextureIds = {
	"2": [1, 0, 1, 0, 2, 1, 2, 1, 1, 0, 1, 0, 2, 1, 2, 1],
	"3": [8, 7, 5, 6, 3, 8, 4, 5, 1, 0, 8, 7, 2, 1, 3, 8],
	"4": [8, 7, 5, 6, 3, 13, 4, 11, 1, 0, 14, 12, 2, 9, 10, 15]
}

class Block extends Box {
	constructor(rpos, id) {
		super()
		this.pos = rpos.mul(BlockSize)
		this.rpos = rpos.copy()
		this.dim = BlockSize.copy()

		this.id = id || 0
		this.hp = 0
		this.damage = 0 //makes new hp
		this.multiTextureId = 0
	}

	// When hp is less than 0, and block must break
	onBreak() {
		// must be init from GameMap
		// sets air on this block's position
		this.GameMap.set(this.rpos.x, this.rpos.y, 0)
	}

	// When hp is less than it's construction point, and block must stop working (if it can)
	onDisassembly() {

	}

	// When hp is greater than it's construction point, and block must start working (if it can)
	onAssembly() {

	}

	// When hp is 100
	onBuild() {

	}

	onUpdate(data) {

	}

	onCollision(data) {

	}

	//must return everything that client must know
	getData() {
		return {
			id: this.id,
			hp: this.hp,
			multiTextureId: this.multiTextureId
		}
	}

	updateHp() {
		let oldHp = this.hp
		this.hp += this.damage
		let determine = (hp) => {
			if (hp == 100)
				return 3
			else if (hp >= BlockInfo.get(this.id).constructionHp)
				return 2
			else if (hp > 0 && hp < BlockInfo.get(this.id).constructionHp)
				return 1
			return 0
		}
		let oldCat = determine(oldHp)
		let newCat = determine(this.hp)
		for (let cat = oldCat; cat != newCat; cat += Math.sign(newCat-oldCat)) {
			if (cat == oldCat) continue
			if (cat == 0)
				this.onBreak()
			if (cat == 1)
				this.onDisassembly()
			if (cat == 2)
				this.onAssembly()
			if (cat == 3)
				this.onBuild()
		}
	}

	updateMultiTexture() {
		let mlttxt = BlockInfo.get(this.id).multiTexture
		if (mlttxt == 0 || mlttxt == 1) {
			return
		}
		let type = 8
		// let onlyMe = this.id == 12;
		let check = (i, j) => {
			return !(Block.GameMap.checkCoords(i, j) && BlockInfo.get(Block.GameMap.get(i, j).id).solid)
		}
		let x = this.rpos.x
		let y = this.rpos.y
		let neigh = check(x, y - 1) * 8 + check(x + 1, y) * 4 + check(x, y + 1) * 2 + check(x - 1, y)
		type = MultiTextureIds[mlttxt][neigh]
		this.multiTextureId = type;
	}

	//Main update
	update(dt) {
		this.updateHp()
	}
}

module.exports = Block
