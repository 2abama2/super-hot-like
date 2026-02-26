import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ==========================================
// 1. GAME ARCHITECTURE & STATE
// ==========================================
let camera, scene, renderer, controls;
let lastTime = performance.now();
let score = 0;
let isGameOver = false;

// Collections
let enemies = [];
let playerBullets = [];
let enemyBullets = [];

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScore = document.getElementById('final-score');

// ==========================================
// 2. TIME MANIPULATION SYSTEM (CRITICAL)
// ==========================================
let timeScale = 0.05; // Current game speed
const MIN_TIME_SCALE = 0.05; // Nearly frozen
const MAX_TIME_SCALE = 1.0;  // Real-time
let actionTimer = 0; // Keeps time running briefly after an action (mouse look/shoot)

// ==========================================
// 3. PLAYER SYSTEMS & CONTROLS
// ==========================================
const player = {
    speed: 15.0,
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    radius: 1.0,
    weapon: null
};

const moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false
};
let mouseSensitivity = 0.002;
let mouseMovementFactor = 0; // Насколько активно мы крутим камерой
let thrownWeapons = []; // Массив для летящих пистолетов
let fragments = [];      // Массив для осколков врагов
let playerAmmo = 5;      // Ограничим боезапас
const MAX_AMMO = 5;
let weaponCooldown = 0;
let obstacles = [];
let throwableObjects = []; // Объекты, которые можно поднять/кинуть
const ENEMY_TYPES = {
    MELEE: 'melee',     // Кулаки/нож (бежит в упор)
    SLUGGER: 'slugger', // Бита/мачете (бежит в упор, больше радиус)
    SHOOTER: 'shooter', // Пистолет (стоит/медленно идет)
    SHOTGUNGER: 'shotgun' // Дробовик (подходит ближе, стреляет веером)
};
// ==========================================
// 4. INITIALIZATION & SCENE SETUP
// ==========================================
init();
animate();

