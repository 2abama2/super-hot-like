// Game-wide tunable constants. Centralized so behavior is easy to tweak.

export const ENEMY_TYPES = Object.freeze({
    MELEE: 'melee',         // Fists / knife — rushes the player.
    SLUGGER: 'slugger',     // Bat / machete — rushes the player, larger reach.
    SHOOTER: 'shooter',     // Pistol — stands still / advances slowly.
    SHOTGUNGER: 'shotgun',  // Shotgun — closes to medium range and fires a spread.
});

export const TIME = Object.freeze({
    MIN_SCALE: 0.05,        // Nearly frozen.
    MAX_SCALE: 1.0,         // Real time.
    RUNNING_SCALE: 1.5,     // Adrenaline boost while sprinting.
    SMOOTHING: 15,          // How quickly the current scale chases the target.
    MOUSE_TO_TIME: 0.02,    // How strongly look-input thaws time.
    MOUSE_TO_TIME_MAX: 0.35,
    MOUSE_DECAY: 0.85,      // Multiplicative per-frame decay of mouse impulse.
    LOOK_GRACE: 0.1,        // Extra seconds of thawed time after a look-input.
    SHOOT_GRACE: 0.3,
    THROW_GRACE: 0.4,
});

export const PLAYER = Object.freeze({
    SPEED: 15.0,
    SPRINT_MULT: 2.0,
    EYE_HEIGHT: 1.6,
    RADIUS: 1.0,
    MAX_AMMO: 5,
    WEAPON_COOLDOWN: 2.0,   // Seconds before a thrown weapon "respawns" in the player's hands.
    DAMPING: 10.0,          // Linear velocity damping per second.
});

export const CAMERA = Object.freeze({
    FOV_DEFAULT: 75,
    FOV_SPRINT: 85,
    FOV_LERP: 0.1,
});

export const ARENA = Object.freeze({
    HALF: 50,               // Floor extends from -HALF to +HALF on both axes.
    WALL_HEIGHT: 10,
    PLAYER_LIMIT: 48,       // Clamp player slightly inside the walls.
});

export const BULLET = Object.freeze({
    PLAYER_SPEED: 40,
    PLAYER_LIFE: 2.0,
    HIT_RADIUS: 1.2,
    SHOTGUN_PELLETS: 5,
    SHOTGUN_SPREAD: 0.2,
    SHOTGUN_SPEED: 12,
    SHOTGUN_LIFE: 1.5,
});

export const ENEMY = Object.freeze({
    HIT_RADIUS: 1.5,
    SHOTGUNNER_RANGE: 8,
    SHOTGUNNER_RELOAD: 3.0,
    MELEE_SPEED: 6,
    RANGED_SPEED: 4,
    SCORE_SHOT: 100,
    SCORE_THROWN: 200,
});

export const FX = Object.freeze({
    SHATTER_FRAGMENTS: 8,
    SHATTER_LIFE: 1.5,
    GRAVITY: 20,
    THROWN_WEAPON_SPEED: 25,
    THROWN_WEAPON_LIFE: 3.0,
    THROWN_BALL_SPEED: 30,
    THROWN_BALL_LIFE: 5.0,
    PICKUP_RANGE: 3,
});

export const WORLD = Object.freeze({
    BACKGROUND: 0xf0f0f0,
    FOG_NEAR: 10,
    FOG_FAR: 50,
    GRID_DIVISIONS: 50,
    GRID_COLOR: 0xdddddd,
    WALL_COLOR: 0xdddddd,
    FLOOR_COLOR: 0xeeeeee,
    BALL_COLOR: 0x555555,
    ENEMY_COLOR: 0xff0000,
    WEAPON_COLOR: 0x111111,
    BULLET_PLAYER_COLOR: 0x000000,
    BULLET_ENEMY_COLOR: 0xff3333,
    SHARD_COLOR: 0xff0000,
});
