const fs = require('fs');

const blockInfoFile = './server/res/block_info.json'

class BlockInfo {
	constructor() {
		this.info = JSON.parse(fs.readFileSync(blockInfoFile, 'utf8'))
		this.nameIdMap = {}
		for (let i = 0; i < this.info.length; i++) {
			if (this.info[i] && this.info[i].name) {
				this.nameIdMap[this.info[i].name] = i
			}
		}
	}

	getIdByName(name) {
		return this.nameIdMap[name]
	}

	getInfoById(id) {
		return this.info[id]
	}

	getInfoByName(name) {
		return this.getInfoById(this.getIdByName(name))
	}

	get(id) {
		return this.getInfoById(id)
	}
}

module.exports = new BlockInfo()
