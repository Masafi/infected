const fs = require('fs')
const { log } = require('./utils.js')
const { jwtPrivateKey } = require('./settings.js')

function enviromentSetup() {
	//Streams for log output
	global.logFile = fs.createWriteStream('./log.txt', { flags: 'a' })
	global.logStdout = process.stdout
	
	//If error, log it to file
	process.on('uncaughtException', (err) => {
		log(err, 2)
		process.exit(1)
	})

	//If the key is default, you need to change it
	if(jwtPrivateKey == "someprivatekey") {
		log("Found default jwt key. You probably forgot to change it", 1)
	}
}

module.exports = enviromentSetup
