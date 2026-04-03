window.addEventListener('keydown', function(e) {
  if (e.key === " ") {
    if (e.target === document.body) {
      e.preventDefault();
    }
  }
});

let song;
let click;
let bpm = 91;
let offset = 1100;
let gridSnap = 16; // 64th notes
let zoom = 0.6;   // Visual stretch

let scrollY = 0;
let editorNotes = []; 
let editorNotesClickSound = [];
let timeToStart = 0;

let openChart = document.getElementById("chartJson");
let opened = false;

let slider = document.getElementById("slider");
let sensitivity = document.getElementById("sliderInfo");

const cols = [200, 266.667, 333.333, 400];
const colWidth = 50;

let draggingNote = null; // Tracks the note we are currently stretching

function preload() {
    // Load your audio file here
    song = loadSound('../charts/Test/tetoPearCalc.mp3');
    click = loadSound('../click.wav')
}

function setup() {
    createCanvas(600, 800);
    click.playMode('restart');
    click.setVolume(0.2);
    song.playMode('sustain');
    song.setVolume(0.6);

    sensitivity.innerText = "Sensitivity: " + slider.value;

    openChart.addEventListener('change', function() {
        const file = openChart.files[0];
        if (file) {
            file.text().then(text => {
                let json = JSON.parse(text);
                editorNotes = json.notes;
                editorNotesClickSound = new Array(editorNotes.length).fill(false);
                opened = true;
                console.log("Chart Loaded");
            });
        }
    });
}

function draw() {
    background(30);

    let currentMs = song.currentTime() * 1000;
    let chartTime = currentMs - offset; 

    let msPerBeat = 60000 / bpm;
    let msPerStep = msPerBeat / gridSnap;
    let stepHeight = msPerStep * zoom;

    // Auto-scroll the camera to follow the playhead when the song is playing
    if (song.isPlaying()) {
        scrollY = (chartTime * zoom) - (height / 2);
    }

    push();
    translate(0, -scrollY);


    let startStep = Math.max(0, Math.floor(scrollY / stepHeight));
    let endStep = startStep + Math.ceil(height / stepHeight) + 1;
    // 1. Draw Grid Lines
    for (let i = startStep; i < endStep; i++) { 
        let y = i * stepHeight;
        let timeAtThisLine = i * msPerStep;

        if (i % gridSnap === 0) {
            stroke(150);
            strokeWeight(2);
            line(150, y, 450, y);

            // Time Label
            fill(180);
            noStroke();
            textSize(11);
            text(Math.floor(timeAtThisLine) + "ms", 465, y + 4);
            
            // Optional: Draw Beat Number
            fill(100, 200, 255); // Light Blue
            text("Beat " + (i / gridSnap), 100, y + 4);
        } else {
            stroke(60);
            strokeWeight(1);
            line(150, y, 450, y);
        }
    }

    // 2. Draw Column Lines
    stroke(100);
    strokeWeight(1);
    for (let i = 0; i < cols.length; i++) {
        let x = cols[i];
        let topY = Math.max(0, scrollY);
        line(x, topY, x, scrollY + height);
    }

    // 3. Draw Placed Notes
    for (let i = 0; i < editorNotes.length; i++) {
        let n = editorNotes[i];
        let noteY = n.time * zoom;
        let tailY = n.noteType === 1 ? (n.time + n.holdDuration) * zoom : noteY;
        let noteX = cols[n.keyType];

        if (tailY < scrollY - 50 || noteY > scrollY + height + 50) {
            continue; 
        }
        
        stroke(0);
        
        if (n.noteType === 1) { // --- LONG NOTE ---
            let len = tailY - noteY;
            
            // Draw the long body connecting the head and tail
            rectMode(CORNER);
            fill(150, 200, 255, 200); // Light blue trail
            rect(noteX - colWidth/2, noteY, colWidth, len);
            
            // Draw the Head and Tail caps
            rectMode(CENTER);
            fill(255);
            rect(noteX, noteY, colWidth, 50, colWidth); // Head
            rect(noteX, tailY, colWidth, 50, colWidth); // Tail
        } else { // --- SHORT NOTE ---
            rectMode(CENTER);
            fill(255);
            rect(noteX, noteY, colWidth, 50, colWidth); 
        }
    }

    let playedClickThisFrame = false;
    for (var i = 0; i < editorNotes.length; i++) {
        var n = editorNotes[i];
        if (chartTime >= n.time && !editorNotesClickSound[i]) {
            if (song.isPlaying() && !playedClickThisFrame) {
                click.play();
                playedClickThisFrame = true;
            }
            editorNotesClickSound[i] = true;
        } else if (chartTime < n.time) {
            editorNotesClickSound[i] = false; 
        }
    }
    
    pop();

    stroke(255, 0, 0); 
    strokeWeight(3);
    line(150, height / 2, 450, height / 2)

    // UI Overlay
    fill(255);
    noStroke();
    textSize(16);
    //text("Chart Time: " + Math.floor(chartTime) + " ms", 430, 30);
    text("Song Time: " + Math.floor(currentMs) + " ms", 430, 30);
}

