const { jwtSecretKey } = require('../settings.js')

class User {
	constructor(socket, name, id) {
		//Main
		this.id = id
		this.socket = socket
		this.username = name
		this.token = jwt.sign({ username: this.username, id: socket.id }, jwtSecretKey)
		this.room = -1
		this.online = false
		this.leftTime = Date.now()

		//Lobby
		this.ready = false
		this.side = 0
	}
}

module.exports = User