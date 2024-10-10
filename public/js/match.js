// User Settings
const gameLength = 90000; // Total duration of the game in milliseconds
let speed = 10; // Speed of game updates
let matchInfo; // Stores information about the current match
let iterations = 0; // Tracks the number of iterations (time intervals in the match)
let logs = ""; // Stores the game logs for display
let loggingON = false; // Flag to toggle logging display
let isPaused = false; // Flag to track if the game is paused
let currentPositions = []; // Store current player positions for smooth interpolation

// Offscreen canvas for double buffering
let offscreenCanvas = document.createElement('canvas');
let offscreenCtx = offscreenCanvas.getContext('2d');

function startMatch() {
	setPositions(); // Initialize player positions when the match starts
}

function setPositions() {
	// Fetch initial positions from the server
	fetchData("/getstartPOS", result => {
		const canvas = document.getElementById("map"); // Get the canvas element for the game field
		const ctx = canvas.getContext("2d"); // Get the drawing context of the canvas

		offscreenCanvas.width = result[0]; // Set off-screen canvas size
		offscreenCanvas.height = result[1];

		canvas.width = result[0]; // Set visible canvas size
		canvas.height = result[1];

		currentPositions = result.slice(2, result.length - 1); // Store initial positions for interpolation

		drawPlayers(offscreenCtx, result); // Draw players on the off-screen canvas
		ctx.drawImage(offscreenCanvas, 0, 0); // Copy off-screen content to the visible canvas

		matchInfo = result[result.length - 1]; // Extract the match info from the last item in the result array
		updateResultDisplay(matchInfo); // Update the result display with the current match status
	});
}

function pauseGame() {
	isPaused = true; // Set the game to paused
}

function playGame() {
	isPaused = false; // Resume the game
	getMatch(); // Start fetching and updating match data
}

function getMatch() {
	// Recursive animation loop using requestAnimationFrame
	function updateFrame() {
		if (isPaused) return; // Stop if paused

		if (iterations === gameLength / 2) { // Check if it's halftime
			switchSides(); // Switch sides for the teams
		} else if (iterations > gameLength) { // End the game if the game length is exceeded
			return; // Stop the game after it ends
		} else {
			movePlayers("/movePlayers"); // Move players and update game state
			requestAnimationFrame(updateFrame); // Continue the animation
		}
	}
	requestAnimationFrame(updateFrame); // Start the first frame
}

function movePlayers(endpoint) {
	// Fetch the updated player positions from the server
	fetchData(endpoint, result => {
		iterations++; // Increment iteration counter
		const canvas = document.getElementById("map"); // Get the canvas element
		const ctx = canvas.getContext("2d"); // Get the canvas drawing context

		let progress = 0; // Initialize animation progress
		let duration = 200; // milliseconds for movement animation
		let currentPositions = []; // Store current positions

		// Initialize current positions if empty (for first frame)
		if (!currentPositions.length) {
			for (let i = 2; i < result.length - 1; i++) {
				currentPositions.push(result[i]); // Fill in current positions with initial data
			}
		}

		// Interpolation function for smooth transition
		function interpolatePosition(start, end, factor) {
			return start + (end - start) * factor; // Linear interpolation
		}

		function animate() {
			ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire canvas

			// Interpolate positions and draw players
			for (let i = 2; i < result.length - 1; i++) {
				let startX = currentPositions[i - 2]; // Current X position
				let startY = currentPositions[i - 1]; // Current Y position
				let endX = result[i]; // New X position
				let endY = result[i + 1]; // New Y position

				// Interpolating positions based on progress
				let x = interpolatePosition(startX, endX, progress / duration);
				let y = interpolatePosition(startY, endY, progress / duration);

				// Draw the player with enhanced design
				ctx.beginPath();
				ctx.arc(x, y, 15, 0, 2 * Math.PI); // Player's body (circle)
				ctx.fillStyle = i < 24 ? "red" : i > 12 && i < result.length - 3 ? "blue" : "white";
				ctx.fill();

				// Draw player's head (small circle)
				ctx.beginPath();
				ctx.arc(x, y - 10, 5, 0, 2 * Math.PI); // Head above the body
				ctx.fillStyle = "black"; // Head color
				ctx.fill();
				i++; // Move to next set of coordinates (skip y coordinate)
			}

			// Draw the ball (also animated)
			let ballX = interpolatePosition(currentPositions[result.length - 3], result[result.length - 3], progress / duration);
			let ballY = interpolatePosition(currentPositions[result.length - 2], result[result.length - 2], progress / duration);

			ctx.beginPath();
			ctx.arc(ballX, ballY, 8, 0, 2 * Math.PI); // Ball
			ctx.fillStyle = "white"; // Ball color
			ctx.fill();
			ctx.strokeStyle = "black"; // Ball outline
			ctx.lineWidth = 2;
			ctx.stroke();

			// Optionally, add black patches on the ball
			for (let angle = 0; angle < 360; angle += 60) {
				let patchX = ballX + Math.cos(angle * Math.PI / 180) * 5;
				let patchY = ballY + Math.sin(angle * Math.PI / 180) * 5;
				ctx.beginPath();
				ctx.arc(patchX, patchY, 2, 0, 2 * Math.PI); // Small patches
				ctx.fillStyle = "black";
				ctx.fill();
			}

			// Update the progress and request the next frame until animation completes
			progress += 16; // Increment progress (~16ms per frame for 60fps)
			if (progress < duration) {
				requestAnimationFrame(animate); // Continue the animation
			} else {
				// Update current positions once the animation completes
				currentPositions = result.slice(2, result.length - 1); // Store new positions

				matchInfo = result[result.length - 1]; // Extract match info
				updateResultDisplay(matchInfo, iterations); // Update match info
				logs += `Iteration ${iterations}: ${matchInfo.iterationLog}<br>`; // Append log for this iteration

				// Update the log display if logging is enabled
				if (loggingON) {
					updateLoggingDisplay(logs);
				}
			}
		}

		animate(); // Start the animation
	});
}

