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
    var program = initShaders(gl, "vertex.vert", "fragment.frag");
    gl.useProgram(program);

    // Create background so that fragments get rendered
    const vertices = [vec2(-1, -1), vec2(-1, 1), vec2(1, 1), vec2(1, -1)];

    // Send vertices to vertex shader
    {
        let position = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, position);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

        let location = gl.getAttribLocation(program, 'position');
        gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
    }

    function render(time) {
        // background
        gl.clearColor(0.5, 0.9, 1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        {
            let location = gl.getUniformLocation(program, "time");
            gl.uniform1f(location, time / 500);
        }

        var floatUniforms = {
            'Ka': document.getElementById("ka").value,
            'Kg': document.getElementById("kg").value,
            'Kd': document.getElementById("kd").value,
            'Ks': document.getElementById("ks").value,
            'shininess': document.getElementById("shininess").value,
            'attenuationCoefficient': document.getElementById("attenuationCoefficient").value
        };

        for (key in floatUniforms) {
            let uLocation = gl.getUniformLocation(program, key);
            gl.uniform1f(uLocation, floatUniforms[key]);
        }

        var flags = {
            'useShadows': document.getElementById("shadows").checked,
            'useAttenuation': document.getElementById("attenuation").checked
        }

        for (key in flags) {
            let uLocation = gl.getUniformLocation(program, key);
            gl.uniform1i(uLocation, flags[key]);
        }

        gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);
        window.requestAnimationFrame(render);
    }

    window.requestAnimationFrame(render);
}

context()