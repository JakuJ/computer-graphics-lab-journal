// @ts-nocheck
/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

function createEmptyArrayBuffer(gl, program, var_name, num, type) {
    let buffer = gl.createBuffer(); // Create a buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    const a_attribute = gl.getAttribLocation(program, var_name);
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute); // Enable the assignment

    return buffer;
}

function createChessboard() {
    const texSize = 64;
    const numRows = 8;
    const numCols = 8;
    const numComponents = 4;
    let myImage = new Uint8Array(numComponents * texSize * texSize);

    for (let i = 0; i < texSize; ++i) {
        for (let j = 0; j < texSize; ++j) {
            let patchx = Math.floor(i / (texSize / numRows));
            let patchy = Math.floor(j / (texSize / numCols));
            let c = (patchx % 2 !== patchy % 2 ? 255 : 0);

            let index = numComponents * (i * texSize + j);
            myImage[index + 0] = c;
            myImage[index + 1] = c;
            myImage[index + 2] = c;
            myImage[index + 3] = 255;
        }
    }

    return myImage;
}

function context() {
    // Prepare WebGL
    let canvas = document.getElementById("canvas1");
    let gl = setupWebGL(canvas);

    // Load shaders
    let program = initShaders(gl, "vertex-shader-1", "fragment-shader-1");
    gl.useProgram(program);

    // vertices
    const vertices = [vec3(-4, -1, -1), vec3(4, -1, -1), vec3(4, -1, -21), vec3(-4, -1, -21)];
    const colors = [vec3(1, 1, 1), vec3(1, 1, 1), vec3(1, 1, 1), vec3(1, 1, 1)];
    const texCoords = [vec2(-1.5, 0), vec2(2.5, 0), vec2(2.5, 10), vec2(-1.5, 10)];
    const indices = [0, 1, 2, 0, 2, 3];

    const vertexBuffer = createEmptyArrayBuffer(gl, program, 'a_Position', 3, gl.FLOAT);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    const colorBuffer = createEmptyArrayBuffer(gl, program, 'a_Color', 3, gl.FLOAT);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    const texCoordsBuffer = createEmptyArrayBuffer(gl, program, 'a_TexPosition', 2, gl.FLOAT);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

    // texture
    const chessboard = createChessboard();
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, chessboard);
    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    // handlers for the selection menus
    const wrapMenu = document.getElementById("wrapping");
    wrapMenu.onchange = _ => {
        const mode = {
            'repeat': gl.REPEAT,
            'reflect': gl.MIRRORED_REPEAT,
            'clamp-to-edge': gl.CLAMP_TO_EDGE
        } [wrapMenu.value];

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, mode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, mode);
        window.requestAnimationFrame(render);
    };

    const filterMenu = document.getElementById("filtering");
    filterMenu.onchange = _ => {
        const mode = {
            'nearest': gl.NEAREST,
            'linear': gl.LINEAR,
            'mipmap': gl.NEAREST_MIPMAP_LINEAR
        } [filterMenu.value];

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mode);
        window.requestAnimationFrame(render);
    };

    function render() {
        // background
        gl.clearColor(0.3, 0.3, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // view
        let modelViewMatrix = [
            mat4()
        ].reduce(mult);

        let perspectiveMatrix = perspective(90, 1, 1, 50);

        {
            let uLocation = gl.getUniformLocation(program, 'modelView');
            gl.uniformMatrix4fv(uLocation, false, flatten(modelViewMatrix));
        } {
            let uLocation = gl.getUniformLocation(program, 'perspectiveMatrix');
            gl.uniformMatrix4fv(uLocation, false, flatten(perspectiveMatrix));
        }

        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
    }

    window.requestAnimationFrame(render);
}

context()