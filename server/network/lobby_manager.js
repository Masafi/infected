//Dependencies
const Lobby = require('./lobby.js')
const { roomsNumber } = require('../settings.js')

//Responsible for handling lobby events and starting rooms
class LobbyManager {
	constructor() {
		this.roomManager = undefined
		this.onRoomChangedHandler = undefined
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

	registerRoomChangedHandler(handler) {
		this.onRoomChangedHandler = handler
	}

	onExit(roomId) {
		log("Room " + roomId + " stoped")
		var lobby = this.lobbies[roomId]
		for(let i = lobby.users.length - 1; i >= 0; i--) {
			lobby.leaveRoom(lobby.users[i])
		}
		lobby.restart()
		this.onRoomChanged(roomId)
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

		this.onRoomChanged(roomId)
	}

	onRoomChanged(roomId) {
		this.onRoomChangedHandler && this.onRoomChangedHandler(roomId)
	}

	handleRoomEvent(res, roomId) {
		if(res) {
			this.onRoomChanged(roomId)
		}
		return res
	}

	resume(user) {
		user.online = -1
		if(user.roomId == -1) {
			user.socket.join('main')
		}
		else {
			user.socket.join(user.roomId)
			this.roomManager.rerouteSocket(user.socket, user.roomId)
		}
	}

	disconnect(user) {
		user.online = Date.now()

		if(user.roomId != -1 && this.lobbies[user.roomId].startedTime == -1) {
			this.leaveRoom(user)
		}
		this.emitTo(user.socket)
	}

	joinRoom(user, roomId) {
		if(user.roomId != -1)
			return false

		if(roomId < 0 || roomId >= roomsNumber)
			return false

		return this.handleRoomEvent(
			this.lobbies[roomId].joinRoom(user),
			roomId
		)
	}

	leaveRoom(user) {
		if(user.roomId == -1)
			return false

		var roomId = user.roomId
		return this.handleRoomEvent(
			this.lobbies[user.roomId].leaveRoom(user),
			roomId
		)
	}

	userReady(user) {
		if(user.roomId == -1)
			return false

		return this.handleRoomEvent(
			this.lobbies[user.roomId].userReady(user),
			user.roomId
		)
	}

	changeSide(user, side) {
		if(user.roomId == -1)
			return false

		return this.handleRoomEvent(
			this.lobbies[user.roomId].changeSide(user, side),
			user.roomId
		)
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
