//Dependencies
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const enviromentSetup = require('./enviroment_setup.js')
const RoomManager = require('./network/room_manager.js')
const UserManager = require('./network/user_manager.js')
const LobbyManager = require('./network/lobby_manager.js')

const { jwtSecretKey, httpPort } = require('./settings.js')

//Enviroment
enviromentSetup()

//Setting up a http+socket server
server.listen(httpPort)
app.use(express.static('client'))

//Singletons
var userManager = new UserManager()
var roomManager = new RoomManager()
var lobbyManager = new LobbyManager()

//Setting a socket behavior
io.on('connection', (socket) => {
	//We need to register the client somehow 
	socket.on('reg', (name) => {
		var user = userManager.registerUser(socket, name)
		if(!user) {
			socket.emit('reg-error', 'You\'ve entered inappropriate nickname')
			return
		}

		socket.emit('reg-success', user.id, user.token, user.username)
		socket.join('main')
		lobbyManager.emitTo(socket)
	})

	//If client is registered already and, for example, refreshed a page, we don't need to register him second time
	socket.on('verifyToken', (token) => {
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', undefined)
			return
		}
		userManager.reRegisterSocket(user, socket)
		socket.emit('reg-success', user.id, user.token, user.username)

		lobbyManager.resume(user)
	})

	socket.on('disconnect', () => {
		var user = userManager.getUserBySocket(socket)
		if(!user) {
			return;
		}

		lobbyManager.disconnect(user)
	})

//There are 4 rooms events handlers
//Just checks token and ask lobbyManager to do the job
	socket.on('joinRoom', (token, roomId) => {
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', undefined)
			return
		}

		lobbyManager.joinRoom(user, roomId)
	})

	socket.on('leaveRoom', (token) => {
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', undefined)
			return
		}

		lobbyManager.leaveRoom(user)
	})

	socket.on('userReady', (token) => {
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', undefined)
			return
		}

		lobbyManager.userReady(user)
	})

	socket.on('changeSide', (token, side) => {
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', undefined)
			return
		}

		lobbyManager.changeSide(user, side)
	})
})

function setup() {
	lobbyManager.registerRoomManager(roomManager)
	lobbyManager.registerRoomChangedHandler((roomId) => {
		lobbyManager.emit(io)
		if(lobbyManager.lobbies[roomId].startedTime == -1) {
			lobbyManager.lobbies[roomId].emit(io)
		}
	})
	log("Server started successfully")
}

setup()
