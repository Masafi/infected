const Block = require('./blocks/block.js')
const Air = require('./blocks/air.js')
const BlockInfo = require('./block_info.js')

const Blocks = {
	Block,
	Air
};

// adding block class (constructor) for every id
(() => {
	let classByName = {}
	for (const [key, value] of Object.entries(Blocks)) {
		classByName[key] = value
	}
	BlockInfo.info.forEach((block) => {
		block.BlockClass = classByName[block.blockClassName]
	})
})()

module.exports = Blocks
