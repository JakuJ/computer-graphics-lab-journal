// @ts-nocheck
/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

class PerlinNoise {
    constructor(gridWidth, gridHeight) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.grid = [];

        for (let i = 0; i < this.gridHeight + 1; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.gridWidth + 1; j++) {
                let angle = Math.random() * 2 * Math.PI;
                this.grid[i][j] = vec2(Math.cos(angle), Math.sin(angle));
            }
        }
    }

    sample(x, y) {
        if(Number.isNaN(x) || Number.isNaN(y)){
            throw new Error("Argument is NaN");
        }

        if(x < 0 || x > 1 || y < 0 || y > 1){
            throw new Error("Argument out of range");
        }

        let gridX = x * this.gridWidth;
        let gridY = y * this.gridHeight;

        let i = Math.floor(gridY);
        let j = Math.floor(gridX);

        let point = vec2(gridX, gridY);

        let vals = [
            [j, i],
            [j + 1, i],
            [j, i + 1],
            [j + 1, i + 1]
        ].map(([_j, _i]) => {
            let corner = vec2(_j, _i);
            let grad = this.grid[_i][_j];
            let dist = subtract(point, corner);
            return dot(dist, grad);
        })

        const ix0 = PerlinNoise.interpolate(vals[0], vals[1], gridX - j);
        const ix1 = PerlinNoise.interpolate(vals[2], vals[3], gridX - j);
        const height = PerlinNoise.interpolate(ix0, ix1, gridY - i);

        return height / Math.sqrt(2 / 4);
    }

    static interpolate(a, b, w) {
        return a + w * (b - a);
    }
}

function context() {
    // Prepare WebGL
    var canvas = document.getElementById("canvas1");
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    var gl = setupWebGL(canvas);

    // Load shaders
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    const pixelWidth = 300;
    const pixelHeight = 300;

    const generators = [];
    for (let i = 1; i <= 6; i++) {
        generators.push(new PerlinNoise(i * i, i * i));
    }

    const vertices = [];

    for (let y = 0; y < pixelHeight; y++) {
        for (let x = 0; x < pixelWidth; x++) {
            let normY = y / pixelHeight;
            let normX = x / pixelWidth;

            let height = 0.5;
            let amp = 1;

            for (let gen of generators) {
                amp /= 2;
                height += amp * gen.sample(normX, normY);
            };

            height = Math.max(0, Math.min(1, height));

            vertices.push(vec3(x / pixelWidth, height, y / pixelHeight));
        }
    }

    var elems = [];

    function quad(a, b, c, d) {
        [a, b, c, a, c, d].forEach(ix => {
            elems.push(vertices[ix]);
        });
    }

    for (let y = 0; y < pixelHeight - 1; y++) {
        for (let x = 0; x < pixelWidth - 1; x++) {
            let ix = y * pixelWidth + x;
            let ix2 = (y + 1) * pixelWidth + x;
            quad(ix2, ix2 + 1, ix + 1, ix);
        }
    }

    const vPosition = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vPosition);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(elems), gl.STATIC_DRAW);

    {
        let vLocation = gl.getAttribLocation(program, 'vPosition');
        gl.vertexAttribPointer(vLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vLocation);
    }

    var player = {
        position: vec3(0, 0, 0),
        speed: 0.5,
        pitch: 0,
        yaw: 0,
        roll: 0,
        pressed: {
            'w': false,
            's': false,
            'a': false,
            'd': false,
            'q': false,
            'e': false,
            'shift': false,
            'z': false
        }
    };

    window.onkeydown = e => {
        player.pressed[e.key.toLowerCase()] = true;
    };

    window.onkeyup = e => {
        player.pressed[e.key.toLowerCase()] = false;
    };

    canvas.onmousemove = event => {
        const bbox = event.target.getBoundingClientRect();
        let x = (event.clientX - bbox.left) / canvas.clientWidth;
        let y = (canvas.clientHeight - (event.clientY - bbox.top)) / canvas.clientHeight;

        const leftright = 360;
        const updown = 180;

        player.yaw = leftright * (x - 0.5);
        player.pitch = updown * (y - 0.5);
    };

    function render() {
        // background
        gl.clearColor(0.5, 0.9, 1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // update look-at point position
        player.roll += (player.pressed['q'] - player.pressed['e']) * 1;

        const forward = vec3([rotateY(player.yaw), rotateX(player.pitch), vec4(0, 0, 1, 0)].reduce(mult));
        const right = vec3([rotateY(player.yaw), rotateZ(player.roll), vec4(-1, 0, 0, 0)].reduce(mult));
        const up = normalize(cross(right, forward));

        // update player position
        player.position = add(player.position, scale((player.pressed['w'] - player.pressed['s']) * player.speed, forward));
        player.position = add(player.position, scale((player.pressed['d'] - player.pressed['a']) * player.speed, right));
        player.position = add(player.position, scale((player.pressed['shift'] - player.pressed['z']) * player.speed, up));

        // TODO: Solve the roll mystery
        var viewMatrix = [
            perspective(45, canvas.width / canvas.height, 1, 500), // perspective projection
            lookAt(player.position, add(player.position, forward), up), // look-at matrix
            scalem(100, 100, 100), // world size
            scalem(1, .5, 1), // noise height proportions
            translate(-.5, -1, -.5), // scale down only
        ].reduce(mult);

        {
            let uLocation = gl.getUniformLocation(program, 'vMatrix');
            gl.uniformMatrix4fv(uLocation, false, flatten(viewMatrix));
        }


        uLocation = gl.getUniformLocation(program, 'vGradient');
        gl.uniform3fv(uLocation, flatten([1, 0, 0]));
        uLocation = gl.getUniformLocation(program, 'vBias');
        gl.uniform3fv(uLocation, flatten([0, .6, 0]));

        gl.drawArrays(gl.TRIANGLES, 0, elems.length);

        uLocation = gl.getUniformLocation(program, 'vGradient');
        gl.uniform3fv(uLocation, flatten([0, 0, 0]));
        uLocation = gl.getUniformLocation(program, 'vBias');
        gl.uniform3fv(uLocation, flatten([0.2, 0.2, 0.2]));

        gl.drawArrays(gl.POINTS, 0, elems.length);

        window.requestAnimationFrame(render);
    }

    gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(2, 3);

    window.requestAnimationFrame(render);
}

context()