// Shared mutable game state. A single object so modules can read/write the
// same data without circular imports or hidden globals.

export function createGameState() {
    return {
        // Three.js handles (filled in by main.js).
        scene: null,
        camera: null,
        renderer: null,
        controls: null,

        // Game loop bookkeeping.
        lastTime: performance.now(),
        score: 0,
        isGameOver: false,

        // Time-manipulation system.
        timeScale: 0.05,
        actionTimer: 0,
        mouseMovementFactor: 0,

        // Entity collections.
        enemies: [],
        playerBullets: [],
        enemyBullets: [],
        fragments: [],
        thrownWeapons: [],
        throwableObjects: [],
        obstacles: [],
    };
}
