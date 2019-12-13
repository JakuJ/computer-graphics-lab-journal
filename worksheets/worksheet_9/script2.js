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

const shadowSize = 1024;

function initFramebufferObject(gl) {
    var framebuffer, texture, depthBuffer;

    framebuffer = gl.createFramebuffer();

    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, shadowSize, shadowSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    framebuffer.texture = texture;

    depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, shadowSize, shadowSize);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (e !== gl.FRAMEBUFFER_COMPLETE) {
        console.log('Framebuffer object is incomplete: ' + e.toString());
        return error();
    }

    return framebuffer;
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

    // TEAPOT SHADERS

    // Prepare WebGL
    var canvas = document.getElementById("canvas2");
    var gl = setupWebGL(canvas);

    // Load shaders
    var teapotProgram = initShaders(gl, "vertex-shader-teapot-2", "fragment-shader-teapot-2");
    gl.useProgram(teapotProgram);

    teapotProgram.position = gl.getAttribLocation(teapotProgram, 'position');
    teapotProgram.color = gl.getAttribLocation(teapotProgram, 'color');
    teapotProgram.normal = gl.getAttribLocation(teapotProgram, 'normal');
    teapotProgram.shadow = gl.getUniformLocation(teapotProgram, 'shadow');
    gl.uniform1i(teapotProgram.shadow, 1);

    var teapotModel = {
        vertexBuffer: createEmptyArrayBuffer(gl, teapotProgram.position, 3, gl.FLOAT),
        normalBuffer: createEmptyArrayBuffer(gl, teapotProgram.normal, 3, gl.FLOAT),
        colorBuffer: createEmptyArrayBuffer(gl, teapotProgram.color, 4, gl.FLOAT),
        indexBuffer: gl.createBuffer()
    }

    readOBJFile('/worksheets/worksheet_9/teapot/teapot.obj', 1, false);

    // TEAPOT SHADOWS

    let shadowProgram = initShaders(gl, "vertex-shader-shadow-2", "fragment-shader-shadow-2");
    gl.useProgram(shadowProgram);

    shadowProgram.position = gl.getAttribLocation(shadowProgram, 'position');

    var fb = initFramebufferObject(gl);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fb.texture);

    // TERRAIN SHADERS

    // Load shaders
    let groundProgram = initShaders(gl, "vertex-shader-ground-2", "fragment-shader-ground-2");
    gl.useProgram(groundProgram);

    groundProgram.position = gl.getAttribLocation(groundProgram, 'position');
    groundProgram.texPosition = gl.getAttribLocation(groundProgram, 'texPosition');
    groundProgram.texture = gl.getUniformLocation(groundProgram, 'texture');
    groundProgram.shadow = gl.getUniformLocation(groundProgram, 'shadow');

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
        gl.uniform1i(groundProgram.shadow, 1);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        window.requestAnimationFrame(render);
    };
    image.src = 'textures/xamp23.png';

    // INPUTS

    const bounceCheck = document.getElementById("bounce2");
    bounceCheck.onchange = x => {
        bounce = bounceCheck.checked;
    };
    var bounce = bounceCheck.checked;

    const lookDownCheck = document.getElementById("lookDown2");
    lookDownCheck.onchange = x => {
        lookDown = lookDownCheck.checked;
    };
    var lookDown = lookDownCheck.checked;

    const lightMoveCheck = document.getElementById("lightMove2");
    lightMoveCheck.onchange = x => {
        lightMove = lightMoveCheck.checked;
    };
    var lightMove = lightMoveCheck.checked;

    const seeLightCheck = document.getElementById("seeLight");
    seeLightCheck.onchange = x => {
        seeLight = seeLightCheck.checked;
    };
    var seeLight = seeLightCheck.checked;

    // Projection shadow matrix

    let lightY = 3;

    function render(time) {
        // background
        gl.clearColor(0.53, 0.81, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // light updates
        let t = time / 1000;
        let lightX, lightZ;

        if (lightMove) {
            lightX = Math.sin(t);
            lightZ = -3 + Math.cos(t);
        } else {
            lightX = 0;
            lightZ = -2.999;
        }

        // common perspective + lookAt
        let cameraPerspective = [
            perspective(90, 1, 0.1, 20),
            lookAt(lookDown ? vec3(0, 2, -2.99) : vec3(0, 0, 0), vec3(0, 0, -3), vec3(0, 1, 0)),
        ].reduce(mult);

        let lightPerspective = [
            perspective(90, 1, 1, 20),
            lookAt(vec3(lightX, lightY, lightZ), vec3(0, 0, -3), vec3(0, 1, 0)),
        ].reduce(mult);

        // teapot model view matrix
        let transY = bounce ? 0.5 * Math.cos(t) : 0;
        var teapotModelView = [
            translate(0, transY, -3),
            scalem(0.25, 0.25, 0.25)
        ].reduce(mult);

        // RENDER GROUND SHADOW
        if(!seeLight){
            gl.viewport(0, 0, shadowSize, shadowSize);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, seeLight ? null : fb);
        gl.clearColor(0, 0, 0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(shadowProgram);
        initAttributeVariable(gl, shadowProgram.position, groundModel.vertexBuffer, 3);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundModel.indexBuffer);

        {
            let uLocation = gl.getUniformLocation(shadowProgram, 'modelView');
            gl.uniformMatrix4fv(uLocation, false, flatten(mat4()));
        } {
            let uLocation = gl.getUniformLocation(shadowProgram, 'perspective');
            gl.uniformMatrix4fv(uLocation, false, flatten(lightPerspective));
        }

        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

        // TEAPOT PART
        if (!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) {
            // OBJ and all MTLs are available
            g_drawingInfo = onReadComplete(gl, teapotModel, g_objDoc);
            console.log("g_drawingInfo set!");
            console.log(g_drawingInfo.indices.length);
        }

        if (!g_drawingInfo) {
            console.log('waiting');
        } else {
            // RENDER SHADOW MAP
            if(!seeLight){
                gl.viewport(0, 0, shadowSize, shadowSize);
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, seeLight ? null : fb);
            gl.useProgram(shadowProgram);
            initAttributeVariable(gl, shadowProgram.position, teapotModel.vertexBuffer, 3);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotModel.indexBuffer);

            {
                let uLocation = gl.getUniformLocation(shadowProgram, 'modelView');
                gl.uniformMatrix4fv(uLocation, false, flatten(teapotModelView));
            } {
                let uLocation = gl.getUniformLocation(shadowProgram, 'perspective');
                gl.uniformMatrix4fv(uLocation, false, flatten(lightPerspective));
            }

            gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);

            // RENDER THE TEAPOT
            gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.useProgram(teapotProgram);

            initAttributeVariable(gl, teapotProgram.position, teapotModel.vertexBuffer, 3);
            initAttributeVariable(gl, teapotProgram.color, teapotModel.colorBuffer, 4);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotModel.indexBuffer);

            {
                let uLocation = gl.getUniformLocation(teapotProgram, 'modelView');
                gl.uniformMatrix4fv(uLocation, false, flatten(teapotModelView));
            } {
                let uLocation = gl.getUniformLocation(teapotProgram, 'perspectiveMatrix');
                gl.uniformMatrix4fv(uLocation, false, flatten(cameraPerspective));
            } {
                let uLocation = gl.getUniformLocation(teapotProgram, 'lightModelView');
                gl.uniformMatrix4fv(uLocation, false, flatten(teapotModelView));
            } {
                let uLocation = gl.getUniformLocation(teapotProgram, 'lightPerspective');
                gl.uniformMatrix4fv(uLocation, false, flatten(lightPerspective));
            }

            if (!seeLight) {
                gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
            }
        };

        // RENDER GROUND
        gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.useProgram(groundProgram);

        initAttributeVariable(gl, groundProgram.position, groundModel.vertexBuffer, 3);
        initAttributeVariable(gl, groundProgram.texPosition, groundModel.texCoordsBuffer, 2);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundModel.indexBuffer);

        // ground matrices
        {
            let uLocation = gl.getUniformLocation(groundProgram, 'perspective');
            gl.uniformMatrix4fv(uLocation, false, flatten(cameraPerspective));
        } {
            let uLocation = gl.getUniformLocation(groundProgram, 'modelView');
            gl.uniformMatrix4fv(uLocation, false, flatten(mat4()));
        } {
            let uLocation = gl.getUniformLocation(groundProgram, 'lightModelView');
            gl.uniformMatrix4fv(uLocation, false, flatten(mat4()));
        } {
            let uLocation = gl.getUniformLocation(groundProgram, 'lightPerspective');
            gl.uniformMatrix4fv(uLocation, false, flatten(lightPerspective));
        }

        if (!seeLight) {
            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
        }

        window.requestAnimationFrame(render);
    }

    gl.enable(gl.DEPTH_TEST);
}

context()