// @ts-nocheck
/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

const SLICES = 16;
var lastAnimationFrameId;

function renderNoiseTextures(gl, scale) {
    // Load shaders
    var noiseProgram = initShaders(gl, "vertex.vert", "noise.frag");
    gl.useProgram(noiseProgram);

    // Render to noise textures
    const NOISE_RESOLUTION = 256;
    const textures = [];

    for (let i = 0; i < SLICES; i++) {
        // Create a 2D texture
        const noiseTexture = gl.createTexture();
        textures.push(noiseTexture);

        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, noiseTexture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        // Create texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NOISE_RESOLUTION, NOISE_RESOLUTION, 0, gl.RGBA, gl.FLOAT, null);

        // Create framebuffer
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

        // Attach one face of cube map
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, noiseTexture, 0);

        // Create background so that fragments get rendered
        const vertices = [vec2(-1, -1), vec2(-1, 1), vec2(1, 1), vec2(1, -1)];

        // Send vertices to vertex shader
        {
            let position = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, position);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

            let location = gl.getAttribLocation(noiseProgram, 'position');
            gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(location);
        }

        {
            let location = gl.getUniformLocation(noiseProgram, 'aspectRatio');
            gl.uniform1f(location, 1);
        }

        // Send height to fragment shader
        {
            let uLocation = gl.getUniformLocation(noiseProgram, "height");
            gl.uniform1f(uLocation, i / SLICES);
        }

        // Send scale to fragment shader
        {
            let uLocation = gl.getUniformLocation(noiseProgram, "scale");
            gl.uniform1f(uLocation, scale);
        }

        gl.viewport(0, 0, NOISE_RESOLUTION, NOISE_RESOLUTION);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
            let status_code = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            console.log("Noise frame buffer " + i + " is not complete: " + status_code);
        } else {
            console.log("Noise texture created");
        }
    }
}

function initDrawing(gl, canvas) {
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

    for (let i = 0; i < SLICES; i++) {
        let location = gl.getUniformLocation(mainProgram, `texture${i}`);
        gl.uniform1i(location, i);
    }

    function render(time) {
        // background
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        {
            let location = gl.getUniformLocation(mainProgram, "time");
            gl.uniform1f(location, time / 1000);
        }

        gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);
        lastAnimationFrameId = window.requestAnimationFrame(render);
    }

    lastAnimationFrameId = window.requestAnimationFrame(render);
}

function context() {
    // Prepare WebGL
    var canvas = document.getElementById("canvas1");
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    var gl = setupWebGL(canvas);

    // Floating-point textures support
    var ext = gl.getExtension("OES_texture_float");
    if (!ext) {
        log("need OES_texture_float");
    }
    ext = gl.getExtension("OES_texture_float_linear");
    if (!ext) {
        log("need OES_texture_float_linear");
    }

    let scaleSlider = document.getElementById("scale");
    renderNoiseTextures(gl, scaleSlider.value);

    scaleSlider.oninput = () => {
        window.cancelAnimationFrame(lastAnimationFrameId);
        renderNoiseTextures(gl, scaleSlider.value);
        initDrawing(gl, canvas);
    };

    initDrawing(gl, canvas);
}

context()