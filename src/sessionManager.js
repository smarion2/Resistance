let sessions = [];

exports.getSessionBySessionId = function (sessionId) {
    return sessions[sessionId];
}

exports.deleteSessionBySessionId = function(sessionId) {
    delete sessions.sessionId;
}

exports.createNewSession = function (connection) {
    let sessionId = createSession(connection);
    return sessionId;
}

exports.resetWhoGoesOnMission = function (sessionId) {
    let session = sessions[sessionId];
    if (session) {
        for (let player in session.players) {
            if (session.players[player].isOnMission) {
                session.players[player].isOnMission = false;
            }
        }
    }
}

exports.resetMissionSelectionVotes = function (sessionId) {
    let session = sessions[sessionId];
    if (session) {
        for (let player in session.players) {
            session.players[player].approvedMission = null;
        }
    }
}

exports.resetSubmittedMissionResult = function (sessionId) {
    let session = sessions[sessionId];
    if (session) {
        for (let player in session.players) {
            session.players[player].hasSubmitMissionResults = false;
        }
    }
}

exports.resetSelectedPlayers = function (sessionId) {
    let session = sessions[sessionId];
    if (session) {
        session.selectedPlayers = null;
    }
}

exports.resetMissionLeader = function (sessionId) {
    let session = sessions[sessionId];
    if (session) {
        for (let player in session.players) {
            session.players[player].isMissionLeader = false;
        }
    }
}

function createGameId() {
    let result = '';
    let characters  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < 4; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function createSession(server) {
    let sessionId = createGameId();
    sessions[sessionId] = {
        serverConnection: server,
        players: [],
        gameState: 'preGame',
        leaderToken: 0,
        roundNumber: 0,
        blueWins: 0,
        redWins: 0,
        leaderVoteFailCount: 0,
        missionVotes: 0,
        missionResults: [],
        missionPasses: 0,
        missionFails: 0
    };
    return sessionId;
}