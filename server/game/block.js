const Box = require('box.js')

class Block extends Box{
	constructor() {
		this.id = 0
		this.owner = -1
		this.breakingStarted = -1;
	}

	
}

module.exports = Block