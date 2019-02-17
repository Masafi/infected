//Dependencies
const Lobby = require('./lobby.js')
const RoomManager = require('./room_manager.js')
const log = require('../utils.js')
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

		var self = this
		this.roomManager.registerExitHandler((roomId) => {
			self.onExit(roomId)
		})
	}

	registerRoomManager(roomManager) {
		this.roomManager = roomManager
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
		this.roomManager.sendMessage({type: "users", users})
		lobby.users.forEach((user) => {
			self.roomManager.rerouteSocket(player.socket, roomId)
		})
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

	getDataToSend() {
		return this.lobbies.map((lobby) => {
			return {
				id: lobby.id,
				playersNumber: lobby.users.length,
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