function init() {
    // Basic Scene & Camera Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0); // Light gray/white environment
    scene.fog = new THREE.Fog(0xf0f0f0, 10, 50);

    createLevel1();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6; // Player eye level

    // Lighting (Minimalist)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    scene.add(dirLight);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Environment: Floor
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Environment: Grid (Helps with visual depth in a white room)
    const grid = new THREE.GridHelper(100, 50, 0xdddddd, 0xdddddd);
    grid.position.y = 0.01;
    scene.add(grid);

    // Player Controls (PointerLock)
    controls = new PointerLockControls(camera, document.body);
    
    // Weapon Model (Attached to camera)
    const weaponGeo = new THREE.BoxGeometry(0.2, 0.2, 0.8);
    const weaponMat = new THREE.MeshStandardMaterial({ color: 0x111111 }); // Black weapon
    player.weapon = new THREE.Mesh(weaponGeo, weaponMat);
    player.weapon.position.set(0.4, -0.3, -0.6); // Position relative to camera
    player.weapon.castShadow = true;
    camera.add(player.weapon);
    scene.add(camera);

    // Event Listeners
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    
    controls.addEventListener('lock', () => {
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
    });
    
    controls.addEventListener('unlock', () => {
        if (!isGameOver) startScreen.classList.remove('hidden');
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseClick);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
}

// ==========================================
// 5. INPUT & EVENT HANDLERS
// ==========================================
function startGame() {
    isGameOver = false;
    score = 0;
    updateScore();
    
    // Reset Player
    camera.position.set(0, 1.6, 0);
    player.velocity.set(0,0,0);
    
    // Cleanup old entities
    enemies.forEach(e => scene.remove(e.mesh));
    playerBullets.forEach(b => scene.remove(b.mesh));
    enemyBullets.forEach(b => scene.remove(b.mesh));
    enemies = [];
    playerBullets = [];
    enemyBullets = [];

    controls.lock();
}

function checkBulletWallCollisions(bullet, array, index) {
    // Простая проверка по дистанции или пересечению для каждого препятствия
    for (let obs of obstacles) {
        // Создаем временный Box3 для коллизии
        const obsBox = new THREE.Box3().setFromObject(obs);
        if (obsBox.containsPoint(bullet.mesh.position)) {
            scene.remove(bullet.mesh);
            array.splice(index, 1);
            return true;
        }
    }
    return false;
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'ShiftLeft': moveState.shift = true; break;
    }
}
function createBaseArena() {
    // Пол
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Стены (Север, Юг, Запад, Восток)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const wallConfigs = [
        { w: 100, h: 10, d: 1, x: 0, z: -50 },
        { w: 100, h: 10, d: 1, x: 0, z: 50 },
        { w: 1, h: 10, d: 100, x: -50, z: 0 },
        { w: 1, h: 10, d: 100, x: 50, z: 0 }
    ];

    wallConfigs.forEach(conf => {
        const geo = new THREE.BoxGeometry(conf.w, conf.h, conf.d);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(conf.x, 5, conf.z);
        scene.add(mesh);
        obstacles.push(mesh); // Массив для коллизий пуль
    });
}
function createLevel1() {
    // Стены и пол (как в предыдущем ответе)
    createBaseArena(); 

    // Расставляем 5 врагов ближнего боя в разных точках
    const spawnPoints = [
        { x: 10, z: 10, type: ENEMY_TYPES.MELEE },
        { x: -10, z: 15, type: ENEMY_TYPES.SLUGGER },
        { x: 15, z: -10, type: ENEMY_TYPES.MELEE },
        { x: -15, z: -15, type: ENEMY_TYPES.MELEE },
        { x: 0, z: 20, type: ENEMY_TYPES.SLUGGER }
    ];

    spawnPoints.forEach(p => spawnEnemy(p.x, p.z, p.type));

    // Расставляем интерактивные шары для метания
    for (let i = 0; i < 10; i++) {
        const geo = new THREE.SphereGeometry(0.4, 16, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0x555555 }); // Серые тяжелые шары
        const ball = new THREE.Mesh(geo, mat);
        
        ball.position.set(
            (Math.random() - 0.5) * 20,
            0.4,
            (Math.random() - 0.5) * 20
        );
        scene.add(ball);
        throwableObjects.push({ mesh: ball, active: false });
    }
}
function shatterEnemy(position) {
    const fragmentCount = 8;
    for (let i = 0; i < fragmentCount; i++) {
        // Создаем маленькую пирамидку (тетраэдр)
        const geo = new THREE.TetrahedronGeometry(Math.random() * 0.3 + 0.1);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const shard = new THREE.Mesh(geo, mat);
        
        shard.position.copy(position);
        
        // Случайный вектор разлета
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            Math.random() * 10,
            (Math.random() - 0.5) * 10
        );

        fragments.push({
            mesh: shard,
            velocity: velocity,
            rotation: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
            life: 1.5 // Секунды жизни
        });
        scene.add(shard);
    }
}
function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyD': moveState.right = false; break;
        case 'ShiftLeft': moveState.shift = false; break;
    }
}

