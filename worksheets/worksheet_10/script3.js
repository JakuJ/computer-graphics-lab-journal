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

function initVertexBuffers(gl, program) {
    return {
        vertexBuffer: createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT),
        normalBuffer: createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT),
        colorBuffer: createEmptyArrayBuffer(gl, program.a_Color, 4, gl.FLOAT),
        indexBuffer: gl.createBuffer()
    }
}

function project_to_sphere(x, y) {
    var r = 2;
    var d = Math.sqrt(x * x + y * y); // distance from (0, 0)
    var t = r * Math.sqrt(2);

    var z;
    if (d < r) // Inside sphere
        z = Math.sqrt(r * r - d * d);
    else if (d < t)
        z = 0;
    else // On hyperbola
        z = t * t / d;
    return z;
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

    // Prepare WebGL
    var canvas = document.getElementById("canvas3");
    var gl = setupWebGL(canvas);

    // Load shaders
    var program = initShaders(gl, "vertex-shader-1", "fragment-shader-1");
    gl.useProgram(program);

    program.a_Position = gl.getAttribLocation(program, 'a_Position');
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal');
    program.a_Color = gl.getAttribLocation(program, 'a_Color');

    var model = initVertexBuffers(gl, program);
    readOBJFile('/worksheets/worksheet_10/teapot/teapot.obj', 1, false);

    //Event handlers
    var mode = 0; // 0 - None, 1 - Rotate, 2 - Pan, 3 - Dolly

    var dragging = false;
    var lastX = -1;
    var lastY = -1;

    var qrot = new Quaternion();
    var qinc = new Quaternion();
    var dolly_dist = 1;
    var pan_offset = vec2(0, 0);

    canvas.onmousedown = ev => {
        let x = ev.clientX,
            y = ev.clientY;

        if (ev.button == 0){
            qinc.setIdentity();
        }

        if (ev.button == 0) {
            mode = 1;
        } else if (ev.button == 2) {
            mode = 2;
        }

        // Start dragging if a mouse is in <canvas>
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            dragging = true;
            lastX = ((x - rect.left) / rect.width - 0.5) * 2;
            lastY = (0.5 - (y - rect.top) / rect.height) * 2;
        }
    };

    canvas.oncontextmenu = ev => {
        ev.preventDefault();
    }

    canvas.onmouseup = () => {
        mode = 0;
        dragging = false;
    };

    canvas.onmouseleave = () => {
        dragging = false;
        mode = 0;
    };

    canvas.onmousemove = ev => {
        var rect = ev.target.getBoundingClientRect();

        let c_x = ev.clientX,
            c_y = ev.clientY;

        if (dragging) {
            var x = ((c_x - rect.left) / rect.width - 0.5) * 2;
            var y = (0.5 - (c_y - rect.top) / rect.height) * 2;

            let lastPos = vec3(lastX, lastY, project_to_sphere(lastX, lastY));
            let curPos = vec3(x, y, project_to_sphere(x, y));

            switch (mode) {
                case 0:
                    break;
                case 1: {
                    qinc = qinc.make_rot_vec2vec(normalize(curPos), normalize(lastPos));
                    qrot = qrot.multiply(qinc);
                    break;
                }
                case 2: {
                    pan_offset = add(pan_offset, scale(Math.max(5, 0.25 * dolly_dist), vec2(subtract(lastPos, curPos))));
                    break;
                }
            }
            lastX = x, lastY = y;
        }
    };

    canvas.onwheel = ev => {
        ev.preventDefault();
        dolly_dist = Math.min(30, Math.max(1, dolly_dist + ev.deltaY * 0.01));
    };

    function render() {
        // background
        gl.clearColor(0.3, 0.3, 0.3, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // view
        qrot = qrot.multiply(qinc);
        let up = qrot.apply(vec3(0, 1, 0));
        let right = qrot.apply(vec3(1, 0, 0));
        let front = qrot.apply(vec3(0, 0, 1));
        
        let rot_eye = qrot.apply(vec3(0, 0, 10));
        let look_at = [scale(pan_offset[0], right), scale(pan_offset[1], up)].reduce(add)
        rot_eye = [rot_eye, look_at, scale(dolly_dist, front)].reduce(add)

        // alternatively: quaternion rotation * translate(pan_offset[0], pan_offset[1], dolly_dist)
        var modelViewMatrix = [
            lookAt(rot_eye, look_at, up), // quaternion based transformations
            translate(0, -1, 0), // center the teapot
        ].reduce(mult);

        var perspectiveMatrix = perspective(45, 1, 1, 50);

        {
            let uLocation = gl.getUniformLocation(program, 'modelView');
            gl.uniformMatrix4fv(uLocation, false, flatten(modelViewMatrix));
        } {
            let uLocation = gl.getUniformLocation(program, 'perspectiveMatrix');
            gl.uniformMatrix4fv(uLocation, false, flatten(perspectiveMatrix));
        }

        if (!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) {
            // OBJ and all MTLs are available
            g_drawingInfo = onReadComplete(gl, model, g_objDoc);
            console.log("g_drawingInfo set!");
            console.log(g_drawingInfo.indices.length);
        }

        if (!g_drawingInfo) {
            console.log('waiting');
            window.requestAnimationFrame(render);
            return;
        };

        var uniforms = {
            'Ka': 0.2,
            'Kd': 0.8,
            'Ks': 1,
            'shininess': 5,
            'emission': vec3(1, .5, .2)
        };

        for (key in uniforms) {
            let uLocation = gl.getUniformLocation(program, key);
            gl.uniform1f(uLocation, uniforms[key]);
        }

        {
            let uLocation = gl.getUniformLocation(program, 'lightEmission');
            gl.uniform3fv(uLocation, uniforms['emission']);
        }

        // points
        gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
        window.requestAnimationFrame(render);
    }

    gl.enable(gl.DEPTH_TEST);

    window.requestAnimationFrame(render);
}

context()