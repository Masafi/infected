const Blocks = require('./blocks.js')
const GameMap = require('./game_map.js')
const BlockInfo = require('./block_info.js')
const Vector = require('./vector.js')

class BlockBuilder {

	set(i, j, id, args) {
		let block = new Blocks.Block(new Vector(i, j), id)
		if (BlockInfo.get(id).multiTexture != 0) {
			block.multiTextureId = 0
		}
		GameMap.set(i, j, block)
	}
}

module.exports = BlockBuilder