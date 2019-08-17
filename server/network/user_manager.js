//Dependencies
const jwt = require('jsonwebtoken')
const User = require('./user.js')
const { jwtSecretKey, leftTimeout } = require('../settings.js')
const { sanitizeString } = require('../utils.js')

//Manages user registation and verification
//Also can return user by token or socket
class UserManager {
	constructor() {
		this.users = {}
		this.socketMap = {}
		this.lastId = 0
	}

	updateSocket(socket, token) {
		var user = users[token]
		delete this.socketMap[user.socket.id]
		this.socketMap[socket.id] = token
		user.socket = socket
	}

	verifyToken(token) {
		var user = undefined
		try {
			var decoded = jwt.verify(token, jwtSecretKey)
			user = this.users[token]
		} catch(err) {
		}
		return user
	}

	getNewId() {
		return this.lastId++
	}

	registerUser(socket, name) {
		var sanitName = sanitizeString(name)
		var user = undefined
		if (!sanitName) {
			return user
		}

		user = this.getUserBySocket(socket)
		if (user) {
			return user
		}

		user = new User(socket, sanitName, this.getNewId())
		this.users[user.token] = user
		this.socketMap[socket.id] = user.token
		return user
	}

	reRegisterSocket(user, socket) {
		delete this.socketMap[user.socket.id]
		user.socket = socket
		this.socketMap[socket.id] = user.token
	}

	addExistingUser(token) {
		try {
			var decoded = jwt.verify(token, jwtSecretKey)
			var user = new User(undefined, decoded.username, decoded.id)
			this.users[token] = user
			return user
		} catch(err) {
			return undefined
		}
	}

	deleteLeftUsers() {
		var tokensToDelete = []
		var now = Date.now()
		Object.entries(this.users).forEach((pair) => {
			if (pair[1].online >= 0 && now - pair[1].online >= leftTimeout) {
				tokensToDelete.push(pair[0])
			}
		})
		tokensToDelete.forEach((token) => {
			delete this.socketMap[this.users[token].socket.id]
			delete this.users[token]
		})
	}

	onlineUsers() {
		let online = 0
		Object.entries(this.users).forEach((pair) => {
			if (pair[1].online == -1) {
				online++
			}
		})
		return online
	}

	rerouteSocketMain(socket) {
		socket.emit('reroute', 'main')
	}

	getUser(token) {
		return this.users[token]
	}

	getUserBySocket(socket) {
		return this.users[this.socketMap[socket.id]]
	}
}

module.exports = UserManager
