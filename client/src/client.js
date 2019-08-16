const IP = window.location.hostname
var MainSocket = undefined
var RoomSocket = undefined
var Token = undefined
var isInMain = true

function setUIState(state, error) {
	if (state == 'login') {
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
	else if (state == 'lobby-select') {
		$('#rooms-list').empty()
		$('#login-form').hide()
		$('#players-form').hide()
		$('#rooms-form').show()
	}
	else if (state == 'lobby') {
		$('#players-list-humans').empty()
		$('#players-list-virus').empty()
		$('#login-form').hide()
		$('#rooms-form').hide()
		$('#players-form').show()
		//$('#ready-button').removeClass('disabled')
	}
	else if (state == 'game') {
		$('#login-form').hide()
		$('#rooms-form').hide()
		$('#players-form').hide()
	}
}

//Utility function
function getCurrentSocket() {
	return (isInMain ? MainSocket : RoomSocket)
}

function setupRoomSocket(socket) {
	//When disconnects, force to connect to main server and not reconnect to the room
	socket.on('disconnect', () => {
		isInMain = true
		MainSocket.connect()
	})

	socket.on('connect', () => {
		socket.emit('verifyToken', Token)
	})

	socket.on('join-success', (roomId) => {
		console.log('Successfully connected to ' + roomId)
		setUIState('game')
		IsServerStarted = true
		enableGame()
	})

	socket.on('chunk', (info) => {
		GameMap.update(info)
	})
}

function setupMainSocket(socket) {
	//Connection logic
	//Responsible for switching from rooms and main server
	socket.on('reroute', (port) => {
		console.log('reroute', port)
		socket.disconnect()
		isInMain = false
		RoomSocket = io.connect(IP + ':' + port, { reconnection: false })
		setupRoomSocket(RoomSocket)
	})

	socket.on('connect', () => {
		socket.emit('verifyToken', Token)
	})

	socket.on('reg-success', (new_id, new_token, new_nickname) => {
		console.log('reg-success', new_id, new_token, new_nickname)
		Token = new_token
		Cookies.set('Token', Token)
		console.log('Successfully registered at main')
	})

	socket.on('reg-error', (error) => {
		console.log('reg-error', error)
		setUIState('login', error)
	})

	socket.on('lobby-update', (data) => {
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

	socket.on('lobbies-update', (data) => {
		console.log('lobbies-update', data)
		setUIState('lobby-select')
		data.forEach(function(lobby) {
			var element = $('#rooms-list-item > *').clone()
			element.prepend('Room ' + (lobby.id + 1))
			element.find('span').text((lobby.playersNumber).toString())
			if (lobby.startedTime >= 0) {
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
}

function setup() {
	Token = Cookies.get('Token')
	setUIState('login')
	MainSocket = io.connect(IP + ':' + window.location.port)
	setupMainSocket(MainSocket)
}

setup()

function register() {
	var nickname = $('#login-input').val()
	MainSocket.emit('reg', nickname)
}

function joinRoom(roomId) {
	MainSocket.emit('joinRoom', Token, roomId)
}

function leaveRoom() {
	MainSocket.emit('leaveRoom', Token)
}

function userReady() {
	MainSocket.emit('userReady', Token)
}

function changeSide(side) {
	MainSocket.emit('changeSide', Token, side)
}

//Starts the game
function enableGame() {
	if (IsServerStarted && IsPixiLoaded) {
		IsGameActive = true
		ScreenScene.addChild(GameScene)
		frame()
	}
}