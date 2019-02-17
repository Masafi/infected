//Dependencies
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const jwt = require('jsonwebtoken')

const enviromentSetup = require('./enviroment_setup.js')
const LobbyManager = require('./network/lobby_manager.js')
const UserManager = require('./network/user_manager.js')

const { jwtSecretKey, httpPort } = require('./settings.js')

//Enviroment
enviromentSetup()

//Setting up a http+socket server
server.listen(httpPort)
app.use(express.static('client'))

//Singletons
var lobbyManager = new LobbyManager()
var userManager = new UserManager()

//Setting a socket behavior
io.on('connection', function(socket) {
	//We need to register the client somehow 
	socket.on('reg', function(name) {
		var user = userManager.registerUser(socket, name)
		if(!user) {
			socket.emit('reg-error', true)
			return
		}

		socket.emit('reg-success', user.id, user.token, user.nickname)
		socket.join('main')
		lobbyManager.emitTo(socket)
	})

	//If client is registered already and, for example, refreshed a page, we don't need to register him second time
	socket.on('verifyToken', function(token) {
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', false)
			return
		}

		//TODO: check, is player in the game, and if so, send him there
		//socket.emit('reg-success', user.id, user.token, user.nickname)
	})

//There are 4 rooms events handlers
//Just checks token and ask lobbyManager to do the job
	socket.on('joinRoom', function(token, roomId) {
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', false)
			return
		}

		var success = lobbyManager.joinRoom(user, roomId)
		if(success) {
			lobbyManager.emit(io)
			lobbyManager[roomId].emit(io)
		}
	})

	socket.on('leaveRoom', function(token) {
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', false)
			return
		}

		var roomId = user.roomId
		var success = lobbyManager.leaveRoom(user)
		if(success) {
			lobbyManager.emit(io)
			lobbyManager[roomId].emit(io)
		}
	})

	socket.on('userReady', function(token, ready) {
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', false)
			return
		}

		var success = lobbyManager.userReady(user, ready)
		if(success) {
			lobbyManager.emit(io)
			lobbyManager[user.roomId].emit(io)
		}
	})

	socket.on('changeSide', function(token, side) {
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', false)
			return
		}

		var success = lobbyManager.changeSide(user, side)
		if(success) {
			lobbyManager.emit(io)
			lobbyManager[user.roomId].emit(io)
		}
	})
})

function update() {

}
