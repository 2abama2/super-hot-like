import * as THREE from 'three';

import { BULLET, ENEMY, FX, WORLD } from './config.js';
import { addScore } from './gameflow.js';

export function shatterEnemy(state, position) {
    for (let i = 0; i < FX.SHATTER_FRAGMENTS; i++) {
        const shard = new THREE.Mesh(
            new THREE.TetrahedronGeometry(Math.random() * 0.3 + 0.1),
            new THREE.MeshBasicMaterial({ color: WORLD.SHARD_COLOR }),
        );
        shard.position.copy(position);

        state.fragments.push({
            mesh: shard,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 10,
                (Math.random() - 0.5) * 10,
            ),
            rotation: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
            life: FX.SHATTER_LIFE,
        });
        state.scene.add(shard);
    }
}

function updateFragments(state, gameDelta) {
    const arr = state.fragments;
    for (let i = arr.length - 1; i >= 0; i--) {
        const f = arr[i];
        f.velocity.y -= FX.GRAVITY * gameDelta;
        f.mesh.position.addScaledVector(f.velocity, gameDelta);
        f.mesh.rotation.x += f.rotation.x * 5 * gameDelta;
        f.life -= gameDelta;
        if (f.life <= 0) {
            state.scene.remove(f.mesh);
            arr.splice(i, 1);
        }
    }
}

function updateThrownWeapons(state, gameDelta) {
    const arr = state.thrownWeapons;
    for (let i = arr.length - 1; i >= 0; i--) {
        const tw = arr[i];
        tw.mesh.position.addScaledVector(tw.velocity, gameDelta);
        tw.mesh.rotation.x += tw.rotation.x * gameDelta;

        // Knock down enemies on contact.
        for (let j = state.enemies.length - 1; j >= 0; j--) {
            if (tw.mesh.position.distanceTo(state.enemies[j].mesh.position) < BULLET.HIT_RADIUS) {
                shatterEnemy(state, state.enemies[j].mesh.position);
                state.scene.remove(state.enemies[j].mesh);
                state.enemies.splice(j, 1);
                addScore(state, ENEMY.SCORE_THROWN);
            }
        }

        // Slap enemy bullets out of the air.
        for (let k = state.enemyBullets.length - 1; k >= 0; k--) {
            if (tw.mesh.position.distanceTo(state.enemyBullets[k].mesh.position) < 0.6) {
                state.scene.remove(state.enemyBullets[k].mesh);
                state.enemyBullets.splice(k, 1);
                tw.velocity.multiplyScalar(0.5);
            }
        }

        tw.life -= gameDelta;
        if (tw.life <= 0) {
            state.scene.remove(tw.mesh);
            arr.splice(i, 1);
        }
    }
}

export function updateWorldEntities(state, gameDelta, player) {
    updateFragments(state, gameDelta);
    updateThrownWeapons(state, gameDelta);
    player.tickWeaponCooldown(gameDelta);
}
