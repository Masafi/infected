// Consts
const fs = require('fs');

// Your secret key for encoding tokens
const jwtSecretKey = fs.readFileSync('./server/jwtprivate.key')
// HTTP port for main and http server
const httpPort = 8080
// Path to a child module (room module)
const moduleName = './server/game/room.js'
// Port, from which to start rooms
// i.e. room with id, will have port = (basicPort + id)
const basicPort = 10000
// Lobby max size
// Per side
const lobbySize = 8
// How many rooms there will be
const roomsNumber = 8
// Time between ready and game start, ms
const readyTimeout = 1000*5*0
// Period to check if there any users left, ms
const roomDeathPeriod = 1000*60
// Time to kick disconnected user from server, ms
const leftTimeout = 1000*60*30
// Time between ticks, ms
const tickrate = 33

module.exports = {
	jwtSecretKey,
	httpPort,
	moduleName,
	basicPort,
	lobbySize,
	roomsNumber,
	readyTimeout,
	roomDeathPeriod,
	leftTimeout,
	tickrate,
}
