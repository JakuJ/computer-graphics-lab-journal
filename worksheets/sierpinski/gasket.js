// @ts-nocheck

/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn’t available");
    }
    return gl;
}

function assign_attribute(gl, program, vectors, shape, name) {
    var buffer = gl.createBuffer(); // create a *vertex buffer object* on GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); // use this as our current buffer
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vectors), gl.STATIC_DRAW); // copy data to the buffer (send to GPU)

    var location = gl.getAttribLocation(program, name);
    gl.vertexAttribPointer(location, shape, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}

function n_level_sierpinski(n, gl, program) {
    const vertices = [
        vec3(-1, -1, 1),
        vec3(1, -1, -1),
        vec3(-1, 1, -1),
        vec3(1, 1, 1)
    ];

    const baseColors = [
        vec3(0.2, 0.2, 0.2),
        vec3(1, 0.5, 0.5),
        vec3(0.0, 0.5, 1.0),
        vec3(0.8, 0.95, 0.25)
    ];

    const points = [];
    const colors = [];

    function triangle(a, b, c, color) {
        points.push(a);
        colors.push(baseColors[color]);
        points.push(b);
        colors.push(baseColors[color]);
        points.push(c);
        colors.push(baseColors[color]);
    }

    function tetra(a, b, c, d) {
        triangle(a, c, b, 0);
        triangle(a, c, d, 1);
        triangle(a, b, d, 2);
        triangle(b, c, d, 3);
    }

    function sierpinski(a, b, c, d, count) {
        if (count == 0) {
            tetra(a, b, c, d);
        } else {
            const ab = mix(a, b, 0.5);
            const ac = mix(a, c, 0.5);
            const ad = mix(a, d, 0.5);
            const bc = mix(b, c, 0.5);
            const bd = mix(b, d, 0.5);
            const cd = mix(c, d, 0.5);

            sierpinski(a, ab, ac, ad, count - 1);
            sierpinski(ab, b, bc, bd, count - 1);
            sierpinski(ac, bc, c, cd, count - 1);
            sierpinski(ad, bd, cd, d, count - 1);
        }
    }

    sierpinski(...vertices, n);

    assign_attribute(gl, program, points, 3, "vPosition");
    assign_attribute(gl, program, colors, 3, "vColor");

    return points.length
}

var lastAnimation;

function renderCanvas() {
    // Initialize WebGL
    const canvas = document.getElementById("gl-canvas")
    const gl = setupWebGL(canvas)

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Enable z-buffer hidden-surface-removal algorithm
    gl.enable(gl.DEPTH_TEST);

    depth = document.getElementById("depth")
    pts = n_level_sierpinski(depth.value, gl, program)

    function render(time) {
        rotMatrix = [rotateX(time / 30), rotateY(time / 60), rotateZ(time / 90)].reduce(mult);

        const location = gl.getUniformLocation(program, 'vRotation');
        gl.uniformMatrix4fv(location, false, flatten(rotMatrix));

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, pts);
        lastAnimation = window.requestAnimationFrame(render)
    }

    lastAnimation = window.requestAnimationFrame(render);
}

window.onload = renderCanvas;
document.getElementById("depth").oninput = () => {
    window.cancelAnimationFrame(lastAnimation); // crucial for performance!
    renderCanvas();
}