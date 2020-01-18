const sanitizeHtml = require('sanitize-html')
const util = require('util')
const path = require('path')

// Log level (All/Prod)
const AllLogs = true

//Sanitizes string, removes all html tags, checks for emptiness
function sanitizeString(str) {
	var empty = true
	if (typeof(str) != "string") {
		return ''
	}
	var sanitStr = sanitizeHtml(str, {allowedTags: [], allowedAttributes: []})
	if(sanitStr.length >= 16) {
		sanitStr = sanitStr.substr(0, 16)
	}
	if(sanitStr) {
		for(let i = 0; i < sanitStr.length; i++) {
			if(sanitStr[i] != ' ') {
				empty = false
				break
			}
		}
	}
	if(empty) {
		return ''
	}
	return sanitStr
}

//My log function with date, line and output to file too
function log(string, warn = 0) {
	if (!AllLogs && warn < 0) return;
	var orig = Error.prepareStackTrace
	Error.prepareStackTrace = function(_, stack){ return stack; }
	var err = new Error
	Error.captureStackTrace(err, this)
	var stack = err.stack
	Error.prepareStackTrace = orig

	var d = new Date()
	var p = (v) => { return (v < 10 ? '0' : '') + v; }
	var pref = p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()) + " ["
	if(warn == 0) pref += 'INFO'
	else if(warn < 0) pref += 'DBG'
	else if(warn == 1) pref += 'WARN'
	else if(warn == 2) pref += 'ERR'
	else pref += 'ERR#' + warn
	pref += '] ' + path.basename(stack[1].getFileName()) + ':' + stack[1].getLineNumber() + ': '
	if(warn >= 0) logFile.write(pref + util.format(string) + '\n')
	logStdout.write(pref + util.format(string) + '\n')
}

global.log = log

module.exports = { sanitizeString, log }
