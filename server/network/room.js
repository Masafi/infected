//Dependencies
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const jwt = require('jsonwebtoken')
const RoomManager = require('./room_manager.js')

const { jwtSecretKey, basicPort } = require('../settings.js')

//Setting up a http+socket server
var id = process.argv[2]
var port = basicPort + parseInt(id)
server.listen(port)

//for clarity
console.log("room " + id + " opened")

//Setting a socket behavior
io.on('connection', function(socket) {
	//We assume, that client registered already, so we'll just wait until he sends his token
	socket.on('verifyToken', function(token) {
		var good = true
		try {
			var decoded = jwt.verify(token, jwtSecretKey);
		} catch(err) {
			good = false
		}

		if(good) {
			console.log(token.substr(0, 5) + ' connected to ' + id) //example
			socket.emit('reg-success', token, id)
		}
	})
})

setTimeout(() => {
	console.log("room " + id + " closed")
	process.exit()
}, 10000)