const sanitizeHtml = require('sanitize-html');

function sanitizeString(str) {
	var empty = true;
	var sanitStr = sanitizeHtml(str, {allowedTags: [], allowedAttributes: []});
	if(sanitStr.length >= 16) {
		sanitStr = sanitStr.substr(0, 16);
	}
	if(sanitStr) {
		for(let i = 0; i < sanitStr.length; i++) {
			if(sanitStr[i] != ' ') {
				empty = false;
				break;
			}
		}
	}
	if(empty) {
		return ''
	}
	return sanitStr
}

module.exports = { sanitizeString }