function switchSides() {
	iterations++; // Increment iteration counter for switching sides
	// Fetch the new positions after switching sides
	fetchData("/startSecondHalf", result => {
		const canvas = document.getElementById("map"); // Get the canvas element
		const ctx = canvas.getContext("2d"); // Get the canvas drawing context

		offscreenCanvas.width = result[0]; // Update off-screen canvas size
		offscreenCanvas.height = result[1];

		canvas.width = result[0]; // Update visible canvas size
		canvas.height = result[1];

		currentPositions = result.slice(2, result.length - 1); // Store new positions

		drawPlayers(offscreenCtx, result); // Draw players in new positions on the off-screen canvas
		ctx.drawImage(offscreenCanvas, 0, 0); // Copy to visible canvas

		matchInfo = result[result.length - 1]; // Update match info after the switch
		updateResultDisplay(matchInfo); // Update the result display
	});
}

function showLogs() {
	const logElement = document.getElementById("logging"); // Get the logging element
	loggingON = logElement.style.display === "none"; // Toggle logging display
	logElement.style.display = loggingON ? "block" : "none"; // Show or hide the logging display
}

function getMatchDetails() {
	// Fetch match details from the server (if needed)
	fetchData("/getMatchDetails");
}

// Helper Functions
function fetchData(endpoint, callback) {
	const http = new XMLHttpRequest(); // Create a new XMLHttpRequest object
	http.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			callback && callback(JSON.parse(this.responseText)); // Execute the callback with the parsed response if successful
		}
	};
	http.open("GET", endpoint, true); // Initialize a GET request to the provided endpoint
	http.send(); // Send the request
}

function drawPlayers(ctx, result) {
	// Loop through the player positions in the result array and draw them
	for (let i = 2; i < result.length - 1; i++) {
		let x = result[i]; // x-coordinate
		let y = result[i + 1]; // y-coordinate

		ctx.beginPath(); // Start a new drawing path

		// Draw a player as a circle with some styling
		ctx.arc(x, y, 15, 0, 2 * Math.PI); // Player's body (increased radius for visibility)
		ctx.fillStyle = i < 24 ? "red" : i > 12 && i < result.length - 3 ? "blue" : "white"; // Team color
		ctx.fill();

		// Draw a player's head (smaller circle on top of the body)
		ctx.beginPath();
		ctx.arc(x, y - 10, 5, 0, 2 * Math.PI); // Head (smaller circle)
		ctx.fillStyle = "black"; // Head color (white)
		ctx.fill();
		i++; // Skip the next index as it represents y-coordinates
	}

	// Draw the ball (smaller and distinct)
	let ballX = result[result.length - 3]; // Ball x-coordinate
	let ballY = result[result.length - 2]; // Ball y-coordinate

	ctx.beginPath();
	ctx.arc(ballX, ballY, 8, 0, 2 * Math.PI); // Ball with smaller radius
	ctx.fillStyle = "white"; // Ball color
	ctx.fill();
	ctx.strokeStyle = "black"; // Ball outline
	ctx.lineWidth = 2; // Line thickness
	ctx.stroke();

	// Optionally, add black hexagon-like patches for the ball's design
	for (let angle = 0; angle < 360; angle += 60) {
		let patchX = ballX + Math.cos(angle * Math.PI / 180) * 5;
		let patchY = ballY + Math.sin(angle * Math.PI / 180) * 5;
		ctx.beginPath();
		ctx.arc(patchX, patchY, 2, 0, 2 * Math.PI); // Draw small patches
		ctx.fillStyle = "black"; // Patch color
		ctx.fill();
	}
}


function updateResultDisplay(matchInfo, iteration = "") {
	// Update the result display with the current match score and iteration number
	document.getElementById("result").innerHTML =
		`( ${matchInfo.kickOffTeamStatistics.goals} ) ${matchInfo.kickOffTeam.name}  : Moves - ( ${iteration} ) : ${matchInfo.secondTeam.name} ( ${matchInfo.secondTeamStatistics.goals} )`;
}

function updateLoggingDisplay(logs) {
	const logElement = document.getElementById("logging"); // Get the logging element
	logElement.innerHTML = logs; // Update the inner HTML with the logs
	logElement.scrollTop = logElement.scrollHeight; // Auto-scroll to the bottom of the log
}

function interpolatePosition(start, end, progress) {
	return start + (end - start) * progress; // Simple linear interpolation
}
