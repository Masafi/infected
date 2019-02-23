var IP = window.location.href.slice(0, -1) //remove last '/'
var mainSocket = io.connect(IP)
var roomSocket = undefined
var token = undefined
var isInMain = true

function setUIState(state, error) {
	if(state == 'login') {
		$('#rooms-form').hide()
		$('#players-form').hide()
		$('#login-form').show()
		if(error) {
			$('#login-error').html('<b>Error:</b> ' + error)
			$('#login-error').show()
		}
		else {
			$('#login-error').hide()
		}
	}
	else if(state == 'lobby-select') {
		$('#rooms-list').empty()
		$('#login-form').hide()
		$('#players-form').hide()	
		$('#rooms-form').show()
	}
	else if(state == 'lobby') {
		$('#players-list-humans').empty()
		$('#players-list-virus').empty()
		$('#login-form').hide()
		$('#rooms-form').hide()
		$('#players-form').show()
		//$('#ready-button').removeClass('disabled')
	}
}

//Utility function
function getCurrentSocket() {
	return (isInMain ? mainSocket : roomSocket)
}

function setupRoomSocket(socket) {
	//When disconnects, force to connect to main server and not reconnect to the room
	socket.on('disconnect', () => {
		isInMain = true
		mainSocket.connect()
	})

	socket.on('connect', () => {
		socket.emit('verifyToken', token)
	})

	socket.on('join-success', (roomId) => {
		console.log('Successfully connected to ' + roomId)
	})
}

//Connection logic
//Responsible for switching from rooms and main server
mainSocket.on('reroute', (port) => {
	console.log('reroute', port)
	mainSocket.disconnect()
	isInMain = false
	roomSocket = io.connect(IP + ':' + port, { reconnection: false })
	setupRoomSocket(roomSocket)
})

mainSocket.on('connect', () => {
	mainSocket.emit('verifyToken', token)
})

mainSocket.on('reg-success', (new_id, new_token, new_nickname) => {
	console.log('reg-success', new_id, new_token, new_nickname)
	token = new_token
	Cookies.set('token', token)
	console.log('Successfully registered at main')
})

mainSocket.on('reg-error', (error) => {
	console.log('reg-error', error)
	setUIState('login', error)
})

mainSocket.on('lobby-update', (data) => {
	console.log('lobby-update', data)
	setUIState('lobby')
	$('#players-form').find('h4').text('Room ' + (data.id + 1))
	data.users.forEach((user) => {
		var parent = !user.side ? $('#players-list-humans') : $('#players-list-virus')
		var element = $('#players-list-item > *').clone()
		element.prepend(user.username)
		if(user.ready) element.find('span').show()
		parent.append(element)
	})
})

mainSocket.on('lobbies-update', (data) => {
	console.log('lobbies-update', data)
	setUIState('lobby-select')
	data.forEach(function(lobby) {
		var element = $('#rooms-list-item > *').clone()
		element.prepend('Room ' + (lobby.id + 1))
		element.find('span').text((lobby.playersNumber).toString())
		if(lobby.startedTime >= 0) {
			element.addClass('active')
			element.find('span').removeClass('badge-primary')
			element.find('span').addClass('badge-light text-primary')
		}
		else {
			element.click(() => joinRoom(lobby.id))
		}
		$('#rooms-list').append(element)
	})
})

function setup() {
	var cookie_token = Cookies.get('token')
	setUIState('login')
}

setup()

function register() {
	var nickname = $('#login-input').val()
	mainSocket.emit('reg', nickname)
}

function joinRoom(roomId) {
	mainSocket.emit('joinRoom', token, roomId)
}

function leaveRoom() {
	mainSocket.emit('leaveRoom', token)
}

function userReady() {
	mainSocket.emit('userReady', token)
}

function changeSide(side) {
	mainSocket.emit('changeSide', token, side)
}
