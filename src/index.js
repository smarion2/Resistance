var webSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');

var webSocketSeverPort = 1337;
var app = express();

var sessions = [];
var leaderToken = 0;
app.use(express.static(__dirname));

app.listen(3000);

var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(webSocketSeverPort, function () {
    console.log(new Date() + " Server is listening on port " + webSocketSeverPort);
});

var wsServer = new webSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

wsServer.on('request', function (request) {
    var connection = request.accept('echo-protocol', request.origin);
    console.log(new Date() + ' Connection accepted.');

    connection.on('message', function (message) {
        var parsedMessage = JSON.parse(message.utf8Data);
        console.log('mesesage recieved ' + JSON.stringify(parsedMessage));
        if (message.type === 'utf8') {
            var session = sessions[parsedMessage.sessionId];
            switch (parsedMessage.messageType) {
                case 'createGame':
                    console.log('creating game!');
                    var sessionId = createGameId();
                    createSession(sessionId, connection);
                    connection.sendUTF(JSON.stringify({ messageType: 'createGame', sessionId: sessionId }));
                    break;
                case 'joinGame':
                    if (session) {
                        session.players.push({ name: parsedMessage.name, connection: connection });
                        var players = getPlayerNames(session.players);
                        console.log('Player joined session:' + parsedMessage.sessionId + ' player count: ' + session.players.length);
                        session.serverConnection.sendUTF(JSON.stringify({ messageType: 'updatePlayerList', players: players }));
                    }
                    break;
                case 'startGame':
                    var players = getPlayerNames(session.players);
                    assignPlayerRoles(players);
                    for (var player in session.players) {
                        session.players[player].connection.sendUTF(JSON.stringify({ messageType: 'startGame', players: players, role: session.players[player].role }));                        
                    }
                    session.players[leaderToken].connection.sendUTF(JSON.stringify({ messageType: 'selectMission' }));
                    break;
                case 'missionSelection':
                    var players = getPlayerNames(session.players);
                    for (var player in session.players) {
                        session.players[player].connection.sendUTF(JSON.stringify({ messageType: 'approveMission', selectedPlayers: parsedMessage.selectedPlayers }));
                    }
                    break;
                case 'missionVote':
                    break;
                case 'missionResult':
                    break;
            }
        }
        else {
            console.log(message.type);
        }
    });
});

function createGameId() {
    return 'aaaa';
}

function createSession(sessionId, server) {
    sessions[sessionId] = {
        serverConnection: server,
        players: [],
        gameState: 'newGame'
    };
}

function getPlayerNames(players) {
    var list = []
    for (var player in players) {
        list.push(players[player].name);
    }
    return list;
}

function assignPlayerRoles(players) {
    var roleChart = {
        5: [3, 2],
        6: [4, 2],
        7: [4, 3],
        8: [5, 3],
        9: [6, 3],
        10: [6, 4]
    };    
    var roles = roleChart[players.length];
    console.log('player Count ' + players.length + ' roles ' + JSON.stringify(roles) );
    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
    }
    var playerIndex = 0;
    for (var i = 0; i < roles[0]; i++) {
        players[i].role = 'blue';
        playerIndex++;
        console.log('Player ' + players[i].name + ' is blue');
    }
    for (var i = 0; i < roles[1]; i++) {
        players[i].role = 'red';
        playerIndex++;
        console.log('Player ' + players[i].name + ' is red');
    }
}