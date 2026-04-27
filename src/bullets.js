import * as THREE from 'three';

import { BULLET, ENEMY, PLAYER, WORLD } from './config.js';
import { addScore, triggerGameOver } from './gameflow.js';

const _obsBox = new THREE.Box3();

function hitsObstacle(bullet, obstacles) {
    for (const obs of obstacles) {
        _obsBox.setFromObject(obs);
        if (_obsBox.containsPoint(bullet.mesh.position)) return true;
    }
    return false;
}

function destroyBullet(state, array, index, bullet) {
    state.scene.remove(bullet.mesh);
    array.splice(index, 1);
}

export function spawnPlayerBullet(state, player) {
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: WORLD.BULLET_PLAYER_COLOR }),
    );

    const weaponWorldPos = new THREE.Vector3();
    if (player.weapon) player.weapon.getWorldPosition(weaponWorldPos);
    else weaponWorldPos.copy(state.camera.position);
    bullet.position.copy(weaponWorldPos);

    const direction = new THREE.Vector3();
    state.camera.getWorldDirection(direction);

    state.scene.add(bullet);
    state.playerBullets.push({
        mesh: bullet,
        velocity: direction.multiplyScalar(BULLET.PLAYER_SPEED),
        life: BULLET.PLAYER_LIFE,
    });
}

function stepBullet(bullet, gameDelta) {
    bullet.mesh.position.addScaledVector(bullet.velocity, gameDelta);
    bullet.life -= gameDelta;
}

function updatePlayerBullets(state, gameDelta) {
    const arr = state.playerBullets;
    for (let i = arr.length - 1; i >= 0; i--) {
        const b = arr[i];
        stepBullet(b, gameDelta);

        if (hitsObstacle(b, state.obstacles)) {
            destroyBullet(state, arr, i, b);
            continue;
        }

        let consumed = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
            const enemy = state.enemies[j];
            if (b.mesh.position.distanceTo(enemy.mesh.position) < BULLET.HIT_RADIUS) {
                state.scene.remove(enemy.mesh);
                state.enemies.splice(j, 1);
                addScore(state, ENEMY.SCORE_SHOT);
                consumed = true;
                break;
            }
        }

        if (consumed || b.life <= 0) destroyBullet(state, arr, i, b);
    }
}

function updateEnemyBullets(state, gameDelta) {
    const arr = state.enemyBullets;
    for (let i = arr.length - 1; i >= 0; i--) {
        const b = arr[i];
        stepBullet(b, gameDelta);

        if (hitsObstacle(b, state.obstacles)) {
            destroyBullet(state, arr, i, b);
            continue;
        }

        if (b.mesh.position.distanceTo(state.camera.position) < PLAYER.RADIUS) {
            destroyBullet(state, arr, i, b);
            triggerGameOver(state);
            continue;
        }

        if (b.life <= 0) destroyBullet(state, arr, i, b);
    }
}

export function updateBullets(state, gameDelta) {
    updatePlayerBullets(state, gameDelta);
    updateEnemyBullets(state, gameDelta);
}
