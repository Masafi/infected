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

		//TODO: check, is player in the game, and if so, send him there
		//socket.emit('reg-success', user.id, user.token, user.username)
	})

//There are 4 rooms events handlers
//Just checks token and ask lobbyManager to do the job
	socket.on('joinRoom', (token, roomId) => {
		log('joinRoom ' + token.substr(0, 5) + ' ' + roomId)
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', undefined)
			return
		}

		var success = lobbyManager.joinRoom(user, roomId)
		if(success) {
			lobbyManager.emit(io)
			lobbyManager.lobbies[roomId].emit(io)
		}
	})

	socket.on('leaveRoom', (token) => {
		log('leaveRoom ' + token.substr(0, 5))
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', undefined)
			return
		}

		var roomId = user.roomId
		var success = lobbyManager.leaveRoom(user)
		if(success) {
			lobbyManager.emit(io)
			lobbyManager.lobbies[roomId].emit(io)
		}
	})

	socket.on('userReady', (token) => {
		log('userReady ' + token.substr(0, 5))
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', undefined)
			return
		}

		var success = lobbyManager.userReady(user)
		if(success) {
			lobbyManager.emit(io)
			lobbyManager.lobbies[user.roomId].emit(io)
		}
	})

	socket.on('changeSide', (token, side) => {
		log('changeSide ' + token.substr(0, 5) + ' ' + side)
		var user = userManager.verifyToken(token)
		if(!user) {
			socket.emit('reg-error', undefined)
			return
		}

		var success = lobbyManager.changeSide(user, side)
		if(success) {
			lobbyManager.emit(io)
			lobbyManager.lobbies[user.roomId].emit(io)
		}
	})
})

function setup() {
	lobbyManager.registerRoomManager(roomManager)
	log("Server started successfully")
}

setup()
