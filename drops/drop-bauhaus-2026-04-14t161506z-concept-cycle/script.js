const canvas = document.getElementById('vectorCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to full window size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Physics parameters
const LINE_LENGTH = 300;
const LINE_WIDTH = 2;
const FRICTION = 0.95; // Dry friction coefficient
const JITTER_STRENGTH = 0.5;
const MAX_JITTER_FREQUENCY = 10; // Jitter frequency per second
const BREAK_THRESHOLD = 0.8; // Threshold to break the line (0-1)

// Line state
let linePoints = [];
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragEnd = { x: 0, y: 0 };
let breakPoint = null;
let lastTimestamp = 0;

// Initialize line points
function initLine() {
    linePoints = [];
    const startX = canvas.width / 2;
    const startY = canvas.height / 2;
    
    for (let i = 0; i < LINE_LENGTH; i++) {
        linePoints.push({
            x: startX,
            y: startY + i,
            originalY: startY + i,
            velocity: 0
        });
    }
}

// Handle mouse events
function handleMouseDown(e) {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    dragStart = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    dragEnd = { ...dragStart };
}

function handleMouseMove(e) {
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        dragEnd = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
}

function handleMouseUp() {
    if (isDragging) {
        isDragging = false;
        // Check if break should occur
        const distance = Math.sqrt(
            Math.pow(dragEnd.x - dragStart.x, 2) + 
            Math.pow(dragEnd.y - dragStart.y, 2)
        );
        
        if (distance > LINE_LENGTH * BREAK_THRESHOLD) {
            breakPoint = {
                x: dragEnd.x,
                y: dragEnd.y
            };
        }
    }
}

// Calculate jitter based on drag velocity and time
function calculateJitter(timeDelta, dragVelocity) {
    // Jitter frequency increases with drag velocity
    const frequency = Math.min(MAX_JITTER_FREQUENCY * (dragVelocity / 100), MAX_JITTER_FREQUENCY);
    
    // Use sine wave for jitter effect
    const jitter = Math.sin(timeDelta * frequency * Math.PI * 2) * JITTER_STRENGTH;
    
    return jitter;
}

// Update line physics
function updatePhysics(timeDelta, dragVelocity) {
    // Apply jitter physics to each point
    for (let i = 0; i < linePoints.length; i++) {
        const point = linePoints[i];
        
        // Apply friction (dry linen feel)
        point.velocity *= FRICTION;
        
        // Apply jitter physics based on drag velocity
        if (isDragging && dragVelocity > 0) {
            const jitter = calculateJitter(timeDelta, dragVelocity);
            point.velocity += jitter;
        }
        
        // Update position based on velocity
        point.y += point.velocity;
        
        // Restore to original position with some damping
        const diff = point.originalY - point.y;
        point.velocity += diff * 0.05;
    }
}

// Draw the vector line
function drawLine() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (linePoints.length === 0) return;
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(linePoints[0].x, linePoints[0].y);
    
    for (let i = 1; i < linePoints.length; i++) {
        ctx.lineTo(linePoints[i].x, linePoints[i].y);
    }
    
    // Style the line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // Draw break point if exists
    if (breakPoint) {
        ctx.beginPath();
        ctx.arc(breakPoint.x, breakPoint.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0000';
        ctx.fill();
    }
}

// Animation loop with 120fps
function animate(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const timeDelta = (timestamp - lastTimestamp) / 1000; // Convert to seconds
    
    // Calculate drag velocity if dragging
    let dragVelocity = 0;
    if (isDragging) {
        const distance = Math.sqrt(
            Math.pow(dragEnd.x - dragStart.x, 2) + 
            Math.pow(dragEnd.y - dragStart.y, 2)
        );
        dragVelocity = distance / timeDelta;
    }
    
    // Update physics at 120fps
    if (timeDelta > 1/120) { // Update if more than 1/120 seconds have passed
        updatePhysics(timeDelta, dragVelocity);
        lastTimestamp = timestamp;
    }
    
    // Draw the line
    drawLine();
    
    requestAnimationFrame(animate);
}

// Initialize and start animation
initLine();
window.addEventListener('mousedown', handleMouseDown);
window.addEventListener('mousemove', handleMouseMove);
window.addEventListener('mouseup', handleMouseUp);
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initLine();
});
requestAnimationFrame(animate);
