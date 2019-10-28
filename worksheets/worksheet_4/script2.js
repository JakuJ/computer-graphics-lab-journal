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
    var canvas = document.getElementById("canvas2");
    var gl = setupWebGL(canvas);

    // Load shaders
    var program = initShaders(gl, "vertex-shader-2", "fragment-shader-2");
    gl.useProgram(program);

    // POSITIONS
    const vertices = [
        vec3(1, -1, -1),
        vec3(-1, 1, -1),
        vec3(-1, -1, 1),
        vec3(1, 1, 1),
    ].map(x => scale(1 / Math.sqrt(3), x));

    var elems = [];

    function triangle(a, b, c) {
        elems.push(a, c, b); // TRIANGLES
    }

    function tetrahedron(a, b, c, d, n) {
        divideTriangle(a, b, c, n);
        divideTriangle(d, c, b, n);
        divideTriangle(a, d, b, n);
        divideTriangle(a, c, d, n);
    }

    function divideTriangle(a, b, c, count) {
        if (count > 1) {
            var ab = normalize(mix(a, b, 0.5));
            var ac = normalize(mix(a, c, 0.5));
            var bc = normalize(mix(b, c, 0.5));

            divideTriangle(a, ab, ac, count - 1);
            divideTriangle(ab, b, bc, count - 1);
            divideTriangle(bc, c, ac, count - 1);
            divideTriangle(ab, bc, ac, count - 1);
        } else {
            triangle(a, b, c);
        }
    }

    function redraw_sphere(subdivision) {
        elems = [];
        tetrahedron(...vertices, subdivision);

        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(elems), gl.STATIC_DRAW);

        let vLocation = gl.getAttribLocation(program, 'vPosition');
        gl.vertexAttribPointer(vLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vLocation);
    }

    var subdivision = 1;
    redraw_sphere(subdivision);

    function increase_subdivision() {
        subdivision = Math.min(8, subdivision + 1);
        redraw_sphere(subdivision);
    }

    function decrease_subdivision() {
        subdivision = Math.max(1, subdivision - 1);
        redraw_sphere(subdivision);
    }

    document.getElementById("increase_subdivision2").onclick = increase_subdivision;
    document.getElementById("decrease_subdivision2").onclick = decrease_subdivision;

    function render(time) {
        // background
        gl.clearColor(0.7, 0.7, 0.7, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // view
        var viewMatrix = [
            perspective(45, 1, 1, 6),
            translate(0, 0, -3),
            rotateY(time / 20),
        ].reduce(mult);

        let uLocation = gl.getUniformLocation(program, 'vMatrix');
        gl.uniformMatrix4fv(uLocation, false, flatten(viewMatrix));

        // points
        gl.drawArrays(gl.TRIANGLES, 0, elems.length);
        window.requestAnimationFrame(render);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    window.requestAnimationFrame(render);
}

context()