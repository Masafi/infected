//Dependencies
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const jwt = require('jsonwebtoken')


const enviromentSetup = require('../enviroment_setup.js')
const UserManager = require('../network/user_manager.js')

const { jwtSecretKey, basicPort } = require('../settings.js')

enviromentSetup()

//Setting up a http+socket server
var ROOM_ID = process.argv[2]
var port = basicPort + parseInt(ROOM_ID)
server.listen(port)

//Log room creation
log("Room " + ROOM_ID + " created")

var userManager = new UserManager()

//Game

const GameMap = require('./game_map.js')
var map = new GameMap()

//GameEnd

//Setting a socket behavior
io.on('connection', (socket) => {
	//We assume, that client registered already, so we'll just wait until he sends his token
	socket.on('verifyToken', (token) => {
		log("verifyToken")
		var user = userManager.verifyToken(token)
		if(!user) {
			userManager.rerouteSocketMain(socket)
			return
		}

		socket.emit('join-success', ROOM_ID)
	})

	socket.on('getChunk', (i, j) => {
		socket.emit('chunk', { chunk: map.getChunk(i, j).getData() })
	})
})

//Main server messaging

//Handlers
var onServerMessage = {
	users: (message) => {
		message.users.forEach((data) => {
			var user = userManager.addExistingUser(data.token)
			if(user) {
				user.side = data.side
			}
		})
		setup()
	},
}

//Register them
process.on('message', (message) => {
	var handler = onServerMessage[message.type](message)
});

function setup() {
	map.generateMap()
}