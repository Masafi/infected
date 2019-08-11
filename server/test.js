const Blocks = require('./game/blocks.js')
const BlockInfo = require('./game/block_info.js')
const Vector = require('./game/vector.js')

const ClassById = (() => {
	let result = {}
	let classByName = {}
	for (const [key, value] of Object.entries(Blocks)) {
		classByName[key] = new value(new Vector())
	}
	console.log(classByName)
	BlockInfo.info.forEach((block) => {

	})
})()