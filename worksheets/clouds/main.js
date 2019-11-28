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
    const mainProgram = initShaders(gl, "vertex.vert", "fragment.frag");
    gl.useProgram(mainProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Create background so that fragments get rendered
    const vertices = [vec2(-1, -1), vec2(-1, 1), vec2(1, 1), vec2(1, -1)];

    // Send vertices to vertex shader
    {
        let position = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, position);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

        let location = gl.getAttribLocation(mainProgram, 'position');
        gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
    }

    {
        let location = gl.getUniformLocation(mainProgram, 'aspectRatio');
        gl.uniform1f(location, canvas.width / canvas.height);
    }

    const variables = ['scale', 'threshold', 'multiplier', 'lightAbsorptionTowardsSun', 'lightAbsorptionThroughCloud', 'darknessThreshold'];
    const ticks = ['useLight', 'lookDown'];

    function render(time) {
        // background
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        {
            let location = gl.getUniformLocation(mainProgram, "time");
            gl.uniform1f(location, time / 1000);
        }

        variables.forEach(x => {
            let val = document.getElementById(x).value;
            let location = gl.getUniformLocation(mainProgram, x);
            gl.uniform1f(location, val);
        });

        ticks.forEach(x => {
            let val = document.getElementById(x).checked;
            let location = gl.getUniformLocation(mainProgram, x);
            gl.uniform1i(location, val);
        })


        gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);
        lastAnimationFrameId = window.requestAnimationFrame(render);
    }

    lastAnimationFrameId = window.requestAnimationFrame(render);
}

context()