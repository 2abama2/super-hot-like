import * as THREE from 'three';

import { CAMERA, PLAYER, WORLD } from './src/config.js';
import { createGameState } from './src/state.js';
import { createLevel1 } from './src/level.js';
import { createPlayer, attachWeapon, setupControls, updatePlayerMovement } from './src/player.js';
import { updateEnemies } from './src/enemies.js';
import { updateBullets } from './src/bullets.js';
import { updateWorldEntities } from './src/effects.js';
import { computeGameDelta } from './src/time.js';
import {
    bindMenuButtons,
    hideGameOverScreen,
    hideStartScreen,
    showStartScreen,
    updateScore,
} from './src/ui.js';

const state = createGameState();
const player = createPlayer();

initScene();
initCamera();
initRenderer();
createLevel1(state);
attachWeapon(state.camera, player);
state.scene.add(state.camera);

setupControls(state, player, onWindowResize);
bindMenuButtons(startGame);

state.controls.addEventListener('lock', () => {
    hideStartScreen();
    hideGameOverScreen();
});
state.controls.addEventListener('unlock', () => {
    if (!state.isGameOver) showStartScreen();
});

requestAnimationFrame(animate);

function initScene() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(WORLD.BACKGROUND);
    state.scene.fog = new THREE.Fog(WORLD.BACKGROUND, WORLD.FOG_NEAR, WORLD.FOG_FAR);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(20, 50, 20);
    dir.castShadow = true;
    dir.shadow.camera.top = 50;
    dir.shadow.camera.bottom = -50;
    dir.shadow.camera.left = -50;
    dir.shadow.camera.right = 50;
    state.scene.add(dir);
}

function initCamera() {
    state.camera = new THREE.PerspectiveCamera(
        CAMERA.FOV_DEFAULT,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
    );
    state.camera.position.y = PLAYER.EYE_HEIGHT;
}

function initRenderer() {
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(state.renderer.domElement);
}

function startGame() {
    state.isGameOver = false;
    state.score = 0;
    updateScore(state.score);

    state.camera.position.set(0, PLAYER.EYE_HEIGHT, 0);
    player.velocity.set(0, 0, 0);

    // Drop any leftover entities from a previous run.
    for (const e of state.enemies) state.scene.remove(e.mesh);
    for (const b of state.playerBullets) state.scene.remove(b.mesh);
    for (const b of state.enemyBullets) state.scene.remove(b.mesh);
    state.enemies.length = 0;
    state.playerBullets.length = 0;
    state.enemyBullets.length = 0;

    state.controls.lock();
}

function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateCameraFOV() {
    const target = player.moveState.shift ? CAMERA.FOV_SPRINT : CAMERA.FOV_DEFAULT;
    if (state.camera.fov !== target) {
        state.camera.fov += (target - state.camera.fov) * CAMERA.FOV_LERP;
        state.camera.updateProjectionMatrix();
    }
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const rawDelta = Math.min((time - state.lastTime) / 1000, 0.1);
    state.lastTime = time;

    if (!state.controls.isLocked || state.isGameOver) {
        state.renderer.render(state.scene, state.camera);
        return;
    }

    const gameDelta = computeGameDelta(state, player, rawDelta);

    // Player input runs at real-time so controls stay snappy.
    updatePlayerMovement(state, player, rawDelta);
    updateCameraFOV();

    // World logic uses the (possibly very slow) game delta.
    updateEnemies(state, gameDelta);
    updateBullets(state, gameDelta);
    updateWorldEntities(state, gameDelta, player);

    state.renderer.render(state.scene, state.camera);
}
