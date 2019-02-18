//Dependencies
const Lobby = require('./lobby.js')
const { roomsNumber } = require('../settings.js')

//Responsible for handling lobby events and starting rooms
class LobbyManager {
	constructor() {
		this.roomManager = undefined
		this.lobbies = []

		this.lobbies.length = roomsNumber
		for(let i = 0; i < roomsNumber; i++) {
			this.lobbies[i] = new Lobby(i)
			this.lobbies[i].onStart = this.onStart.bind(this)
		}
	}

	registerRoomManager(roomManager) {
		this.roomManager = roomManager
		var self = this
		this.roomManager.registerExitHandler((roomId) => {
			self.onExit(roomId)
		})
	}

	onExit(roomId) {
		log("Room " + roomId + " stoped")
		var lobby = this.lobbies[roomId]
		for(let i = lobby.users.length - 1; i >= 0; i--) {
			lobby.leaveRoom(lobby.users[i])
		}
		lobby.restart()
	}

	onStart(roomId) {
		log("Room " + roomId + " started")
		var lobby = this.lobbies[roomId]
		
		var self = this
		this.roomManager.createRoom(roomId)
		var users = []
		lobby.users.forEach((user) => {
			users.push({token: user.token, side: user.side})
		})
		this.roomManager.sendMessage(roomId, {type: "users", users})

		setTimeout(() => {
			lobby.users.forEach((user) => {
				self.roomManager.rerouteSocket(user.socket, roomId)
			})
		}, 1000)
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

	userReady(user) {
		if(user.roomId == -1)
			return false

		return this.lobbies[user.roomId].userReady(user)
	}

	changeSide(user, side) {
		if(user.roomId == -1)
			return false

		return this.lobbies[user.roomId].changeSide(user, side)
	}

	getDataToSend() {
		return this.lobbies.map((lobby) => {
			return {
				id: lobby.id,
				playersNumber: lobby.users.length,
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