function mousePressed() {
    if (mouseX < 150 || mouseX > 450) return;

    let msPerBeat = 60000 / bpm;
    let msPerStep = msPerBeat / gridSnap;
    
    let gridTime = (mouseY + scrollY) / zoom;
    let snappedTime = Math.round(gridTime / msPerStep) * msPerStep;

    let keyType = -1;
    for (let i = 0; i < cols.length; i++) {
        if (Math.abs(mouseX - cols[i]) < colWidth / 2) {
            keyType = i; break;
        }
    }

    if (keyType !== -1) {
        let exactTime = Math.floor(snappedTime);
        let existingIndex = editorNotes.findIndex(n => n.time === exactTime && n.keyType === keyType);
        
        if (existingIndex > -1) {
            editorNotes.splice(existingIndex, 1); // Delete note
            editorNotesClickSound.splice(existingIndex, 1);
        } else {
            // Create a new note and set it as the "dragging" target
            let newNote = { "time": exactTime, "keyType": keyType, "noteType": 0, "holdDuration": 0 };
            editorNotes.push(newNote);
            editorNotesClickSound.push(false);
            draggingNote = newNote; 
        }
    }
}

// Triggers when you hold click and move the mouse
function mouseDragged() {
    if (draggingNote) {
        let msPerBeat = 60000 / bpm;
        let msPerStep = msPerBeat / gridSnap;
        let currentSnappedTime = Math.round(((mouseY + scrollY) / zoom) / msPerStep) * msPerStep;
        
        let duration = currentSnappedTime - draggingNote.time;
        
        if (duration >= msPerStep) {
            draggingNote.noteType = 1; // Convert to Long Note
            draggingNote.holdDuration = duration;
        } else {
            draggingNote.noteType = 0; // Convert back to Short Note if you drag back up
            draggingNote.holdDuration = 0;
        }
    }
}

// Triggers when you let go of the mouse click
function mouseReleased() {
    draggingNote = null; // Lock the note in place
}

function mouseWheel(event) {
    // Only allow manual scrolling when the song is paused
    if (!song.isPlaying()) {
        // Move the camera up or down based on mouse wheel
        scrollY += event.delta * slider.value;

        // Don't let the camera go above the start of the song
        if (scrollY < - (height / 2)) {
            scrollY = - (height / 2);
        }
    }
    return false;
}

function keyPressed() {
    // Play / Pause Toggle
    if (keyCode === 32) { // Spacebar
        if (song.isPlaying()) {
            song.pause();
        } else {
            // Jump playback to where the camera is currently looking
            // let timeToStart = (scrollY + height / 2) / zoom / 1000;
            // if (timeToStart < 0) timeToStart = 0;
            
            song.play();
            var newTime = (((scrollY + height / 2) / zoom) + offset) / 1000;
            song.jump(newTime);
        }
    }

    // Save JSON
    if (key === 's' || key === 'S') {
        editorNotes.sort((a, b) => a.time - b.time);
        
        let finalChart = {
            "metadata": { "bpm": bpm, "offset": offset },
            "notes": editorNotes
        };

        saveJSON(finalChart, 'test.json');
        console.log("Chart Saved!");
    }
}

slider.oninput = function() {
    sensitivity.innerText = "Sensitivity: " + this.value;
}