function onMouseMove(event) {
    if (controls.isLocked) {
        const movement = Math.abs(event.movementX) + Math.abs(event.movementY);
        // 0.02 — чувствительность «времени» к мыши. 0.35 — предел ускорения от взгляда.
        mouseMovementFactor = Math.min(movement * 0.02, 0.35); 
        actionTimer = 0.1; // Небольшой запас времени на доводку прицела
    }
}
function shootBullet() {
    const bulletGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
    
    const weaponWorldPos = new THREE.Vector3();
    player.weapon.getWorldPosition(weaponWorldPos);
    bullet.position.copy(weaponWorldPos);
    
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    scene.add(bullet);
    playerBullets.push({
        mesh: bullet,
        velocity: direction.multiplyScalar(40),
        life: 2.0
    });
}
function onMouseClick(event) {
    if (!controls.isLocked || isGameOver) return;

    // Проверка: есть ли рядом шар, чтобы его кинуть?
    let pickedBall = null;
    throwableObjects.forEach((obj, idx) => {
        if (camera.position.distanceTo(obj.mesh.position) < 3) {
            pickedBall = obj;
        }
    });

    if (pickedBall) {
        // Бросаем шар вместо стрельбы
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        
        thrownWeapons.push({
            mesh: pickedBall.mesh,
            velocity: dir.multiplyScalar(30),
            rotation: new THREE.Vector3(Math.random(), Math.random(), 5),
            life: 5.0
        });
        // Удаляем из списка подбираемых
        throwableObjects = throwableObjects.filter(o => o !== pickedBall);
        actionTimer = 0.4;
        return;
    }

    // ЛКМ (0) — Стрельба, ПКМ (2) — Бросок
    if (event.button === 0 && playerAmmo > 0) {
        shootBullet();
        playerAmmo--;
        actionTimer = 0.3;
    } else {
        throwWeapon();
        actionTimer = 0.4;
    }
}

function throwWeapon() {
    if (!player.weapon.visible) return;

    const weaponPos = new THREE.Vector3();
    player.weapon.getWorldPosition(weaponPos);
    
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    // Клон пистолета для броска
    const thrownGeo = new THREE.BoxGeometry(0.2, 0.2, 0.8);
    const thrownMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const thrownMesh = new THREE.Mesh(thrownGeo, thrownMat);
    
    thrownMesh.position.copy(weaponPos);
    thrownMesh.lookAt(weaponPos.clone().add(direction));
    scene.add(thrownMesh);

    thrownWeapons.push({
        mesh: thrownMesh,
        velocity: direction.multiplyScalar(25),
        rotation: new THREE.Vector3(Math.random() * 10, Math.random() * 10, 2),
        life: 3.0
    });

    // Прячем пистолет в руках и ставим кулдаун на "поднятие нового"
    player.weapon.visible = false;
    weaponCooldown = 2.0; 
    playerAmmo = 0;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// 6. GAME ENTITY LOGIC
// ==========================================
function spawnEnemy(x, z, type = ENEMY_TYPES.MELEE) {
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1, z);
    scene.add(mesh);

    // Визуальное различие оружия
    let weaponVis;
    if (type === ENEMY_TYPES.SLUGGER) {
        weaponVis = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), new THREE.MeshBasicMaterial({color: 0x000000}));
        weaponVis.position.set(0.6, 0, -0.5);
        mesh.add(weaponVis);
    }

    enemies.push({
        mesh: mesh,
        type: type,
        speed: type === ENEMY_TYPES.MELEE ? 6 : 4,
        shootCooldown: 2.0,
        hitRadius: 1.5
    });
}

function updateEnemies(gameDelta) {
    const playerPos = camera.position.clone();

    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        const dist = e.mesh.position.distanceTo(playerPos);
        
        e.mesh.lookAt(playerPos.x, 1, playerPos.z);
        const dir = new THREE.Vector3().subVectors(playerPos, e.mesh.position).normalize();

        // Логика поведения
        if (e.type === ENEMY_TYPES.MELEE || e.type === ENEMY_TYPES.SLUGGER) {
            // Бегут на игрока
            e.mesh.position.add(dir.multiplyScalar(e.speed * gameDelta));
            if (dist < e.hitRadius) triggerGameOver(); // Удар вблизи
        } 
        else if (e.type === ENEMY_TYPES.SHOTGUNGER) {
            // Подходит на среднюю дистанцию и стреляет веером
            if (dist > 8) e.mesh.position.add(dir.multiplyScalar(e.speed * gameDelta));
            
            e.shootCooldown -= gameDelta;
            if (e.shootCooldown <= 0) {
                shootShotgun(e.mesh.position, playerPos);
                e.shootCooldown = 3.0;
            }
        }
    }
}



