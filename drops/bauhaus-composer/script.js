// Bauhaus Composer — Interactive geometric composition toy
// Form follows function.

const canvas = document.getElementById('composer');
const ctx = canvas.getContext('2d');

canvas.setAttribute('role', 'img');
canvas.setAttribute('aria-label', 'Bauhaus geometric composition canvas. Use click to place shapes, drag to move, scroll to resize, R to rotate, D to delete.');

let W, H;
function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    render();
}
resize();
window.addEventListener('resize', resize);

// ── Bauhaus palette ──
const PALETTE = [
    '#E63946', // Bauhaus red
    '#457B9D', // Bauhaus blue
    '#F4A261', // Bauhaus yellow
    '#2A9D8F', // Bauhaus teal-green
    '#111111', // black
    '#D3D3D3', // light grey
    '#FFFFFF', // white
];

const COLOR_NAMES = ['Bauhaus red', 'Bauhaus blue', 'Bauhaus yellow', 'Bauhaus teal', 'black', 'light grey', 'white'];

// ── Shape types ──
const SHAPES = ['circle', 'square', 'triangle', 'line', 'arc'];
const SHAPE_ICONS = { circle: '⬤', square: '■', triangle: '▲', line: '—', arc: '⌒' };

// ── State ──
let shapes = [];
let selectedIdx = -1;
let activeColor = PALETTE[0];
let activeShape = SHAPES[0];
let activeSize = 60;
let gridVisible = true;

// ── Undo stack ──
let undoStack = [];
let redoStack = [];

function pushUndo() {
    redoStack = [];
    undoStack.push(JSON.parse(JSON.stringify(shapes)));
    if (undoStack.length > 50) undoStack.shift();
}
function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.parse(JSON.stringify(shapes)));
    shapes = undoStack.pop();
    selectedIdx = -1;
    saveToStorage();
    render();
}
function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.parse(JSON.stringify(shapes)));
    shapes = redoStack.pop();
    selectedIdx = -1;
    saveToStorage();
    render();
}

// ── Persistent save ──
function saveToStorage() {
    try {
        localStorage.setItem('bauhaus-composer', JSON.stringify(shapes));
    } catch (e) { /* storage unavailable */ }
}
function loadFromStorage() {
    try {
        var saved = localStorage.getItem('bauhaus-composer');
        if (saved) {
            shapes = JSON.parse(saved);
            return true;
        }
    } catch (e) { /* ignore */ }
    return false;
}

// ── Generate a random composition ──
function randomComposition(count) {
    if (count == null) count = 12 + Math.floor(Math.random() * 10);
    var comp = [];
    for (var i = 0; i < count; i++) {
        comp.push({
            x: Math.random() * W,
            y: Math.random() * H,
            size: 20 + Math.random() * 120,
            color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
            rotation: Math.random() * Math.PI * 2,
            strokeWidth: 1 + Math.random() * 3,
        });
    }
    return comp;
}

// ── Hit detection ──
function hitTest(px, py, s) {
    var half = s.size / 2;
    var dx = px - s.x;
    var dy = py - s.y;
    if (s.shape === 'circle') {
        return (dx * dx + dy * dy) < (half * half);
    }
    var cos = Math.cos(-s.rotation);
    var sin = Math.sin(-s.rotation);
    var rx = dx * cos - dy * sin;
    var ry = dx * sin + dy * cos;
    if (s.shape === 'square') {
        return rx >= -half && rx <= half && ry >= -half && ry <= half;
    }
    if (s.shape === 'arc') {
        // arc is a filled pie-slice: quarter circle starting at 0 rad
        if (rx < -half || rx > half || ry < -half || ry > half) return false;
        // angular check: within the pie arc (0 to PI*1.2)
        var angle = Math.atan2(ry, rx);
        return angle >= -0.2 && angle <= Math.PI * 1.2 + 0.2;
    }
    // triangle
    if (s.shape === 'triangle') {
        if (rx < -half || rx > half || ry < -half || ry > half) return false;
        var h = half * 1.2;
        var yAdj = ry + half;
        if (yAdj < 0) return false;
        var wAtY = (half * 2) * (1 - yAdj / (h * 1.4));
        var leftEdge = -wAtY / 2;
        var rightEdge = wAtY / 2;
        return rx >= leftEdge && rx <= rightEdge;
    }
    // line
    if (s.shape === 'line') {
        var len = half * 2;
        return rx >= -len && rx <= len && Math.abs(ry) < 4;
    }
    return false;
}

// ── Find topmost shape at point ──
function findShapeAt(x, y) {
    for (var i = shapes.length - 1; i >= 0; i--) {
        if (hitTest(x, y, shapes[i])) return i;
    }
    return -1;
}

