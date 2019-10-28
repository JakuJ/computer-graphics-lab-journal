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
    var gl = setupWebGL(canvas);

    // Load shaders
    var program = initShaders(gl, "vertex-shader-1", "fragment-shader-1");
    gl.useProgram(program);

    // POSITIONS
    const vertices = [
        vec3(0, 0, 1),
        vec3(1, 0, 1),
        vec3(1, 1, 1),
        vec3(0, 1, 1),
        vec3(0, 0, 0),
        vec3(1, 0, 0),
        vec3(1, 1, 0),
        vec3(0, 1, 0)
    ];


    const vertexColors = [
        [0.0, 0.0, 0.0], // black
        [1.0, 0.0, 0.0], // red
        [1.0, 1.0, 0.0], // yellow
        [0.0, 1.0, 0.0], // green
        [0.0, 0.0, 1.0], // blue
        [1.0, 0.0, 1.0], // magenta
        [1.0, 1.0, 1.0], // white
        [0.0, 1.0, 1.0] // cyan
    ];

    var elems = [];

    function quad(a, b, c, d) {
        var indices = [a, b, c, a, c, d];
        elems.push(...indices.map(x => x - 1));
    }

    function colorCube() {
        quad(2, 1, 5, 6);
        quad(6, 5, 8, 7);
        quad(5, 1, 4, 8);
        quad(4, 3, 7, 8);
        quad(2, 6, 7, 3);
        quad(1, 2, 3, 4);
    }

    colorCube();

    const vPosition = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vPosition);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    {
        let vLocation = gl.getAttribLocation(program, 'vPosition');
        gl.vertexAttribPointer(vLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vLocation);
    }

    const vColor = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vColor);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

    {
        let vLocation = gl.getAttribLocation(program, 'vColor');
        gl.vertexAttribPointer(vLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vLocation);
    }

    const vElems = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vElems);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(elems), gl.STATIC_DRAW);

    function render(time) {
        // background
        gl.clearColor(0.7, 0.7, 0.7, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // view
        var viewMatrix = [
            perspective(45, 1, 1, 5),
            translate(0, 0, -2),
            lookAt(vec3(1, 1, 1), vec3(.5, .5, .5), vec3(0, 1, 0)),
            translate(.5, .5, .5),
            rotateY(time / 20),
            translate(-.5, -.5, -.5)
        ].reduce(mult);

        let uLocation = gl.getUniformLocation(program, 'vMatrix');
        gl.uniformMatrix4fv(uLocation, false, flatten(viewMatrix));

        // points
        gl.drawElements(gl.TRIANGLES, elems.length, gl.UNSIGNED_BYTE, 0);
        window.requestAnimationFrame(render);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    window.requestAnimationFrame(render);
}

context()