const Vector = require('./vector.js')
const Human = require('./human.js')
const Virus = require('./virus.js')
const GameMap = require('./game_map.js')
const { RenderDistance, ChunkSize, MapSize } = require('./consts.js')

// an interface to some function both for human and virus 
class Player {
	constructor(user) {
		this.user = user
		this.keys = {}
		this.pos = new Vector(34, 34)

		if (this.user.size == 0) {
			this.player = new Human()
		}
		else {
			this.player = new Virus()
		}

		// when was the last time we sent this chunk to a player
		this.lastSended = []
		for (let i = 0; i < MapSize.x; i++) {
			this.lastSended.push([])
			for (let j = 0; j < MapSize.y; j++) {
				this.lastSended[i].push(0)
			}
		}
	}

	getPosition() {
		return this.pos
	}

	checkChunk(i, j) {
		if (this.lastSended[i][j] > GameMap.getChunk(i, j).lastUpdated) {
			return false
		}
		let pos = this.getPosition().div(ChunkSize).round()
		let chunkVector = new Vector(i, j)
		let dist = chunkVector.sub(pos).absv().sub(RenderDistance).maxv()
		return dist <= 0
	}

	sendChunk(i, j) {
		if (!this.checkChunk(i, j)) {
			return
		}
		this.lastSended[i][j] = Date.now()
		this.user.socket.emit('chunk', { chunk: GameMap.getChunk(i, j).getData(), i, j })
	}

	updateChunks() {
		for (let i = 0; i < MapSize.x; i++) {
			for (let j = 0; j < MapSize.y; j++) {
				this.sendChunk(i, j)
			}
		}
	}

	updateKeys() {
		if (this.keys['w']) {
			this.pos.y -= 0.3
		}
		if (this.keys['s']) {
			this.pos.y += 0.3
		}
		if (this.keys['a']) {
			this.pos.x -= 0.3
		}
		if (this.keys['d']) {
			this.pos.x += 0.3
		}
	}

	getData() {
		return {
			pos: this.pos,
			renderState: "player_stand",
			reverse: false,
		}
	}

	sendData() {
		this.user.socket.emit('update', this.getData())
	}

	update() {
		this.updateKeys()
		this.updateChunks()
		this.sendData()
	}
}

module.exports = Player
