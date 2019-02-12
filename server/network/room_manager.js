//Dependencies
const child_process = require('child_process')

const { basicPort, moduleName } = require('../settings.js')

//Manages rooms livecycle and socket rerouting
class RoomManager {
	constructor() {
		this.rooms = {}	
		this.length = 0
		this.messageHandlers = {}
		this.exitHandlers = {}
	}

	//Sets the main handler, that will run if no handler attached to the room
	//Handler is
	//function onMessage(msg, roomId)
	setMessageHandler(handler) {
		this.messageHandlers[-1] = handler
	}

	//Sets the main handler, that will run if no handler attached to the room
	//Handler is
	//function onExit(roomId)
	setExitHandler(handler) {
		this.exitHandlers[-1] = handler
	}

	//Sets handler for each room
	//Handler is
	//functiom onMessage(msg, roomId)
	setRoomMessageHandler(roomId, handler) {
		//Optional, can be changed/removed
		if(!this.rooms[roomId]) {
			throw "RoomManager.setRoomMessageHandler: No room with this id (" + roomId + ")" 
		}
		this.messageHandlers[roomId] = handler
	}

	//Sets handler for each room
	//Handler is
	//function onExit(roomId)
	setRoomExitHandler(handler) {
		//Optional, can be changed/removed
		if(!this.rooms[roomId]) {
			throw "RoomManager.setRoomExitHandler: No room with this id (" + roomId + ")" 
		}
		this.exitHandlers[roomId] = handler
	}

	//Creates new room
	//I recommend to create an room, and then send init data with messages
	//if roomId == undefined, finds first non used id
	createRoom(roomId) {
		//Find first free id
		//Not fast, altogether works not that bad
		var id = roomId || 0
		if(!roomId) {
			for(; id < this.length; id++) {
				if(!this.rooms[id]) {
					break
				}
			}
			this.length = Math.max(id, this.length)
		}
		else if(this.rooms[id]) {
			throw "RoomManager.createRoom: There is already a room with this id (" + roomId + ")" 
		}
		//Forks an process and creates some handlers
		var self = this
		this.rooms[id] = child_process.fork(moduleName, ['' + id])
		this.rooms[id].on('exit', function() {
			if(self.exitHandlers[id]) {
				self.exitHandlers[id](id)
			}
			else if(self.exitHandlers[-1]) {
				self.exitHandlers[-1](id)
			}
			delete self.rooms[id]
			delete self.messageHandlers[id]
			delete self.exitHandlers[id]
		})
		this.rooms[id].on('message', function(msg) {
			if(self.messageHandlers[id]) {
				self.messageHandlers[id](msg, id)
			}
			else if(self.messageHandlers[-1]) {
				self.messageHandlers[-1](msg, id)
			}
		})

		return id
	}

	sendMessage(roomId, msg) {
		//Optional, can be removed/changed
		if(!this.rooms[roomId]) {
			throw "RoomManager.sendMessage: No room with this id (" + roomId + ")" 
		}
		this.rooms[roomId].send(msg)
	}

	rerouteSocket(socket, roomId) {
		//Optional, can be removed/changed
		if(!this.rooms[roomId]) {
			throw "RoomManager.rerouteSocket: No room with this id (" + roomId + ")" 
		}
		socket.emit('reroute', roomId + basicPort)
	}

	deleteRoom(roomId) {
		//Optional, can be removed/changed
		if(!this.rooms[roomId]) {
			throw "RoomManager.deleteRoom: No room with this id (" + roomId + ")" 
		}

		this.rooms[roomId].kill()
		delete self.rooms[roomId]
		delete self.messageHandlers[roomId]
		delete self.exitHandlers[id]
	}
}

module.exports = RoomManager