// ── Draw a single shape ──
function drawShape(s, isSelected) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation || 0);

    var half = s.size / 2;
    ctx.globalAlpha = s.opacity != null ? s.opacity : 1;

    ctx.beginPath();
    switch (s.shape) {
        case 'circle':
            ctx.arc(0, 0, half, 0, Math.PI * 2);
            break;
        case 'square':
            ctx.rect(-half, -half, s.size, s.size);
            break;
        case 'triangle':
            var h = half * 1.2;
            ctx.moveTo(0, -h);
            ctx.lineTo(-half, h);
            ctx.lineTo(half, h);
            ctx.closePath();
            break;
        case 'line':
            ctx.moveTo(-half * 2, 0);
            ctx.lineTo(half * 2, 0);
            break;
        case 'arc':
            ctx.arc(0, 0, half, 0, Math.PI * 1.2);
            break;
    }

    if (s.shape === 'line') {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.strokeWidth || 2;
        ctx.stroke();
    } else {
        ctx.fillStyle = s.color;
        ctx.fill();
        if (s.strokeWidth && s.strokeWidth > 0) {
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = s.strokeWidth || 1;
            ctx.stroke();
        }
    }

    // Selection highlight
    if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-half - 4, -(half + 4), s.size + 8, s.size + 8);
        ctx.setLineDash([]);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

// ── Render ──
function render() {
    ctx.clearRect(0, 0, W, H);

    // subtle Bauhaus grid overlay (togglable)
    if (gridVisible) {
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (var x = 0; x <= W; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        for (var y = 0; y <= H; y += 60) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
    }

    for (var i = 0; i < shapes.length; i++) {
        drawShape(shapes[i], i === selectedIdx);
    }

    if (isDragging && selectedIdx >= 0 && selectedIdx < shapes.length) {
        var s = shapes[selectedIdx];
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#fff';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(s.shape + ' · ' + Math.round(s.size) + 'px', s.x + 10, s.y - 10);
        ctx.restore();
    }
}

// ── Interaction ──
var isDragging = false;
var dragStartX = 0, dragStartY = 0;
var dragOrigX = 0, dragOrigY = 0;
var pointerActive = false;

function getPos(e) {
    if (e.clientX != null) return { x: e.clientX, y: e.clientY };
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return null;
}

function onPointerDown(e) {
    if (pointerActive) return; // prevent duplicate touch+pointer firing
    var p = getPos(e);
    if (!p) return;

    pointerActive = true;
    var idx = findShapeAt(p.x, p.y);
    if (idx >= 0) {
        selectedIdx = idx;
        isDragging = true;
        dragStartX = p.x;
        dragStartY = p.y;
        dragOrigX = shapes[idx].x;
        dragOrigY = shapes[idx].y;
        render();
        return;
    }

    pushUndo();
    selectedIdx = shapes.length;
    shapes.push({
        x: p.x, y: p.y,
        size: activeSize,
        color: activeColor,
        shape: activeShape,
        rotation: Math.random() * 0.3 - 0.15,
        strokeWidth: 1.5,
        opacity: 1,
    });
    isDragging = true;
    dragStartX = p.x;
    dragStartY = p.y;
    dragOrigX = p.x;
    dragOrigY = p.y;
    render();
}

function onPointerMove(e) {
    if (!isDragging || selectedIdx < 0 || selectedIdx >= shapes.length) return;
    var p = getPos(e);
    if (!p) return;

    var s = shapes[selectedIdx];
    s.x = dragOrigX + (p.x - dragStartX);
    s.y = dragOrigY + (p.y - dragStartY);
    render();
}

function onPointerUp() {
    if (isDragging && selectedIdx >= 0 && selectedIdx < shapes.length) {
        var s = shapes[selectedIdx];
        s.x = Math.round(s.x);
        s.y = Math.round(s.y);
        saveToStorage();
    }
    pointerActive = false;
    isDragging = false;
    render();
}

// ── Canvas listeners (pointer-only with touch prevention) ──
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointerleave', onPointerUp);

// Touch events with passive:false but we use pointer events now
// Block touch events to prevent double-firing with pointer
canvas.addEventListener('touchstart', function (e) {
    // pointer events handle it; prevent default to avoid scroll/zoom
    e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (isDragging) return;
    // pass through to pointer move
    var t = e.touches[0];
    if (t) onPointerMove({ clientX: t.clientX, clientY: t.clientY });
}, { passive: false });
canvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    onPointerUp();
}, { passive: false });
canvas.addEventListener('touchcancel', function () {
    onPointerUp();
});

// ── Keyboard shortcuts ──
document.addEventListener('keydown', function (e) {
    if (e.key === 'r' || e.key === 'R') {
        if (selectedIdx >= 0 && selectedIdx < shapes.length) {
            pushUndo();
            shapes[selectedIdx].rotation = (shapes[selectedIdx].rotation || 0) + 0.25;
            saveToStorage();
            render();
        }
    }
    if (e.key === 'd' || e.key === 'D' || e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIdx >= 0 && selectedIdx < shapes.length) {
            pushUndo();
            shapes.splice(selectedIdx, 1);
            selectedIdx = -1;
            saveToStorage();
            render();
        }
    }
    if (e.key === 'Escape') {
        selectedIdx = -1;
        render();
    }
    if (e.key === 'g' || e.key === 'G') {
        gridVisible = !gridVisible;
        var gridBtn = document.getElementById('btn-grid');
        if (gridBtn) gridBtn.textContent = gridVisible ? 'Grid On' : 'Grid Off';
        render();
    }
    if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        exportPNG();
    }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
    }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        redo();
    }
    if ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        redo();
    }
});

