let tetoPearCalc;
let buttons = [];

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
}

function setup() {
    let canvas = createCanvas(720, 720);
    canvas.class('canvas');

    let button = new Button([260, 550], 200, 50);
    buttons.push(button);
}

function draw() {
    background("#333");

    stroke("#222");
    fill("#222");
    rect(195, 10, 330, 330);

    image(tetoPearCalc, 210, 25, 300, 300);

    textSize(32);
    textAlign(CENTER, CENTER);
    stroke("#000");
    fill("#fff");
    text("Teto Pear On The Calculator", 360, 420);

    for (var i = 0; i < buttons.length; i++) {
        buttons[i].draw();
    }
}

function mousePressed() {
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].update(() => {
            console.log("Hi");  
        });
    }
}