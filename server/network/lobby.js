const { lobbySize, readyTimeout } = require('../settings.js')

class Lobby {
	constructor(id) {
		this.id = id
		this.players = []
		this.startedTime = -1
		this.started = false
	}

	countSides() {
		var sideSize = [0, 0]
		this.players.forEach((player) => {
			sideSize[player.side]++
		})
		return sideSize
	}

	checkStart() {
		var ready = 0
		this.players.forEach((player, i) => {
			if(player.ready) {
				ready++
			}
		})
		if(ready == this.players.length) {
			this.startedTime = Date.now()
		}
		else {
			this.startedTime = -1
		}
	}

	findUser(user) {
		var index = -1
		if(user.room != this.id)
			return index

		this.players.forEach((player, i) => {
			if(user.token == player.token) {
				index = i
			}
		})
		return index
	}

	joinRoom(user) {
		if(this.players.length >= lobbySize * 2)
			return false
		if(user.room == this.id)
			return true

		var sideSize = this.countSides()
		if(sideSize[1] <= sideSize[0])
			user.side = 0
		else
			user.side = 1

		user.ready = false
		user.room = this.id
		user.socket.leave('main')
		user.socket.join(this.id)
		this.players.push(user)

		checkStart()

		return true
	}

	leaveRoom(user) {
		let index = this.findUser(user)
		if(index == -1)
			return false

		user.room = -1
		user.ready = false
		user.side = 0
		user.socket.leave(this.id)
		user.socket.join('main')
		this.players.slice(index, 1)

		checkStart()

		return true
	}

	userReady(user, ready) {
		let index = this.findUser(user)
		if(index == -1)
			return false

		user.ready = ready

		checkStart()

		return true
	}

	changeSide(user, side) {
		let index = this.findUser(user)
		if(index == -1)
			return false

		if(side != 0 && side != 1)
			return false

		if(user.side == side)
			return true

		var sideSizes = this.countSides()
		if(sideSizes[side] >= lobbySize)
			return false

		user.side = side
		user.ready = false

		checkStart()

		return true
	}

	update() {
		if(this.started)
			return false

		if(this.startedTime == -1) 
			return false
		
		var time = Date.now()
		if(time - this.startedTime >= readyTimeout) {
			return true
		}

		return false
	}

	restart() {
		this.players.length = 0
		this.startedTime = -1
		this.started = false
	}

	getDataToSend() {
		return this.players.map((player) => {
			return {
				id = user.id,
				nickname = user.nickname,
				ready = user.ready,
				side = user.side,
			}
		})
	}

	emit(io) {
		io.to(this.id).emit('lobby-update', this.getDataToSend())
	}

	emitTo(socket) {
		socket.emit('lobby-update', this.getDataToSend())
	}
}

module.exports = Lobby