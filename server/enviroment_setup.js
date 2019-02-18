const fs = require('fs')
const { log } = require('./utils.js')

function enviromentSetup() {
	//If error, log it to file
	process.on('uncaughtException', (err) => {
		log(err, 2)
		process.exit(1)
	})

	//Streams for log output
	global.logFile = fs.createWriteStream('./log.txt', { flags: 'a' })
	global.logStdout = process.stdout
}

module.exports = enviromentSetup
