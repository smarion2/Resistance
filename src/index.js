var webSocketServer = require('websocket').server;
var gameManager = require('./gameManager.js');
var http = require('http');
var express = require('express');

var webSocketSeverPort = 1337;
var app = express();

app.use(express.static(__dirname));

app.listen(3000);

var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(webSocketSeverPort, function () {
    console.log(new Date() + ' Server is listening on port ' + webSocketSeverPort);
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
                case 'reconnect':
                    gameManager.reconnectToGame(parsedMessage.userInfo, connection);
                    break;
                case 'createGame':
                    gameManager.createNewGame(connection);
                    break;
                case 'joinGame':
                    gameManager.joinGame(parsedMessage, connection);
                    break;
                case 'startGame':
                    var sessionId = parsedMessage.sessionId;
                    gameManager.startGame(sessionId);
                    gameManager.assignMissionLeader(sessionId);
                    break;
                case 'missionSelection':
                    gameManager.submitMissionSelection(parsedMessage);
                    break;
                case 'missionVote':
                    gameManager.registerVote(parsedMessage);
                    break;
                case 'missionResult':
                    gameManager.registerResult(parsedMessage);
                    break;
            }
        }
        else {
            console.log(message.type);
        }
    });
});