// All DOM lookups in one place so the rest of the code never touches `document`.

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScore = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

export function bindMenuButtons(onStart) {
    startBtn.addEventListener('click', onStart);
    restartBtn.addEventListener('click', onStart);
}

export function showStartScreen() {
    startScreen.classList.remove('hidden');
}

export function hideStartScreen() {
    startScreen.classList.add('hidden');
}

export function hideGameOverScreen() {
    gameOverScreen.classList.add('hidden');
}

export function showGameOverScreen(score) {
    finalScore.innerText = `Final Score: ${score}`;
    gameOverScreen.classList.remove('hidden');
}

export function updateScore(score) {
    scoreDisplay.innerText = `Score: ${score}`;
}
