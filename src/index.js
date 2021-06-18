let webSocketServer = require('websocket').server;
let gameManager = require('./gameManager.js');
let http = require('http');
let express = require('express');

let webSocketSeverPort = 1338;
let app = express();

app.use(express.static(__dirname));

app.listen(3000);

let server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(webSocketSeverPort, function () {
    console.log(new Date() + ' Server is listening on port ' + webSocketSeverPort);
});

let wsServer = new webSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

wsServer.on('request', function (request) {
    let connection = request.accept('echo-protocol', request.origin);
    console.log(new Date() + ' Connection accepted.');
    connection.on('message', function (message) {
        let parsedMessage = JSON.parse(message.utf8Data);
        if (parsedMessage.sessionId) {
            parsedMessage.sessionId = parsedMessage.sessionId.toUpperCase();;
        }
        console.log(new Date() + ' Mesesage recieved: ' + JSON.stringify(parsedMessage));
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
                    let sessionId = parsedMessage.sessionId;
                    gameManager.startGame(sessionId);
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
            console.log(new Date() + " Wtf is this: " + message.type);
        }
    });
});