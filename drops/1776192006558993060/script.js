// Grain Snap - Core Implementation

const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to full window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Grid configuration
const GRID_SIZE = 40;
const GRID_COLOR = '#5C4033';
const MAX_STRAIN = 0.8; // Maximum strain before snap
const STRAIN_JITTER = 120; // FPS for jitter effect

// Audio context
let audioContext;
let strainOscillator = null;
let strainGain = null;

// State variables
let gridLines = [];
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let currentStrain = 0;
let strainThreshold = 0.5;
let dropTimer = null;
let dropPosition = { x: 0, y: 0 };
let dropDistance = 0;

// Initialize grid
function initGrid() {
    gridLines = [];
    const cols = Math.ceil(canvas.width / GRID_SIZE) + 1;
    const rows = Math.ceil(canvas.height / GRID_SIZE) + 1;
    
    // Create horizontal lines
    for (let y = 0; y < rows; y++) {
        gridLines.push({
            type: 'horizontal',
            y: y * GRID_SIZE,
            strain: 0,
            originalStrain: 0
        });
    }
    
    // Create vertical lines
    for (let x = 0; x < cols; x++) {
        gridLines.push({
            type: 'vertical',
            x: x * GRID_SIZE,
            strain: 0,
            originalStrain: 0
        });
    }
}

// Generate wood grain noise for grid lines
function generateWoodGrainNoise() {
    // This would be replaced with actual noise generation in a real implementation
    return Math.random();
}

// Draw the grid
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    gridLines.forEach(line => {
        const noise = generateWoodGrainNoise();
        const strain = Math.min(line.strain, MAX_STRAIN);
        const lineColor = strain >= MAX_STRAIN ? '#FFFFFF' : GRID_COLOR;
        
        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        
        if (line.type === 'horizontal') {
            ctx.moveTo(0, line.y);
            ctx.lineTo(canvas.width, line.y);
        } else {
            ctx.moveTo(line.x, 0);
            ctx.lineTo(line.x, canvas.height);
        }
        
        // Apply strain effect
        if (strain > 0) {
            // Add jitter effect during strain
            const jitterAmount = strain * 5;
            const jitterX = (Math.random() - 0.5) * jitterAmount;
            const jitterY = (Math.random() - 0.5) * jitterAmount;
            
            if (line.type === 'horizontal') {
                ctx.moveTo(0 + jitterX, line.y + jitterY);
                ctx.lineTo(canvas.width + jitterX, line.y + jitterY);
            } else {
                ctx.moveTo(line.x + jitterX, 0 + jitterY);
                ctx.lineTo(line.x + jitterX, canvas.height + jitterY);
            }
        }
        
        ctx.stroke();
    });
}

// Update strain on grid lines
function updateStrain(x, y) {
    // Calculate strain for lines near the cursor
    gridLines.forEach(line => {
        if (line.type === 'horizontal') {
            const distance = Math.abs(line.y - y);
            if (distance < 10) {
                line.strain = Math.min(line.strain + 0.05, MAX_STRAIN);
            }
        } else {
            const distance = Math.abs(line.x - x);
            if (distance < 10) {
                line.strain = Math.min(line.strain + 0.05, MAX_STRAIN);
            }
        }
    });
}

// Check if any line has snapped
function checkSnap() {
    for (let i = 0; i < gridLines.length; i++) {
        if (gridLines[i].strain >= MAX_STRAIN) {
            return i;
        }
    }
    return -1;
}

// Snap a line
function snapLine(index) {
    // Create audio context on first interaction
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Play snap sound
    playSnapSound();
    
    // Remove the snapped line
    gridLines.splice(index, 1);
    
    // Drop cursor effect
    dropPosition = { x: dragStart.x, y: dragStart.y };
    dropDistance = 0;
    animateDrop();
}

// Play snap sound
function playSnapSound() {
    if (!audioContext) return;
    
    // White noise burst with high-pass filter
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < output.length; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    
    const gain = audioContext.createGain();
    gain.gain.value = 0.5;
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    
    noise.start();
    noise.stop(audioContext.currentTime + 0.1);
    
    // Sharp metallic click
    const clickOsc = audioContext.createOscillator();
    clickOsc.type = 'sine';
    clickOsc.frequency.value = 2000;
    
    const clickGain = audioContext.createGain();
    clickGain.gain.value = 0.5;
    
    clickOsc.connect(clickGain);
    clickGain.connect(audioContext.destination);
    
    clickOsc.start();
    clickOsc.stop(audioContext.currentTime + 0.05);
}

// Animate cursor drop
function animateDrop() {
    dropDistance += 5;
    if (dropDistance < 20) {
        requestAnimationFrame(animateDrop);
    } else {
        // After drop, wait 3 seconds then reset
        setTimeout(resetGrid, 3000);
    }
}

// Reset the grid
function resetGrid() {
    initGrid();
    currentStrain = 0;
    isDragging = false;
    dragStart = { x: 0, y: 0 };
    dropTimer = null;
    dropPosition = { x: 0, y: 0 };
    dropDistance = 0;
}

// Mouse event handlers
function handleMouseDown(e) {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    dragStart = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    
    // Start strain audio
    if (audioContext && !strainOscillator) {
        strainOscillator = audioContext.createOscillator();
        strainOscillator.type = 'sine';
        strainOscillator.frequency.value = 40;
        
        strainGain = audioContext.createGain();
        strainGain.gain.value = 0.1;
        
        strainOscillator.connect(strainGain);
        strainGain.connect(audioContext.destination);
        
        strainOscillator.start();
    }
}

function handleMouseMove(e) {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update strain
    updateStrain(x, y);
    
    // Check for snap
    const snappedIndex = checkSnap();
    if (snappedIndex !== -1) {
        snapLine(snsnappedIndex);
        isDragging = false;
    }
    
    drawGrid();
}

function handleMouseUp() {
    isDragging = false;
    
    // Stop strain audio
    if (strainOscillator) {
        strainOscillator.stop();
        strainOscillator = null;
        strainGain = null;
    }
}

// Touch event handlers
function handleTouchStart(e) {
    e.preventDefault();
    handleMouseDown(e.touches[0]);
}

function handleTouchMove(e) {
    e.preventDefault();
    handleMouseMove(e.touches[0]);
}

function handleTouchEnd(e) {
    e.preventDefault();
    handleMouseUp();
}

// Initialize
initGrid();
drawGrid();

// Add event listeners
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);

// Animation loop
function animate() {
    drawGrid();
    requestAnimationFrame(animate);
}
animate();
