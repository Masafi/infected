//Dependencies
const jwt = require('jsonwebtoken')
const { jwtSecretKey } = require('../settings.js')

//Holds user information
//Also generates token
class User {
	constructor(socket, name, id) {
		//Main
		//Actually, server uses token (and rarely socket) for user identification
		//Id used mainly (only?) by clients
		this.id = id
		this.socket = socket
		this.username = name
		this.token = jwt.sign({ username: this.username, socket_id: (socket ? socket.id : "noid"), id: this.id }, jwtSecretKey)
		this.roomId = -1
		this.online = -1

		//Lobby
		this.ready = false
		this.side = 0
	}
}

module.exports = User
