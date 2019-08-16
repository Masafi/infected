const Box = require('../box.js')
const BlockInfo = require('../block_info.js')

const { BlockSize } = require('../consts.js')

class Block extends Box {
	constructor(rpos, id) {
		super()
		this.pos = rpos.mul(BlockSize)
		this.rpos = rpos.copy()
		this.dim = BlockSize.copy()

		this.id = id || 0
		this.owner = -1
		this.hp = 0
		this.damage = 0 //makes new hp
	}

	//When hp is less than 0, and block must break
	onBreak() {
		//must be init from GameMap
		//sets air on this block's position
		this.GameMap.set(this.rpos.x, this.rpos.y, 0)
	}

	//When hp is less than it's construction point, and block must stop working (if it can)
	onDisassembly() {

	}

	//When hp is greater than it's construction point, and block must start working (if it can)
	onAssembly() {

	}

	//When hp is 100
	onBuild() {

	}

	onUpdate(data) {

	}

	//must return everything that client must know
	getData() {
		return {
			id: this.id,
			owner: this.owner,
			hp: this.hp
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

	//Main update
	update(dt) {
		this.updateHp()
	}
}

module.exports = Block
