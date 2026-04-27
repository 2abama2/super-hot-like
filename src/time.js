// SUPERHOT-style time controller. Time crawls at MIN_SCALE while the player
// stands still and accelerates toward MAX_SCALE when they move, sprint, look,
// or act.

import { TIME } from './config.js';

export function computeGameDelta(state, player, rawDelta) {
    const { moveState } = player;
    const isMoving = moveState.forward || moveState.backward
        || moveState.left || moveState.right;
    const isRunning = isMoving && moveState.shift;

    let target = TIME.MIN_SCALE;
    if (isRunning) {
        target = TIME.RUNNING_SCALE;
    } else if (isMoving) {
        target = TIME.MAX_SCALE;
    } else if (state.actionTimer > 0.15) {
        target = TIME.MAX_SCALE;
    } else if (state.mouseMovementFactor > 0.01) {
        target = Math.max(TIME.MIN_SCALE, state.mouseMovementFactor);
    }

    state.mouseMovementFactor *= TIME.MOUSE_DECAY;
    if (state.actionTimer > 0) state.actionTimer -= rawDelta;

    state.timeScale += (target - state.timeScale) * TIME.SMOOTHING * rawDelta;
    return rawDelta * state.timeScale;
}
