const { log } = require('./utils.js')

function enviromentSetup() {
	//Error handling
	
	//Needed for getting current line
	Object.defineProperty(global, '__stack', {
		get: function(){
			var orig = Error.prepareStackTrace;
			Error.prepareStackTrace = function(_, stack){ return stack; };
			var err = new Error;
			Error.captureStackTrace(err, arguments.callee);
			var stack = err.stack;
			Error.prepareStackTrace = orig;
			return stack;
		}
	});

	//Needed for getting current line
	Object.defineProperty(global, '__line', {
		get: function(){
			return __stack[2].getLineNumber();
		}
	});

	//If error, log it to file
	process.on('uncaughtException', function(err) {
		log(err, 2);
		process.exit(1);
	});
}

module.exports = enviromentSetup