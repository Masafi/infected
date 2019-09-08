//Dependencies
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const jwt = require('jsonwebtoken')


const enviromentSetup = require('../enviroment_setup.js')
const UserManager = require('../network/user_manager.js')

const { jwtSecretKey, basicPort, roomDeathPeriod } = require('../settings.js')
const { MapSize } = require('./consts.js')

enviromentSetup()

//Setting up a http+socket server
const ROOM_ID = process.argv[2]
const PORT = basicPort + parseInt(ROOM_ID)
server.listen(PORT)

//Log room creation
log("Room " + ROOM_ID + " created")

const userManager = new UserManager()

//Game

const GameMap = require('./game_map.js')
const MapGenerator = new (require('./map_generator.js'))

//GameEnd

var sockk

//Setting a socket behavior
io.on('connection', (socket) => {
	sockk = socket
	//We assume, that client registered already, so we'll just wait until he sends his token
	socket.on('verifyToken', (token) => {
		log("verifyToken")
		var user = userManager.verifyToken(token)
		user.online = -1
		if (!user) {
			userManager.rerouteSocketMain(socket)
			return
		}

		socket.emit('join-success', ROOM_ID)
		for (let i = 0; i < MapSize.x; i++) {
			for (let j = 0; j < MapSize.y; j++) {
				socket.emit('chunk', { chunk: GameMap.getChunk(i, j).getData(), i, j })
			}
		}
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
	MapGenerator.generate()

	// kills server if no users connected
	setInterval(() => {
		if (Object.keys(io.sockets.sockets).length == 0) {
			log("No users in room " + ROOM_ID + ", stopping room")
			process.exit()
		}
	}, roomDeathPeriod)
}