var webSocketServer = require('websocket').server;
var http = require('http');
var express = require('express');

var webSocketSeverPort = 1337;
var app = express();

var sessions = [];

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
            switch (parsedMessage.messageType) {
                case 'createGame':
                    console.log('creating game!');
                    var sessionId = createGameId();
                    createSession(sessionId, connection);
                    //connection.sendUTF(JSON.stringify({ blah: 'createGame' }));
                    connection.sendUTF(JSON.stringify({ messageType: 'createGame', sessionId: sessionId }));
                    break;
                case 'joinGame':
                    var session = sessions[parsedMessage.sessionId];
                    if (session) {
                        session.players.push({ name: parsedMessage.name, connection: connection });
                        console.log('Player joined session:' + parsedMessage.sessionId + ' player count: ' + session.players.length);
                    }
                    break;
                case 'missionSelection':
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