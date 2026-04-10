window.addEventListener("keydown", function(e) {
    if(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
}, { capture: true, passive: false });

// Keys
var left;
var down;
var up;
var right;

// Data
var score = 0;
var accuracyText = "";
var timeElapsed = 0;
var strokeThickness = 1;

var canvasWidth;
var canvasHeight;

var leftPosX;
var downPosX;
var upPosX;
var rightPosX;

var diam;
var keyHeight;

// Arrays
var keys = [];
var notes = [];
var texts = [];

// Chart stuff
var tetoPearChart;
var tetoPearSong;
var tetoPearImg;

var signalingChart;
var signalingSong;
var signalingImg;
var signalingVid;

// Chosen chart
var chosenSong;
var chart;
var song;
var img;
var vid;

// Song vars
var start = false;
var songEnd = false;

// Enums
const KeyTypes = {
    LEFT : 0, 
    DOWN : 1, 
    UP : 2,
    RIGHT : 3
}

const NoteTypes = {
    SHORT : 0,
    LONG : 1
}

const NoteDamageTypes = {
    NORMAL: 0,
    DAMAGE: 1
}

class Key {
    fillCol = "#aaa";
    clickFillCol = "#fff";
    position = [0, 0];
    diameter = 60;
    key = 32;
    keyType;

    isDownLastFrame = false;
    currentScale = 1;

    constructor(fillCol, clickFillCol, position, diameter, keyType) {
        this.fillCol = fillCol;
        this.clickFillCol = clickFillCol;
        this.position = position;
        this.diameter = diameter;
        this.keyType = keyType;

        const arrowKeys = [LEFT_ARROW, DOWN_ARROW, UP_ARROW, RIGHT_ARROW];
        const sdjk = [83, 68, 74, 75];
        const fghj = [70, 71, 72, 74]
        this.key = arrowKeys[keyType] || 32;
    }

    drawKey() {
        let isDown = keyIsDown(this.key);

        let targetScale = isDown ? 0.95 : 1.0; 
        this.currentScale = lerp(this.currentScale, targetScale, 0.4);

        push();
        
        translate(this.position[0], this.position[1] + this.diameter / 2);
        scale(this.currentScale);

        stroke("#000");
        strokeWeight(strokeThickness);
        fill(isDown ? this.clickFillCol : this.fillCol);
        rect(-this.diameter / 2, -this.diameter / 2, this.diameter, this.diameter, this.diameter);

        pop();
    }

    update() {
        var currentlyDown = keyIsDown(this.key);
        let justPressed = currentlyDown && !this.isDownLastFrame;
        let songTime = timeElapsed - chart.metadata.offset;

        if (start) {
            if (justPressed) {
                for (var i = notes.length - 1; i >= 0; i--) {
                    var clickNote = notes[i];
                    
                    // Only look at notes in our column that aren't already being held
                    if (clickNote.noteKeyType == this.keyType && !clickNote.isBeingHeld) {
                        var d = abs(this.position[1] - clickNote.position[1]); // Vertical distance
                        
                        if (d < (this.diameter / 2 + clickNote.diameter / 2 + 10)) {
                            // Score the Head hit
                            if (d < 5) { texts.push(new AccuracyText("Perfect")); score += 50; }
                            else if (d < 15) { texts.push(new AccuracyText("Great")); score += 40; }
                            else if (d < 30) { texts.push(new AccuracyText("Good")); score += 30; }
                            else if (d < 40) { texts.push(new AccuracyText("Ok")); score += 15; }
                            else { texts.push(new AccuracyText("Bad")); score += 5; }

                            if (clickNote.noteType === NoteTypes.SHORT) {
                                notes.splice(i, 1); // Delete short notes
                            } else if (clickNote.noteType === NoteTypes.LONG) {
                                clickNote.isBeingHeld = true; // Lock the long note!
                            }
                            break; // Only hit one note per press
                        }
                    }
                }
            }

            for (var i = notes.length - 1; i >= 0; i--) {
                var clickNote = notes[i];
                
                if (clickNote.noteKeyType == this.keyType && clickNote.isBeingHeld) {
                    if (!currentlyDown) {
                        // The player let go too early!
                        score -= 10;
                        notes.splice(i, 1);
                    } else if (songTime >= clickNote.tailTime) {
                        texts.push(new AccuracyText("Perfect"));
                        score += 50;
                        notes.splice(i, 1);
                    }
                }
            }

            for (var i = notes.length - 1; i >= 0; i--) {
                var clickNote = notes[i];
                
                if (clickNote.noteKeyType == this.keyType && !clickNote.isBeingHeld) {
                    // If the head of the note falls too far past the receptor
                    if (!clickNote.noteType) {
                        if (clickNote.position[1] < this.position[1] - this.diameter * 2) {
                            texts.push(new AccuracyText("Miss"));
                            score -= 20;
                            notes.splice(i, 1);
                        }
                    } else {
                        if (clickNote.position[1] < this.position[1] - this.diameter - clickNote.noteLength) {
                            texts.push(new AccuracyText("Miss"));
                            score -= 20;
                            notes.splice(i, 1);
                        }
                    }
                }
            }
        }

        this.isDownLastFrame = currentlyDown;
    }
}

class Note {
    fillCol = "#fff";
    diameter = diam;
    position = [0, 0];
    noteSpeed = 1;
    spawnTime = 0;
    tailTime = 0;
    noteKeyType = 0;

    noteType = 0;
    noteLength = diam;
    isBeingHeld = false;

    noteDamageType = 0;

    constructor(fillCol, diameter, noteSpeed, spawnTime, noteKeyType, noteType, holdDuration = 0, noteDamageType) {
        this.fillCol = fillCol;
        this.diameter = diameter;
        this.noteSpeed = noteSpeed;
        this.spawnTime = spawnTime;
        this.tailTime = spawnTime + holdDuration;
        this.noteKeyType = noteKeyType;
        this.noteType = noteType
        this.noteDamageType = noteDamageType;

        switch (noteKeyType) {
            case 0:
                this.position[0] = leftPosX;
                break;
            case 1:
                this.position[0] = downPosX;
                break;
            case 2:
                this.position[0] = upPosX;
                break;
            case 3:
                this.position[0] = rightPosX;
                break;
            default:
                console.log("Invalid Key Type");
        }
    }

    drawNote() {
        if (this.position[1] > canvasHeight && !this.isBeingHeld) return;

        stroke("#000");
        strokeWeight(strokeThickness);
        fill("#fff");
        let drawY = this.position[1];
        let drawLen = this.noteLength;

        // If it's a long note that is currently being held down
        if (this.noteType === NoteTypes.LONG && this.isBeingHeld) {
            let songTime = timeElapsed - chart.metadata.offset;
            let msUntilTail = this.tailTime - songTime;
            
            drawY = diam; // Pin the head to the receptor key
            drawLen = msUntilTail * (this.noteSpeed / 1000); // Shrink the tail
            
            if (drawLen < diam) drawLen = diam; // Prevent reverse drawing
        }

        rect(this.position[0] - this.diameter / 2, drawY, this.diameter, drawLen, this.diameter);
    }

    update() {
        var songTime = timeElapsed - chart.metadata.offset;
        var msUntilHit = this.spawnTime - songTime;
        var speedPxMs = this.noteSpeed / 1000;
        this.position[1] = diam + (msUntilHit * speedPxMs);

        if (this.noteType === NoteTypes.LONG) {
            this.noteLength = (this.tailTime - this.spawnTime) * speedPxMs;
            if (this.noteLength < diam) this.noteLength = diam; // Minimum visual length
        }
    }
}

class AccuracyText {
    position = [8, 0];
    strokeCol = [0, 0, 0, 255];
    fillCol = [255, 255, 255, 255];
    textContent = "";

    constructor(textContent) {
        this.textContent = textContent;

        this.position[1] = canvasHeight / 2 - 16;
    }

    drawText() {
        textSize(16);
        textAlign(LEFT, TOP);
        stroke(this.strokeCol);
        fill(this.fillCol);
        text(this.textContent, this.position[0], this.position[1]);
    }

    update() {
        this.position[1] -= 25 * (deltaTime / 1000);
        this.fillCol[3] -= 200 * (deltaTime / 1000);
        this.strokeCol[3] -= 200 * (deltaTime / 1000);

        if (this.fillCol[3] <= 0 || this.strokeCol[3] <= 0) {
            texts.splice(texts.indexOf(this), 1);
        }
    }
}

function preload() {
    tetoPearChart = loadJSON('../charts/tetoPearCalc/chart.json'); 
    tetoPearSong = loadSound('../charts/tetoPearCalc/tetoPearCalc.mp3');
    tetoPearImg = loadImage('../charts/tetoPearCalc/tetoPearCalc.jpg');

    signalingChart = loadJSON('../charts/signaling/chart.json'); 
    signalingSong = loadSound('../charts/signaling/signaling.mp3');
    signalingImg = loadImage('../charts/signaling/signaling.jpg');

    signalingVid = createVideo('../charts/signaling/signaling.mp4');
    signalingVid.hide();
}

function setup() {
    var speedMultiplier;
    chosenSong = localStorage.getItem("Song");
    if (chosenSong == "Teto Pear On The Calculator") {
        canvasWidth = 720;
        canvasHeight = 720;

        chart = tetoPearChart;
        song = tetoPearSong;
        img = tetoPearImg;
        vid = null;

        leftPosX = 240;
        downPosX = 320;
        upPosX = 400;
        rightPosX = 480;

        diam = 60;
        keyHeight = 60;
        speedMultiplier = 6;
        strokeThickness = 2;
    } else if (chosenSong == "Signaling") {
        canvasWidth = 1280;
        canvasHeight = 720;

        chart = signalingChart;
        song = signalingSong;
        img = signalingImg;
        vid = signalingVid;

        vid.volume(0);

        leftPosX = 499.996;
        downPosX = 593.332;
        upPosX = 686.668;
        rightPosX = 780.004;

        diam = 70;
        keyHeight = 70;
        speedMultiplier = 4.25;
        strokeThickness = 2;
    }

    var canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.class("canvas");

    left = new Key("#bbb", "#fff", [leftPosX, keyHeight], diam, KeyTypes.LEFT);
    down = new Key("#bbb", "#fff", [downPosX, keyHeight], diam, KeyTypes.DOWN);
    up = new Key("#bbb", "#fff", [upPosX, keyHeight], diam, KeyTypes.UP);
    right = new Key("#bbb", "#fff", [rightPosX, keyHeight], diam, KeyTypes.RIGHT);
    keys.push(left, down, up, right);
    var speed = 100 / (60000 / chart.metadata.bpm) * speedMultiplier * 1000;
    for (var i = 0; i < chart.notes.length; i++) {
        var time = chart.notes[i].time;
        var keytype = chart.notes[i].keyType;
        var notetype = chart.notes[i].noteType;
        var holdDur = chart.notes[i].holdDuration;

        var note = new Note("#fff", diam, speed, time, keytype, notetype, holdDur);
        notes.push(note);
    }

    song.onended(function() {
        songEnd = true;
    });
}

function draw() {
    background("#fff");

    if (start && vid) {
        image(vid, 0, 0, canvasWidth, canvasHeight);
    } else {
        image(img, 0, 0, canvasWidth, canvasHeight);
    }

    if (song.isPlaying()) {
        timeElapsed = song.currentTime() * 1000; 

        if (vid && vid.elt.readyState >= 2) { // Ensure video is loaded enough to play
            let songSecs = song.currentTime();
            let vidSecs = vid.time();

            // If video is more than 100ms out of sync, snap it to the song
            if (abs(songSecs - vidSecs) > 0.1) {
                vid.time(songSecs);
            }
        }
    }

    strokeWeight(1);

    textSize(19);
    textAlign(LEFT, TOP);
    stroke("#000");
    fill("#fff");
    text("Score: " + score, 8, 19);

    stroke(0, 0, 0, 75);
    fill(0, 0, 0, 75);
    rect(leftPosX - 60, -1, rightPosX - leftPosX + 120, canvasHeight + 1);

    let fps = frameRate();
    textSize(19);
    textAlign(RIGHT, TOP);
    stroke("#000");
    fill("#fff");
    text("FPS: " + Math.floor(fps), canvasWidth - 8, 19);

    if (!start) {
        textSize(38);
        textAlign(CENTER, CENTER);
        stroke("#000");
        fill("#fff");
        text("Press 1 to start", canvasWidth / 2, canvasHeight / 2);
    }

    if (songEnd) {
        textSize(38);
        textAlign(CENTER, CENTER);
        stroke("#000");
        fill("#fff");
        text("Finished", canvasWidth / 2, canvasHeight / 2 - 32);
        text("Score: " + score, canvasWidth / 2, canvasHeight / 2 + 32);
    }

    for (var i = 0; i < keys.length; i++) {
        keys[i].drawKey();
        keys[i].update();
    }
    if (!start) return;
    for (var i = 0; i < notes.length; i++) {
        notes[i].drawNote();
        notes[i].update();
    }
    for (var i = 0; i < texts.length; i++) {
        texts[i].drawText();
        texts[i].update();
    }
}

function keyPressed() {
    if (key == "1" && !start) {
        start = true;

        if (song && !song.isPlaying()) {
            song.play();
        }
        
        if (vid) {
            vid.time(0);
            vid.play();
        }
    }
}