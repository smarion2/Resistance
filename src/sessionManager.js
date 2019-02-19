var sessions = [];

exports.getSessionBySessionId = function (sessionId) {
    return sessions[sessionId];
}

exports.createNewSession = function (connection) {
    var sessionId = createSession(connection);
    return sessionId;
}

function createGameId() {
    return 'aaaa';
}

function createSession(server) {
    var sessionId = createGameId();
    sessions[sessionId] = {
        serverConnection: server,
        players: [],
        leaderToken: 0,
        roundNumber: 0,
        blueWins: 0,
        redWins: 0,
        missionVotes: 0,
        missionResults: 0
    };
    return sessionId;
}