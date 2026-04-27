import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

import { ARENA, FX, PLAYER, TIME, WORLD } from './config.js';
import { spawnPlayerBullet } from './bullets.js';

export function createPlayer() {
    return {
        speed: PLAYER.SPEED,
        velocity: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        radius: PLAYER.RADIUS,
        weapon: null,
        ammo: PLAYER.MAX_AMMO,
        weaponCooldown: 0,
        moveState: {
            forward: false,
            backward: false,
            left: false,
            right: false,
            shift: false,
        },

        tickWeaponCooldown(gameDelta) {
            if (this.weaponCooldown > 0) {
                this.weaponCooldown -= gameDelta;
                if (this.weaponCooldown <= 0) {
                    this.weapon.visible = true;
                    this.ammo = PLAYER.MAX_AMMO;
                }
            }
        },
    };
}

export function attachWeapon(camera, player) {
    const weapon = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.8),
        new THREE.MeshStandardMaterial({ color: WORLD.WEAPON_COLOR }),
    );
    weapon.position.set(0.4, -0.3, -0.6);
    weapon.castShadow = true;
    camera.add(weapon);
    player.weapon = weapon;
}

export function setupControls(state, player, onResize) {
    state.controls = new PointerLockControls(state.camera, document.body);
    document.addEventListener('keydown', e => onKeyDown(e, player.moveState));
    document.addEventListener('keyup', e => onKeyUp(e, player.moveState));
    document.addEventListener('mousedown', e => onMouseClick(e, state, player));
    document.addEventListener('mousemove', e => onMouseMove(e, state));
    window.addEventListener('resize', onResize);
}

function onKeyDown(event, moveState) {
    switch (event.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'ShiftLeft': moveState.shift = true; break;
    }
}

function onKeyUp(event, moveState) {
    switch (event.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyD': moveState.right = false; break;
        case 'ShiftLeft': moveState.shift = false; break;
    }
}

function onMouseMove(event, state) {
    if (!state.controls.isLocked) return;
    const movement = Math.abs(event.movementX) + Math.abs(event.movementY);
    state.mouseMovementFactor = Math.min(movement * TIME.MOUSE_TO_TIME, TIME.MOUSE_TO_TIME_MAX);
    state.actionTimer = TIME.LOOK_GRACE;
}

function tryThrowNearbyBall(state) {
    let picked = null;
    for (const obj of state.throwableObjects) {
        if (state.camera.position.distanceTo(obj.mesh.position) < FX.PICKUP_RANGE) {
            picked = obj;
            break;
        }
    }
    if (!picked) return false;

    const dir = new THREE.Vector3();
    state.camera.getWorldDirection(dir);

    state.thrownWeapons.push({
        mesh: picked.mesh,
        velocity: dir.multiplyScalar(FX.THROWN_BALL_SPEED),
        rotation: new THREE.Vector3(Math.random(), Math.random(), 5),
        life: FX.THROWN_BALL_LIFE,
    });
    state.throwableObjects = state.throwableObjects.filter(o => o !== picked);
    state.actionTimer = TIME.THROW_GRACE;
    return true;
}

function throwWeapon(state, player) {
    if (!player.weapon.visible) return;

    const weaponPos = new THREE.Vector3();
    player.weapon.getWorldPosition(weaponPos);
    const direction = new THREE.Vector3();
    state.camera.getWorldDirection(direction);

    const thrown = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.8),
        new THREE.MeshStandardMaterial({ color: WORLD.WEAPON_COLOR }),
    );
    thrown.position.copy(weaponPos);
    thrown.lookAt(weaponPos.clone().add(direction));
    state.scene.add(thrown);

    state.thrownWeapons.push({
        mesh: thrown,
        velocity: direction.multiplyScalar(FX.THROWN_WEAPON_SPEED),
        rotation: new THREE.Vector3(Math.random() * 10, Math.random() * 10, 2),
        life: FX.THROWN_WEAPON_LIFE,
    });

    player.weapon.visible = false;
    player.weaponCooldown = PLAYER.WEAPON_COOLDOWN;
    player.ammo = 0;
}

function onMouseClick(event, state, player) {
    if (!state.controls.isLocked || state.isGameOver) return;

    if (tryThrowNearbyBall(state)) return;

    if (event.button === 0 && player.ammo > 0) {
        spawnPlayerBullet(state, player);
        player.ammo--;
        state.actionTimer = TIME.SHOOT_GRACE;
    } else {
        throwWeapon(state, player);
        state.actionTimer = TIME.THROW_GRACE;
    }
}

export function updatePlayerMovement(state, player, rawDelta) {
    const { moveState } = player;
    const sprintMult = moveState.shift ? PLAYER.SPRINT_MULT : 1.0;
    const currentMaxSpeed = player.speed * sprintMult;

    player.velocity.x -= player.velocity.x * PLAYER.DAMPING * rawDelta;
    player.velocity.z -= player.velocity.z * PLAYER.DAMPING * rawDelta;

    player.direction.z = Number(moveState.forward) - Number(moveState.backward);
    player.direction.x = Number(moveState.right) - Number(moveState.left);
    player.direction.normalize();

    if (moveState.forward || moveState.backward) {
        player.velocity.z -= player.direction.z * currentMaxSpeed * rawDelta;
    }
    if (moveState.left || moveState.right) {
        player.velocity.x -= player.direction.x * currentMaxSpeed * rawDelta;
    }

    state.controls.moveRight(-player.velocity.x * rawDelta);
    state.controls.moveForward(-player.velocity.z * rawDelta);

    state.camera.position.x = THREE.MathUtils.clamp(
        state.camera.position.x, -ARENA.PLAYER_LIMIT, ARENA.PLAYER_LIMIT,
    );
    state.camera.position.z = THREE.MathUtils.clamp(
        state.camera.position.z, -ARENA.PLAYER_LIMIT, ARENA.PLAYER_LIMIT,
    );
}