function shootShotgun(startPos, targetPos) {
    const dir = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
    
    // Создаем 5 дробинок с разбросом
    for (let i = 0; i < 5; i++) {
        const spread = 0.2;
        const bDir = dir.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
        )).normalize();

        const bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff3333 })
        );
        bullet.position.copy(startPos);
        scene.add(bullet);
        enemyBullets.push({
            mesh: bullet,
            velocity: bDir.multiplyScalar(12),
            life: 1.5
        });
    }
}

function updateBullets(gameDelta) {
    // Helper function to update bullet arrays
    function processBullets(bulletArray, isEnemyBullet) {
        for (let i = bulletArray.length - 1; i >= 0; i--) {
            let b = bulletArray[i];
            
            // Move bullet based on game time (shows slow motion visually)
            b.mesh.position.add(b.velocity.clone().multiplyScalar(gameDelta));
            b.life -= gameDelta;

            let destroyed = false;

            // Check collisions
            if (isEnemyBullet) {
                // Enemy bullet vs Player
                const distToPlayer = b.mesh.position.distanceTo(camera.position);
                if (distToPlayer < player.radius) {
                    triggerGameOver();
                    destroyed = true;
                }
            } else {
                // Player bullet vs Enemies
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    if (b.mesh.position.distanceTo(enemy.mesh.position) < 1.2) { // 1.2 hit radius
                        // Destroy Enemy
                        scene.remove(enemy.mesh);
                        enemies.splice(j, 1);
                        score += 100;
                        updateScore();
                        destroyed = true;
                        break;
                    }
                }
            }

            // Remove expired or destroyed bullets
            if (b.life <= 0 || destroyed) {
                scene.remove(b.mesh);
                bulletArray.splice(i, 1);
            }
        }
    }

    processBullets(playerBullets, false);
    processBullets(enemyBullets, true);
}
function updateWorldEntities(gameDelta) {
    // Обновление осколков
    for (let i = fragments.length - 1; i >= 0; i--) {
        let f = fragments[i];
        f.velocity.y -= 20 * gameDelta; 
        f.mesh.position.add(f.velocity.clone().multiplyScalar(gameDelta));
        f.mesh.rotation.x += f.rotation.x * 5 * gameDelta;
        f.life -= gameDelta;
        if (f.life <= 0) {
            scene.remove(f.mesh);
            fragments.splice(i, 1);
        }
    }

    // Обновление брошенного оружия
    for (let i = thrownWeapons.length - 1; i >= 0; i--) {
        let tw = thrownWeapons[i];
        tw.mesh.position.add(tw.velocity.clone().multiplyScalar(gameDelta));
        tw.mesh.rotation.x += tw.rotation.x * gameDelta;
        
        // Сбиваем врага пистолетом
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (tw.mesh.position.distanceTo(enemies[j].mesh.position) < 1.2) {
                shatterEnemy(enemies[j].mesh.position);
                scene.remove(enemies[j].mesh);
                enemies.splice(j, 1);
                score += 200;
                updateScore();
            }
        }

        // Сбиваем пулю пистолетом
        for (let k = enemyBullets.length - 1; k >= 0; k--) {
            if (tw.mesh.position.distanceTo(enemyBullets[k].mesh.position) < 0.6) {
                scene.remove(enemyBullets[k].mesh);
                enemyBullets.splice(k, 1);
                tw.velocity.multiplyScalar(0.5); // Замедляем пистолет при ударе
            }
        }

        tw.life -= gameDelta;
        if (tw.life <= 0) {
            scene.remove(tw.mesh);
            thrownWeapons.splice(i, 1);
        }
    }

    // Возвращение оружия в руки
    if (weaponCooldown > 0) {
        weaponCooldown -= gameDelta;
        if (weaponCooldown <= 0) {
            player.weapon.visible = true;
            playerAmmo = MAX_AMMO;
        }
    }
}
// ==========================================
// 7. MAIN GAME LOOP
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    // rawDelta — реальное время между кадрами для плавности управления
    const rawDelta = Math.min((time - lastTime) / 1000, 0.1); 
    lastTime = time;

    // Если игра на паузе (меню) или окончена — только рендерим, не обновляем логику
    if (!controls.isLocked || isGameOver) {
        renderer.render(scene, camera);
        return;
    }

    // --- 1. КОНТРОЛЛЕР ВРЕМЕНИ (SUPERHOT LOGIC) ---
    const isMoving = moveState.forward || moveState.backward || moveState.left || moveState.right;
    const isRunning = isMoving && moveState.shift; // Бежим только если нажат Shift и мы идем
    
    let targetTimeScale = MIN_TIME_SCALE;

    if (isRunning) {
        targetTimeScale = 1.5; // Время летит быстрее обычного при беге (адреналин)
    } else if (isMoving) {
        targetTimeScale = MAX_TIME_SCALE; // Обычная ходьба = обычное время
    } else if (actionTimer > 0.15) {
        // При выстреле или броске время ускоряется до максимума на мгновение
        targetTimeScale = MAX_TIME_SCALE;
    } else if (mouseMovementFactor > 0.01) {
        // Плавное ускорение времени при повороте головы (вязкость)
        targetTimeScale = Math.max(MIN_TIME_SCALE, mouseMovementFactor);
    }

    // Затухание факторов движения
    mouseMovementFactor *= 0.85; 
    if (actionTimer > 0) actionTimer -= rawDelta;

    // Сглаживание перехода времени (интерполяция)
    timeScale += (targetTimeScale - timeScale) * 15 * rawDelta;
    
    // gameDelta — это время, которое "чувствует" мир (враги, пули, физика)
    const gameDelta = rawDelta * timeScale;

    // --- 2. ОБНОВЛЕНИЕ ИГРОКА (Всегда на rawDelta для отклика) ---
    // Вычисляем текущую скорость (удваиваем при беге)
    const currentMaxSpeed = moveState.shift ? player.speed * 2.0 : player.speed;

    player.velocity.x -= player.velocity.x * 10.0 * rawDelta;
    player.velocity.z -= player.velocity.z * 10.0 * rawDelta;

    player.direction.z = Number(moveState.forward) - Number(moveState.backward);
    player.direction.x = Number(moveState.right) - Number(moveState.left);
    player.direction.normalize();

    if (moveState.forward || moveState.backward) player.velocity.z -= player.direction.z * currentMaxSpeed * rawDelta;
    if (moveState.left || moveState.right) player.velocity.x -= player.direction.x * currentMaxSpeed * rawDelta;

    controls.moveRight(-player.velocity.x * rawDelta);
    controls.moveForward(-player.velocity.z * rawDelta);

    // Коллизии игрока со стенами (простой Clamp по границам уровня)
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -48, 48);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -48, 48);

    // --- 3. ЭФФЕКТЫ КАМЕРЫ ---
    // При беге немного увеличиваем угол обзора (FOV) для эффекта скорости
    const targetFOV = moveState.shift ? 85 : 75;
    if (camera.fov !== targetFOV) {
        camera.fov += (targetFOV - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
    }

    // --- 4. ОБНОВЛЕНИЕ МИРА (На gameDelta) ---
    
    // Если врагов убили меньше 5 (Level 1), они могут спавниться (если вы не сделали фиксированный спавн)
    // Но в нашей логике Level 1 они уже расставлены в createLevel1.
    
    updateEnemies(gameDelta);
    updateBullets(gameDelta);
    updateWorldEntities(gameDelta); // Осколки, броски пушек, коллизии со стенами

    renderer.render(scene, camera);
}
// ==========================================
// 8. UTILITY FUNCTIONS
// ==========================================
function updateScore() {
    scoreDisplay.innerText = `Score: ${score}`;
}

function triggerGameOver() {
    isGameOver = true;
    controls.unlock();
    finalScore.innerText = `Final Score: ${score}`;
    gameOverScreen.classList.remove('hidden');
}