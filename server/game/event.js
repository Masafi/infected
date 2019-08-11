class Event {
	constructor(callback, data) {
		this.timerId = undefined
		this.callback = callback
		this.data = data
	}

	setCallback(callback) {
		this.callback = callback
	}

	setData(data) {
		this.data = data
	}

	trigger() {
		this.callback(this)
	}

	timer(millisecs) {
		if (millisecs <= 0) {
			this.trigger()
		}
		else {
			this.timerId = setTimeout(() => this.trigger(), millisecs)
		}
	}

	stop() {
		if (this.timerId != undefined) {
			clearTimeout(this.timerId)
		}
	}
}

module.exports = Event
