// User Settings
const gameLength = 120000;
let speed = 0;
let matchInfo;
let its = 0;
let logs = "";
let loggingON = false;
let isPaused = false;

function startMatch() {
	setPositions();
}

function setPositions() {
	fetchData("/getstartPOS", result => {
		const canvas = document.getElementById("map");
		const ctx = canvas.getContext("2d");

		ctx.canvas.width = result[0];
		ctx.canvas.height = result[1];

		drawPlayers(ctx, result);

		matchInfo = result[result.length - 1];
		updateResultDisplay(matchInfo);
	});
}

function pauseGame() {
	isPaused = true;
}

function playGame() {
	isPaused = false;
	getMatch();
}

function getMatch() {
	const interval = setInterval(() => {
		if (isPaused) {
			clearInterval(interval);
		} else if (its === gameLength / 2) {
			clearInterval(interval);
			switchSides();
			console.log("Switched sides");
		} else if (its > gameLength) {
			clearInterval(interval);
		} else {
			movePlayers("/movePlayers");
		}
	}, speed);
}

function movePlayers(endpoint) {
	fetchData(endpoint, result => {
		its++;
		const canvas = document.getElementById("map");
		const ctx = canvas.getContext("2d");

		ctx.canvas.width = result[0];
		ctx.canvas.height = result[1];

		drawPlayers(ctx, result);

		matchInfo = result[result.length - 1];
		logs += `Iteration ${its}: ${matchInfo.iterationLog}<br>`;

		if (loggingON) {
			updateLoggingDisplay(logs);
		}

		updateResultDisplay(matchInfo, its);
	});
}

function switchSides() {
	its++;
	fetchData("/startSecondHalf", result => {
		const canvas = document.getElementById("map");
		const ctx = canvas.getContext("2d");

		ctx.canvas.width = result[0];
		ctx.canvas.height = result[1];

		drawPlayers(ctx, result);

		matchInfo = result[result.length - 1];
		updateResultDisplay(matchInfo);
	});
}

function showLogs() {
	const logElement = document.getElementById("logging");
	loggingON = logElement.style.display === "none";
	logElement.style.display = loggingON ? "block" : "none";
}

function getMatchDetails() {
	fetchData("/getMatchDetails");
}

// Helper Functions
function fetchData(endpoint, callback) {
	const http = new XMLHttpRequest();
	http.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			callback && callback(JSON.parse(this.responseText));
		}
	};
	http.open("GET", endpoint, true);
	http.send();
}

function drawPlayers(ctx, result) {
	for (let i = 2; i < result.length - 1; i++) {
		ctx.beginPath();
		ctx.arc(result[i], result[i + 1], 10, 0, 2 * Math.PI);

		ctx.fillStyle = i < 24 ? "red" : i > 12 && i < result.length - 3 ? "blue" : "lime";
		ctx.fill();
		i++;
	}
	ctx.moveTo(result[result.length - 3], result[result.length - 2]);
	ctx.lineTo(result[result.length - 3] + 1, result[result.length - 2] + 1);
	ctx.stroke();
}

function updateResultDisplay(matchInfo, iteration = "") {
	document.getElementById("result").innerHTML =
		`${matchInfo.kickOffTeam.name}: ${matchInfo.kickOffTeamStatistics.goals} - ` +
		`${matchInfo.secondTeamStatistics.goals} : ${matchInfo.secondTeam.name} Moves(${iteration})`;
}

function updateLoggingDisplay(logs) {
	const logElement = document.getElementById("logging");
	logElement.innerHTML = logs;
	logElement.scrollTop = logElement.scrollHeight;
}
