//Dependencies
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const jwt = require('jsonwebtoken')
const UserManager = require('./UserManager.js')
const log = require('../utils.js')

const { jwtSecretKey, basicPort } = require('../settings.js')

//Setting up a http+socket server
var ROOM_ID = process.argv[2]
var port = basicPort + parseInt(ROOM_ID)
server.listen(port)

//Log room creation
log("Room " + ROOM_ID + " created")

var userManager = new UserManager()

//Setting a socket behavior
io.on('connection', function(socket) {
	//We assume, that client registered already, so we'll just wait until he sends his token
	socket.on('verifyToken', function(token) {
		var user = userManager.verifyToken(token)
		if(!user) {
			userManager.rerouteSocketMain(socket)
			return
		}

		socket.emit('join-success', ROOM_ID)
	})
})

//Main server messaging

//Handlers
var onServerMessage = {
	users: (message) => {
		message.users.forEach((data) => {
			var user = userManager.addExistingUser(data.token)
			user.side = data.side
		})
	},
}

//Register them
process.on('message', (message) => {
	var handler = onServerMessage[message.type]()
});

//
setTimeout(() => {
	console.log("Room " + ROOM_ID + " closed")
	process.exit()
}, 60000)
