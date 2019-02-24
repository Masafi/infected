//Consts
const fs = require('fs');

//Your secret key for encoding tokens
const jwtSecretKey = fs.readFileSync('./server/jwtprivate.key')
//HTTP port for main and http server
const httpPort = 8080
//Path to a child module (room module)
const moduleName = './server/network/room.js'
//Port, from which to start
//i.e. room with id, will have port = (basicPort + id)
const basicPort = 10000
//Lobby max size
//Per side
const lobbySize = 8
//How many rooms there will be
const roomsNumber = 8
//Time between ready and game start, ms
const readyTimeout = 1000*5
//Time to kick disconnected user from server, ms
const leftTimeout = 1000*60*30

module.exports = { 
	jwtSecretKey,
	httpPort,
	moduleName,
	basicPort,
	lobbySize,
	roomsNumber,
	readyTimeout,
	leftTimeout
}
