// @ts-nocheck
/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

function context2() {
    // Prepare WebGL
    var canvas = document.getElementById("canvas2");
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
        var indices = [a, b, b, c, c, d, d, a];
        elems.push(...indices.map(x => x - 1));
    }

    function colorCube() {
        quad(2, 1, 5, 6);
        quad(6, 5, 8, 7);
        quad(5, 1, 4, 8);
        quad(2, 6, 7, 3);
        quad(4, 3, 7, 8);
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

    function render() {
        gl.clearColor(0.7, 0.7, 0.7, 1.0);
        gl.cullFace(gl.BACK);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Projection 1
        var viewMatrix1 = [
            translate(0, .5, 0),
            scalem(.5, .5, .5),
            perspective(45, 1, 2, 3),
            lookAt(vec3(.5, .5, 3), vec3(.5, .5, .5), vec3(0, 1, 0))
        ].reduce(mult);
        
        
        let uLocation1 = gl.getUniformLocation(program, 'vMatrix');
        gl.uniformMatrix4fv(uLocation1, false, flatten(viewMatrix1));
        gl.drawElements(gl.LINES, elems.length, gl.UNSIGNED_BYTE, 0);

        // Projection 2
        var viewMatrix2 = [
            translate(-.5, -.5, 0),
            scalem(.5, .5, .5),
            perspective(45, 1, 1, 10),
            translate(0, 0, -2),
            lookAt(vec3(0, .5, 1), vec3(.5, .5, .5), vec3(0, 1, 0))
        ].reduce(mult);

        let uLocation2 = gl.getUniformLocation(program, 'vMatrix');
        gl.uniformMatrix4fv(uLocation2, false, flatten(viewMatrix2));
        gl.drawElements(gl.LINES, elems.length, gl.UNSIGNED_BYTE, 0);

        // Projection 3
        var viewMatrix3 = [
            translate(.5, -.5, 0),
            scalem(.5, .5, .5),
            perspective(45, 1, 1, 2),
            translate(0, 0, -2),
            lookAt(vec3(0, 1, 1), vec3(.5, .5, .5), vec3(0, 1, 0))
        ].reduce(mult);

        let uLocation3 = gl.getUniformLocation(program, 'vMatrix');
        gl.uniformMatrix4fv(uLocation3, false, flatten(viewMatrix3));
        gl.drawElements(gl.LINES, elems.length, gl.UNSIGNED_BYTE, 0);
    }

    window.requestAnimationFrame(render);
}

context2()