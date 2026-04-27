// Cross-cutting flow helpers: scoring and game-over. Kept tiny and
// dependency-light so other modules can import without circular hazards.

import { showGameOverScreen, updateScore } from './ui.js';

export function addScore(state, amount) {
    state.score += amount;
    updateScore(state.score);
}

export function triggerGameOver(state) {
    if (state.isGameOver) return;
    state.isGameOver = true;
    state.controls.unlock();
    showGameOverScreen(state.score);
}