// ── Mouse wheel resize ──
canvas.addEventListener('wheel', function (e) {
    if (selectedIdx < 0 || selectedIdx >= shapes.length) return;
    e.preventDefault();
    pushUndo();
    var s = shapes[selectedIdx];
    var delta = e.deltaY > 0 ? -8 : 8;
    s.size = Math.max(10, Math.min(400, s.size + delta));
    var slider = document.getElementById('size-slider');
    if (slider) {
        slider.value = Math.min(400, Math.max(10, Math.round(s.size)));
    }
    var sv = document.getElementById('size-value');
    if (sv) sv.textContent = '' + Math.round(s.size);
    saveToStorage();
    render();
}, { passive: false });

// ── UI Setup ──
function setupUI() {
    var swatches = document.getElementById('color-swatches');
    if (swatches) {
        PALETTE.forEach(function (c, i) {
            var sw = document.createElement('div');
            sw.className = 'color-swatch' + (i === 0 ? ' active' : '');
            sw.style.background = c;
            sw.dataset.color = c;
            sw.setAttribute('role', 'button');
            sw.setAttribute('aria-label', COLOR_NAMES[i]);
            sw.tabIndex = 0;
            sw.addEventListener('click', function () {
                document.querySelectorAll('.color-swatch').forEach(function (el) { el.classList.remove('active'); });
                sw.classList.add('active');
                activeColor = c;
            });
            sw.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    sw.click();
                }
            });
            swatches.appendChild(sw);
        });
    }

    var shapeBtns = document.getElementById('shape-btns');
    if (shapeBtns) {
        SHAPES.forEach(function (s, i) {
            var btn = document.createElement('button');
            btn.className = 'shape-btn' + (i === 0 ? ' active' : '');
            btn.innerHTML = SHAPE_ICONS[s] || s[0].toUpperCase();
            btn.dataset.shape = s;
            btn.setAttribute('aria-label', 'Shape: ' + s);
            btn.addEventListener('click', function () {
                document.querySelectorAll('.shape-btn').forEach(function (el) { el.classList.remove('active'); });
                btn.classList.add('active');
                activeShape = s;
            });
            shapeBtns.appendChild(btn);
        });
    }

    var slider = document.getElementById('size-slider');
    if (slider) {
        slider.setAttribute('aria-valuemin', '10');
        slider.setAttribute('aria-valuemax', '400');
        slider.addEventListener('input', function () {
            activeSize = parseInt(slider.value, 10);
            var sv = document.getElementById('size-value');
            if (sv) sv.textContent = '' + activeSize;
        });
    }

    var btnUndo = document.getElementById('btn-undo');
    if (btnUndo) btnUndo.addEventListener('click', undo);

    var btnRedo = document.getElementById('btn-redo');
    if (btnRedo) btnRedo.addEventListener('click', redo);

    var btnRandom = document.getElementById('btn-random');
    if (btnRandom) {
        btnRandom.addEventListener('click', function () {
            pushUndo();
            shapes = randomComposition();
            selectedIdx = -1;
            saveToStorage();
            render();
        });
    }

    var btnClear = document.getElementById('btn-clear');
    if (btnClear) {
        btnClear.addEventListener('click', function () {
            if (shapes.length === 0) return;
            pushUndo();
            shapes = [];
            selectedIdx = -1;
            saveToStorage();
            render();
        });
    }

    var btnGrid = document.getElementById('btn-grid');
    if (btnGrid) {
        btnGrid.addEventListener('click', function () {
            gridVisible = !gridVisible;
            btnGrid.textContent = gridVisible ? 'Grid On' : 'Grid Off';
            render();
        });
    }
}

// ── Init ──
setupUI();

// Load saved composition
if (!loadFromStorage()) {
    // starter composition
    shapes = [
        { x: 100, y: 100, size: 80, color: '#E63946', shape: 'square', rotation: 0.2, strokeWidth: 1.5 },
        { x: 300, y: 200, size: 100, color: '#457B9D', shape: 'circle', rotation: 0, strokeWidth: 1.5 },
        { x: 200, y: 350, size: 70, color: '#F4A261', shape: 'triangle', rotation: -0.3, strokeWidth: 1.5 },
    ];
}
render();

setTimeout(function () {
    var panel = document.getElementById('ui-panel');
    if (panel) panel.classList.add('visible');
}, 500);

setTimeout(function () {
    var tip = document.getElementById('help-tip');
    if (tip) tip.style.opacity = '0';
}, 8000);

// ── Export PNG ──
function exportPNG() {
    var oldGrid = gridVisible;
    var oldSel = selectedIdx;
    gridVisible = false;
    selectedIdx = -1;
    render();

    var canvasEl = document.getElementById('composer');
    var link = document.createElement('a');
    link.download = 'bauhaus-composition-' + Date.now() + '.png';
    link.href = canvasEl.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // restore
    gridVisible = oldGrid;
    selectedIdx = oldSel;
    render();
}

// Wire export button
document.getElementById('btn-export').addEventListener('click', exportPNG);
