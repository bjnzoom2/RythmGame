let tetoPearCalc;
let arrowImg;
let arrowReverseImg;
let songs = [];
let targetedSong = "";
let button;
let index = 0;

class Button {
    position = [0, 0];
    width = 100;
    height = 25;

    constructor(position, width, height) {
        this.position = position;
        this.width = width;
        this.height = height;
    }

    draw() {
        stroke(0);
        fill(255);
        rect(this.position[0], this.position[1], this.width, this.height, 10);

        fill(0);
        textSize(32);
        textAlign(CENTER, CENTER);
        text("Select", this.position[0] + this.width / 2, this.position[1] + this.height / 2);
    }

    update(func) {
        if (mouseX > this.position[0] && mouseX < this.position[0] + this.width && mouseY > this.position[1] && mouseY < this.position[1] + this.height) {
            func();
        }
    }
}

function preload() {
    tetoPearCalc = loadImage('../charts/tetoPearCalc/tetoPearCalc.jpg');
    arrowImg = loadImage('./arrow.png');
    arrowReverseImg = loadImage('./arrowReversed.png');
}

function setup() {
    let canvas = createCanvas(720, 720);
    canvas.class('canvas');

    button = new Button([260, 550], 200, 50);

    songs.push("Teto Pear On The Calculator");
    targetedSong = songs[0];
}

function draw() {
    background("#333");

    stroke("#222");
    fill("#222");
    rect(195, 10, 330, 330);

    imageMode(CORNER);
    image(tetoPearCalc, 210, 25, 300, 300);

    textSize(32);
    textAlign(CENTER, CENTER);
    stroke("#000");
    fill("#fff");
    text("Teto Pear On The Calculator", 360, 420);

    imageMode(CENTER);
    image(arrowImg, 550, 575, 30, 30);
    image(arrowReverseImg, 170, 575, 30, 30);

    button.draw();
}

function mousePressed() {
    button.update(() => {
        localStorage.setItem("Song", targetedSong);
        window.open("../game/game.html");
    });
}

function keyPressed() {
    if (keyCode == LEFT_ARROW) {
        index -= 1;
        if (index < 0) index = songs.length - 1;
    } else if (keyCode == RIGHT_ARROW) {
        index += 1;
        if (index >= songs.length) index = 0;
    }
    targetedSong = songs[index];
    console.log(index, targetedSong);
}