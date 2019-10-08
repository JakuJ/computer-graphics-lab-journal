// @ts-nocheck
/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
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

    const pixelWidth = 300,
        pixelHeight = 300;
    var noiseGrid = PerlinNoise.fractal_noise(pixelWidth, pixelHeight, 6);
    var vertices = [];

    function quad(a, b, c, d) {
        [a, b, c, a, c, d].forEach(ix => {
            vertices.push(noiseGrid[ix]);
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
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    {
        let vLocation = gl.getAttribLocation(program, 'vPosition');
        gl.vertexAttribPointer(vLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vLocation);
    }

    var camera = new SimpleCamera(vec3(0, 0, 0), 45, 0, 500, canvas);

    function render() {
        // background
        gl.clearColor(0.5, 0.9, 1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var viewMatrix = [
            camera.update(),
            scalem(100, 100, 100), // world size
            scalem(1, .5, 1), // noise height proportions
            translate(-.5, -1, -.5), // scale down only
        ].reduce(mult);

        // Draw terrain using triangles
        {
            let uLocation = gl.getUniformLocation(program, 'vMatrix');
            gl.uniformMatrix4fv(uLocation, false, flatten(viewMatrix));
        } {
            let uLocation = gl.getUniformLocation(program, 'vGradient');
            gl.uniform3fv(uLocation, flatten([1, 0, 0]));
        } {
            let uLocation = gl.getUniformLocation(program, 'vBias');
            gl.uniform3fv(uLocation, flatten([0, .6, 0]));
        }

        gl.drawArrays(gl.TRIANGLES, 0, vertices.length);

        // Draw points to show vertices
        {
            let uLocation = gl.getUniformLocation(program, 'vGradient');
            gl.uniform3fv(uLocation, flatten([0, 0, 0]));
        } {
            let uLocation = gl.getUniformLocation(program, 'vBias');
            gl.uniform3fv(uLocation, flatten([0.2, 0.2, 0.2]));
        }

        gl.drawArrays(gl.POINTS, 0, vertices.length);

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