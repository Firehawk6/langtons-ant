// --- CONFIGURABLE SETTINGS ---
const CELL_SIZE = 16;
const COLORS = {
    classic: {
        bg: "#222",
        cell: "#fff",
        ant: "#e74c3c"
    },
    neon: {
        bg: "#000",
        cell: "#39ff14",
        ant: "#00eaff"
    },
    "Minic119's": {
        bg: "#13dcfa", // deep space blue-black
        cell: "#f90018", // starship hull gray
        ant: "#00ffea" // lightsaber blue-green
    }
};
let theme = "classic";

// --- STATE ---
let grid = new Map(); 
let ants = []; // Array of { x, y, dir }
let running = false;
let speed = 60; 
let animationFrame;
let cellSize = CELL_SIZE;
let offsetX = 0, offsetY = 0; 
let zoom = 1;
let spawnRadius = 100;

// --- CANVAS SETUP ---
const canvas = document.getElementById("ant-canvas");
const ctx = canvas.getContext("2d");

// --- UI ELEMENTS ---
const playBtn = document.getElementById("play-btn");
const stepBtn = document.getElementById("step-btn");
const resetBtn = document.getElementById("reset-btn");
const speedSlider = document.getElementById("speed-slider");
const themeSelect = document.getElementById("theme-select");
const antCountInput = document.getElementById("ant-count");
const maxAntsInput = document.getElementById("max-ants");

// --- HELPERS ---
function key(x, y) { return `${x},${y}`; }
function parseKey(k) { const [x, y] = k.split(",").map(Number); return { x, y }; }
function randomDir() { return Math.floor(Math.random() * 4); }

// --- SIMULATION LOGIC ---
function stepAnts() {
    // Move all ants
    for (let ant of ants) {
        const k = key(ant.x, ant.y);
        const state = grid.get(k) || 0;
        ant.dir = (ant.dir + (state === 0 ? 1 : 3)) % 4;
        grid.set(k, state === 0 ? 1 : 0);
        // Move forward
        if (ant.dir === 0) ant.y--;
        else if (ant.dir === 1) ant.x++;
        else if (ant.dir === 2) ant.y++;
        else if (ant.dir === 3) ant.x--;
    }
    // Check for collisions and add at most one new ant at a random position per step
    const positions = new Map(); // key: "x,y", value: [ant indices]
    ants.forEach((ant, i) => {
        const k = key(ant.x, ant.y);
        if (!positions.has(k)) positions.set(k, []);
        positions.get(k).push(i);
    });
    let spawned = false;
    let maxAnts = parseInt(maxAntsInput.value) || 0;
    for (const [k, idxs] of positions.entries()) {
        if (idxs.length > 1 && !spawned) {
            if (maxAnts === 0 || ants.length < maxAnts) {
                // Add a new ant at a random position within current spawnRadius
                const randX = Math.floor(Math.random() * (2 * spawnRadius + 1)) - spawnRadius;
                const randY = Math.floor(Math.random() * (2 * spawnRadius + 1)) - spawnRadius;
                ants.push({ x: randX, y: randY, dir: randomDir() });
                spawnRadius += 2; // Increase spawn radius slowly
            }
            spawned = true;
        }
    }
}

function reset() {
    grid.clear();
    ants = [];
    spawnRadius = 100;
    const count = Math.max(1, Math.min(100, parseInt(antCountInput.value) || 1));
    const centerX = 0;
    const centerY = 0;
    const used = new Set();
    let tries = 0;
    for (let i = 0; i < count; ++i) {
        let placed = false;
        while (!placed && tries < 1000) {
            // Random point within 20-block radius
            const angle = Math.random() * 2 * Math.PI;
            const radius = Math.floor(Math.random() * 21); // 0..20
            const x = centerX + Math.round(Math.cos(angle) * radius);
            const y = centerY + Math.round(Math.sin(angle) * radius);
            const k = key(x, y);
            if (!used.has(k)) {
                ants.push({ x, y, dir: randomDir() });
                used.add(k);
                placed = true;
            }
            tries++;
        }
    }
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    zoom = 1;
    cellSize = CELL_SIZE;
    draw();
}

// --- RENDERING ---
function draw() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.fillStyle = COLORS[theme].bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pan & zoom
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    // Draw cells
    for (const [k, v] of grid.entries()) {
        if (v === 1) {
            const { x, y } = parseKey(k);
            ctx.fillStyle = COLORS[theme].cell;
            ctx.fillRect(
                x * cellSize,
                y * cellSize,
                cellSize, cellSize
            );
        }
    }

    // Draw all ants
    for (const ant of ants) {
        ctx.save();
        ctx.translate(ant.x * cellSize + cellSize / 2, ant.y * cellSize + cellSize / 2);
        ctx.rotate((Math.PI / 2) * ant.dir);
        ctx.fillStyle = COLORS[theme].ant;
        ctx.beginPath();
        ctx.moveTo(0, -cellSize * 0.4);
        ctx.lineTo(cellSize * 0.3, cellSize * 0.4);
        ctx.lineTo(-cellSize * 0.3, cellSize * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}

// --- ANIMATION LOOP ---
function animate() {
    for (let i = 0; i < Math.max(1, Math.floor(speed / 60)); i++) {
        stepAnts();
    }
    draw();
    if (running) {
        animationFrame = requestAnimationFrame(animate);
    }
}

// --- UI HANDLERS ---
playBtn.onclick = () => {
    running = !running;
    playBtn.textContent = running ? "Pause" : "Play";
    if (running) animate();
    else cancelAnimationFrame(animationFrame);
};
stepBtn.onclick = () => {
    if (!running) {
        stepAnts();
        draw();
    }
};
resetBtn.onclick = () => {
    running = false;
    playBtn.textContent = "Play";
    reset();
};
speedSlider.oninput = () => {
    speed = Number(speedSlider.value);
};
themeSelect.onchange = () => {
    theme = themeSelect.value;
    draw();
};
antCountInput.onchange = () => {
    reset();
};
maxAntsInput.onchange = () => { reset(); };

// --- ZOOM & PAN ---
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener("mousedown", e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = "grabbing";
});
window.addEventListener("mousemove", e => {
    if (dragging) {
        offsetX += e.clientX - lastX;
        offsetY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        draw();
    }
});
window.addEventListener("mouseup", () => {
    dragging = false;
    canvas.style.cursor = "grab";
});
canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const scale = e.deltaY < 0 ? 1.1 : 0.9;
    const mx = (e.offsetX - offsetX) / zoom;
    const my = (e.offsetY - offsetY) / zoom;
    zoom *= scale;
    offsetX = e.offsetX - mx * zoom;
    offsetY = e.offsetY - my * zoom;
    draw();
}, { passive: false });

// --- RESPONSIVE CANVAS ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}
window.addEventListener("resize", resizeCanvas);

// --- INIT ---
resizeCanvas();
reset(); 
