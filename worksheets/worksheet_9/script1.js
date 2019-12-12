// @ts-nocheck
/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

function createEmptyArrayBuffer(gl, a_attribute, num, type) {
    var buffer = gl.createBuffer(); // Create a buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute); // Enable the assignment
    return buffer;
}

function initAttributeVariable(gl, a_attribute, buffer, num) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, num, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
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
    var g_objDoc = null; // The information of OBJ file
    var g_drawingInfo = null; // The information for drawing 3D model

    // OBJ file has been read
    function onReadOBJFile(fileString, fileName, scale, reverse) {
        var objDoc = new OBJDoc(fileName); // Create a OBJDoc object
        var result = objDoc.parse(fileString, scale, reverse);

        if (!result) {
            g_objDoc = null;
            g_drawingInfo = null;
            console.log("OBJ file parsing error");
        } else {
            g_objDoc = objDoc;
        }
    }

    async function readOBJFile(fileName, scale, reverse) {
        fetch(fileName).then(x => x.text()).then(x => {
            onReadOBJFile(x, fileName, scale, reverse);
        }).catch(err => console.log(err));
    }

    // OBJ File has been read completely
    function onReadComplete(gl, model, objDoc) {

        // Acquire the vertex coordinates and colors from OBJ file
        var drawingInfo = objDoc.getDrawingInfo();
        // Write date into the buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);

        // Write the indices to the buffer object
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

        return drawingInfo;
    }

    // LOAD THE TEAPOT

    // Prepare WebGL
    var canvas = document.getElementById("canvas1");
    var gl = setupWebGL(canvas);

    // Load shaders
    var teapotProgram = initShaders(gl, "vertex-shader-teapot-1", "fragment-shader-teapot-1");
    gl.useProgram(teapotProgram);

    teapotProgram.position = gl.getAttribLocation(teapotProgram, 'position');
    teapotProgram.color = gl.getAttribLocation(teapotProgram, 'color');
    teapotProgram.normal = gl.getAttribLocation(teapotProgram, 'normal');

    var teapotModel = {
        vertexBuffer: createEmptyArrayBuffer(gl, teapotProgram.position, 3, gl.FLOAT),
        normalBuffer: createEmptyArrayBuffer(gl, teapotProgram.normal, 3, gl.FLOAT),
        colorBuffer: createEmptyArrayBuffer(gl, teapotProgram.color, 4, gl.FLOAT),
        indexBuffer: gl.createBuffer()
    }

    readOBJFile('/worksheets/worksheet_9/teapot/teapot.obj', 1, false);

    // CREATE TERRAIN

    // Load shaders
    let groundProgram = initShaders(gl, "vertex-shader-ground-1", "fragment-shader-ground-1");
    gl.useProgram(groundProgram);

    groundProgram.position = gl.getAttribLocation(groundProgram, 'position');
    groundProgram.texPosition = gl.getAttribLocation(groundProgram, 'texPosition');
    groundProgram.texture = gl.getUniformLocation(groundProgram, 'texture');

    // vertices
    const vertices = [vec3(-2, -1, -1), vec3(-2, -1, -5), vec3(2, -1, -5), vec3(2, -1, -1)];
    const texCoords = [vec2(-1, -1), vec2(-1, 1), vec2(1, 1), vec2(1, -1)];
    const indices = [0, 3, 2, 0, 2, 1];

    var groundModel = {};

    groundModel.vertexBuffer = createEmptyArrayBuffer(gl, groundProgram.position, 3, gl.FLOAT);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    groundModel.texCoordsBuffer = createEmptyArrayBuffer(gl, groundProgram.texPosition, 2, gl.FLOAT);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    groundModel.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundModel.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

    // image texture
    var image = document.createElement('img');
    image.crossorigin = 'anonymous';
    image.onload = e => {
        console.log("Texture loaded");
        let texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.uniform1i(groundProgram.texture, 0);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        window.requestAnimationFrame(render);
    };
    image.src = 'textures/xamp23.png';

    // INPUTS

    const bounceCheck = document.getElementById("bounce");
    bounceCheck.onchange = x => {
        bounce = bounceCheck.checked;
    };
    var bounce = bounceCheck.checked;

    const lookDownCheck = document.getElementById("lookDown");
    lookDownCheck.onchange = x => {
        lookDown = lookDownCheck.checked;
    };
    var lookDown = lookDownCheck.checked;

    const lightMoveCheck = document.getElementById("lightMove");
    lightMoveCheck.onchange = x => {
        lightMove = lightMoveCheck.checked;
    };
    var lightMove = lightMoveCheck.checked;

    // Projection shadow matrix

    let lightY = 2;

    let projectionMatrix = mat4(1);
    projectionMatrix[3][3] = 0;
    projectionMatrix[3][1] = 1 / -(lightY - (-1)); // -1 is the ground y

    function render(time) {
        // background
        gl.clearColor(0.53, 0.81, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // light
        let t = time / 1000;
        let lightX, lightZ;

        if (lightMove) {
            lightX = Math.sin(t);
            lightZ = -3 + Math.cos(t);
        } else {
            lightX = 0;
            lightZ = -3;
        }

        // RENDER GROUND
        gl.useProgram(groundProgram);

        initAttributeVariable(gl, groundProgram.position, groundModel.vertexBuffer, 3);
        initAttributeVariable(gl, groundProgram.texPosition, groundModel.texCoordsBuffer, 2);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundModel.indexBuffer);

        // common perspective + lookAt
        let perspectiveMatrix = [
            perspective(90, 1, 1, 20),
            lookAt(lookDown ? vec3(0, 2, -2.99) : vec3(0, 0, 0), vec3(0, 0, -3), vec3(0, 1, 0)),
        ].reduce(mult);

        // ground perspective
        {
            let uLocation = gl.getUniformLocation(groundProgram, 'perspective');
            gl.uniformMatrix4fv(uLocation, false, flatten(perspectiveMatrix));
        }

        // ground modelView
        {
            let uLocation = gl.getUniformLocation(groundProgram, 'modelView');
            gl.uniformMatrix4fv(uLocation, false, flatten(mat4()));
        }
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

        // RENDER THE TEAPOT
        gl.useProgram(teapotProgram);
        initAttributeVariable(gl, teapotProgram.position, teapotModel.vertexBuffer, 3);
        // initAttributeVariable(gl, teapotProgram.normal, teapotModel.normalBuffer, 3);
        initAttributeVariable(gl, teapotProgram.color, teapotModel.colorBuffer, 4);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotModel.indexBuffer);

        if (!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) {
            // OBJ and all MTLs are available
            g_drawingInfo = onReadComplete(gl, teapotModel, g_objDoc);
            console.log("g_drawingInfo set!");
            console.log(g_drawingInfo.indices.length);
        }

        if (!g_drawingInfo) {
            console.log('waiting');
        } else {
            let transY = bounce ? 0.25 * Math.cos(t) : 0;

            // view
            var modelViewMatrix = [
                translate(0, transY, -3),
                scalem(0.25, 0.25, 0.25),
                rotateY(time / 20),
            ].reduce(mult);

            // FIRST, THE SHADOWS
            {
                let modelView = [
                    translate(0, -0.001, 0),
                    translate(lightX, lightY, lightZ),
                    projectionMatrix,
                    translate(-lightX, -lightY, -lightZ),
                    modelViewMatrix
                ].reduce(mult);

                let uLocation = gl.getUniformLocation(teapotProgram, 'modelView');
                gl.uniformMatrix4fv(uLocation, false, flatten(modelView));

                // shadow mode
                let visLocation = gl.getUniformLocation(teapotProgram, 'visible');
                gl.uniform1f(visLocation, false);
                gl.depthFunc(gl.GREATER);

                gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
            }

            // THEN, THE TEAPOT
            {
                let uLocation = gl.getUniformLocation(teapotProgram, 'modelView');
                gl.uniformMatrix4fv(uLocation, false, flatten(modelViewMatrix));
            } {
                let uLocation = gl.getUniformLocation(teapotProgram, 'perspectiveMatrix');
                gl.uniformMatrix4fv(uLocation, false, flatten(perspectiveMatrix));
            }

            // normal mode
            gl.depthFunc(gl.LESS);
            let visLocation = gl.getUniformLocation(teapotProgram, 'visible');
            gl.uniform1f(visLocation, true);

            gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
        };
        window.requestAnimationFrame(render);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // gl.enable(gl.CULL_FACE);
    // gl.cullFace(gl.BACK);
}

context()