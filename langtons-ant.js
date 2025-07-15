// Langton's Ant - High Quality Implementation

// --- CONFIGURABLE SETTINGS ---
const CELL_SIZE = 16; // Base cell size in pixels
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
    }
};
let theme = "classic";

// --- STATE ---
let grid = new Map(); // key: "x,y", value: 0 (white) or 1 (black)
let ant = { x: 0, y: 0, dir: 0 }; // dir: 0=up, 1=right, 2=down, 3=left
let running = false;
let speed = 60; // steps per second
let animationFrame;
let cellSize = CELL_SIZE;
let offsetX = 0, offsetY = 0; // Pan offset in pixels
let zoom = 1;

// --- CANVAS SETUP ---
const canvas = document.getElementById("ant-canvas");
const ctx = canvas.getContext("2d");

// --- UI ELEMENTS ---
const playBtn = document.getElementById("play-btn");
const stepBtn = document.getElementById("step-btn");
const resetBtn = document.getElementById("reset-btn");
const speedSlider = document.getElementById("speed-slider");
const themeSelect = document.getElementById("theme-select");

// --- HELPERS ---
function key(x, y) { return `${x},${y}`; }
function parseKey(k) { const [x, y] = k.split(",").map(Number); return { x, y }; }

// --- SIMULATION LOGIC ---
function stepAnt() {
    const k = key(ant.x, ant.y);
    const state = grid.get(k) || 0;
    // Turn: right on white, left on black
    ant.dir = (ant.dir + (state === 0 ? 1 : 3)) % 4;
    // Flip color
    grid.set(k, state === 0 ? 1 : 0);
    // Move forward
    if (ant.dir === 0) ant.y--;
    else if (ant.dir === 1) ant.x++;
    else if (ant.dir === 2) ant.y++;
    else if (ant.dir === 3) ant.x--;
}

function reset() {
    grid.clear();
    ant = { x: 0, y: 0, dir: 0 };
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    zoom = 1;
    cellSize = CELL_SIZE;
    draw();
}

// --- RENDERING ---
function draw() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
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

    // Draw ant
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

    ctx.restore();
}

// --- ANIMATION LOOP ---
function animate() {
    for (let i = 0; i < Math.max(1, Math.floor(speed / 60)); i++) {
        stepAnt();
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
        stepAnt();
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

// --- ZOOM & PAN ---
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener("mousedown", e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
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
window.addEventListener("mouseup", () => dragging = false);
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
