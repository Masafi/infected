const { lobbySize, readyTimeout } = require('../settings.js')

class Lobby {
	constructor(id) {
		this.id = id
		this.users = []

		this.startedTime = -1
		this.startTimer = undefined
		this.onStart = undefined
	}

	registerOnStart(onStart) {
		this.onStart = onStart
	}

	countSides() {
		var sideSize = [0, 0]
		this.users.forEach((user) => {
			sideSize[user.side]++
		})
		return sideSize
	}

	checkStart(forceStop) {
		var ready = 0
		if(!forceStop) {
			this.users.forEach((user) => {
				if(user.ready) {
					ready++
				}
			})
		}
		if(ready != 0 && ready == this.users.length) {
			var self = this
			this.startTimer = setTimeout(() => {
				self.startedTime = Date.now()
				self.onStart && self.onStart(self.id)
			}, readyTimeout)
		}
		else {
			if(this.startTimer) {
				clearTimeout(this.startTimer)
				this.startedTime = -1
				this.startTimer = undefined
			}
		}
	}

	findUser(user) {
		var index = -1
		if(user.roomId != this.id)
			return index

		this.users.forEach((usr, i) => {
			if(usr.token == user.token) {
				index = i
			}
		})
		return index
	}

	joinRoom(user) {
		if(this.users.length >= lobbySize * 2)
			return false
		if(user.roomId == this.id)
			return true

		var sideSize = this.countSides()
		if(sideSize[0] <= sideSize[1])
			user.side = 0
		else
			user.side = 1

		user.ready = false
		user.roomId = this.id
		user.socket.leave('main')
		user.socket.join(this.id)
		this.users.push(user)

		this.checkStart()

		return true
	}

	leaveRoom(user) {
		let index = this.findUser(user)
		if(index == -1)
			return false

		user.roomId = -1
		user.ready = false
		user.side = 0
		user.socket.leave(this.id)
		user.socket.join('main')
		this.users.splice(index, 1)

		this.checkStart()

		return true
	}

	userReady(user) {
		let index = this.findUser(user)
		if(index == -1)
			return false

		user.ready = !user.ready

		this.checkStart()

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

		this.checkStart()

		return true
	}

	restart() {
		this.users.length = 0
		this.startedTime = -1
		this.startTimer = undefined
	}

	getDataToSend() {
		return {
			id: this.id,
			users: this.users.map((user) => {
				return {
					id: user.id,
					username: user.username,
					ready: user.ready,
					side: user.side,
				}
			})
		}
	}

	emit(io) {
		io.to(this.id).emit('lobby-update', this.getDataToSend())
	}

	emitTo(socket) {
		socket.emit('lobby-update', this.getDataToSend())
	}
}

module.exports = Lobby
