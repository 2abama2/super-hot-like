import * as THREE from 'three';

import { ARENA, ENEMY_TYPES, WORLD } from './config.js';
import { spawnEnemy } from './enemies.js';

function createFloor(scene) {
    const geo = new THREE.PlaneGeometry(ARENA.HALF * 2, ARENA.HALF * 2);
    const mat = new THREE.MeshStandardMaterial({ color: WORLD.FLOOR_COLOR, roughness: 1 });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(ARENA.HALF * 2, WORLD.GRID_DIVISIONS, WORLD.GRID_COLOR, WORLD.GRID_COLOR);
    grid.position.y = 0.01;
    scene.add(grid);
}

function createWalls(scene, obstacles) {
    const wallMat = new THREE.MeshStandardMaterial({ color: WORLD.WALL_COLOR });
    const span = ARENA.HALF * 2;
    const h = ARENA.WALL_HEIGHT;

    const configs = [
        { w: span, h, d: 1, x: 0, z: -ARENA.HALF },
        { w: span, h, d: 1, x: 0, z: ARENA.HALF },
        { w: 1, h, d: span, x: -ARENA.HALF, z: 0 },
        { w: 1, h, d: span, x: ARENA.HALF, z: 0 },
    ];

    for (const c of configs) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), wallMat);
        mesh.position.set(c.x, h / 2, c.z);
        scene.add(mesh);
        obstacles.push(mesh);
    }
}

function scatterThrowables(scene, throwableObjects) {
    for (let i = 0; i < 10; i++) {
        const ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 16, 16),
            new THREE.MeshStandardMaterial({ color: WORLD.BALL_COLOR }),
        );
        ball.position.set(
            (Math.random() - 0.5) * 20,
            0.4,
            (Math.random() - 0.5) * 20,
        );
        scene.add(ball);
        throwableObjects.push({ mesh: ball, active: false });
    }
}

const LEVEL_1_SPAWNS = [
    { x: 10, z: 10, type: ENEMY_TYPES.MELEE },
    { x: -10, z: 15, type: ENEMY_TYPES.SLUGGER },
    { x: 15, z: -10, type: ENEMY_TYPES.MELEE },
    { x: -15, z: -15, type: ENEMY_TYPES.MELEE },
    { x: 0, z: 20, type: ENEMY_TYPES.SLUGGER },
];

export function createLevel1(state) {
    createFloor(state.scene);
    createWalls(state.scene, state.obstacles);

    for (const p of LEVEL_1_SPAWNS) {
        spawnEnemy(state, p.x, p.z, p.type);
    }

    scatterThrowables(state.scene, state.throwableObjects);
}
