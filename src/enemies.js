import * as THREE from 'three';

import { BULLET, ENEMY, ENEMY_TYPES, WORLD } from './config.js';
import { triggerGameOver } from './gameflow.js';

const _dir = new THREE.Vector3();

function speedFor(type) {
    return type === ENEMY_TYPES.MELEE ? ENEMY.MELEE_SPEED : ENEMY.RANGED_SPEED;
}

export function spawnEnemy(state, x, z, type = ENEMY_TYPES.MELEE) {
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 2, 8),
        new THREE.MeshStandardMaterial({ color: WORLD.ENEMY_COLOR }),
    );
    mesh.position.set(x, 1, z);
    state.scene.add(mesh);

    if (type === ENEMY_TYPES.SLUGGER) {
        const weapon = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 1.2, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x000000 }),
        );
        weapon.position.set(0.6, 0, -0.5);
        mesh.add(weapon);
    }

    state.enemies.push({
        mesh,
        type,
        speed: speedFor(type),
        shootCooldown: 2.0,
        hitRadius: ENEMY.HIT_RADIUS,
    });
}

function shootShotgun(state, startPos, targetPos) {
    const baseDir = _dir.subVectors(targetPos, startPos).normalize();

    for (let i = 0; i < BULLET.SHOTGUN_PELLETS; i++) {
        const spread = BULLET.SHOTGUN_SPREAD;
        const pelletDir = baseDir.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
        )).normalize();

        const bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshBasicMaterial({ color: WORLD.BULLET_ENEMY_COLOR }),
        );
        bullet.position.copy(startPos);
        state.scene.add(bullet);
        state.enemyBullets.push({
            mesh: bullet,
            velocity: pelletDir.multiplyScalar(BULLET.SHOTGUN_SPEED),
            life: BULLET.SHOTGUN_LIFE,
        });
    }
}

export function updateEnemies(state, gameDelta) {
    const playerPos = state.camera.position;

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        const dist = e.mesh.position.distanceTo(playerPos);

        e.mesh.lookAt(playerPos.x, 1, playerPos.z);
        _dir.subVectors(playerPos, e.mesh.position).normalize();

        if (e.type === ENEMY_TYPES.MELEE || e.type === ENEMY_TYPES.SLUGGER) {
            e.mesh.position.addScaledVector(_dir, e.speed * gameDelta);
            if (dist < e.hitRadius) triggerGameOver(state);
        } else if (e.type === ENEMY_TYPES.SHOTGUNGER || e.type === ENEMY_TYPES.SHOOTER) {
            if (dist > ENEMY.SHOTGUNNER_RANGE) {
                e.mesh.position.addScaledVector(_dir, e.speed * gameDelta);
            }
            e.shootCooldown -= gameDelta;
            if (e.shootCooldown <= 0) {
                shootShotgun(state, e.mesh.position, playerPos);
                e.shootCooldown = ENEMY.SHOTGUNNER_RELOAD;
            }
        }
    }
}
