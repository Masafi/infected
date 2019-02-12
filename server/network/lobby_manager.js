const Lobby = require('lobby.js')
const RoomManager = require('room_manager.js')
const { roomsNumber } = require('../settings.js')

class LobbyManager {
	constructor() {
		this.roomManager = new RoomManager()
		this.lobbies = []

		this.lobbies.length = roomsNumber
		for(let i = 0; i < roomsNumber; i++) {
			this.lobbies[i] = new Lobby(i)
		}

		var self = this
		this.roomManager.setExitHandler((roomId) => {
			self.onExit(roomId)
		})
	}

	onExit(roomId) {
		var lobbie = this.lobbies[roomId]
		for(let i = lobbie.players.length - 1; i >= 0; i--) {
			lobbie.leaveRoom(lobbie.players[i])
		}
		lobbie.restart()
	}

	joinRoom(user, roomId) {
		if(user.roomId != -1)
			return false
		
		if(roomId < 0 || roomId >= roomsNumber)
			return false

		return this.lobbies[roomId].joinRoom(user)
	}

	leaveRoom(user) {
		if(user.roomId == -1)
			return false

		return this.lobbies[user.roomId].leaveRoom(user)
	}

	userReady(user, ready) {
		if(user.roomId == -1)
			return false

		return this.lobbies[user.roomId].userReady(user, ready)
	}

	changeSide(user, side) {
		if(user.roomId == -1)
			return false

		return this.lobbies[user.roomId].changeSide(user, side)
	}

	startGame(roomId) {
		var lobby = this.lobbies[roomId]
		lobby.started = true
		
		var self = this
		this.roomManager.createRoom(roomId)
		lobby.players.forEach((player) => {
			self.roomManager.rerouteSocket(player.socket, roomId)
		})
	}

	update() {
		this.lobbies.forEach((lobby, id) => {
			if(lobby.update()) {
				this.startGame(id)
			}
		})
	}

	getDataToSend() {
		return this.lobbies.map((lobby) => {
			return {
				id: lobby.id,
				playersNumber: lobby.players.length,
				started: lobby.started,
				startedTime: lobby.startedTime,
			}
		})
	}

	emit(io) {
		io.to('main').emit('lobbies-update', this.getDataToSend())
	}

	emitTo(socket) {
		socket.emit('lobbies-update', this.getDataToSend())
	}
}

module.exports = LobbyManager