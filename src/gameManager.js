exports.createNewGame = function (sessions, connection) {
    console.log('Creating new game');
    var sessionId = createGameId();
    createSession(sessions, sessionId, connection);
    connection.sendUTF(JSON.stringify({ messageType: 'createGame', sessionId: sessionId }));
}

function createGameId() {
    return 'aaaa';
}

function createSession(sessions, sessionId, server) {
    sessions[sessionId] = {
        serverConnection: server,
        players: [],
        gameState: 'newGame',
        roundNumber: 0,
        blueWins: 0,
        redWins: 0
    };
}