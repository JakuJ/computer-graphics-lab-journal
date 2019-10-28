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
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    const pixelWidth = 300;
    const pixelHeight = 300;

    var noiseGrid = PerlinNoise.fractal_noise(pixelWidth, pixelHeight, 6);
    var vertices = [];
    var normals = [];

    function quad(a, b, c, d) {
        let [va, vb, vc, vd] = [a, b, c, d].map(ix => noiseGrid[ix]);

        vertices.push(va, vb, vc, va, vc, vd)

        let norm1 = normalize(cross(subtract(vb, va), subtract(vc, va)));
        let norm2 = normalize(cross(subtract(vc, va), subtract(vd, va)));
        let normMid = normalize(mix(norm1, norm2, 0.5));
        
        normals.push(normMid, norm1, normMid, normMid, normMid, norm2);
    }

    for (let y = 0; y < pixelHeight - 1; y++) {
        for (let x = 0; x < pixelWidth - 1; x++) {
            let ix = y * pixelWidth + x;
            let ix2 = (y + 1) * pixelWidth + x;
            quad(ix2, ix2 + 1, ix + 1, ix);
        }
    }

    // send vertices to GPU
    {
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

        let location = gl.getAttribLocation(program, 'vPosition');
        gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
    }

    // send normals to GPU
    {
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

        let location = gl.getAttribLocation(program, 'vNormal');
        gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
    }

    var camera = new SimpleCamera(vec3(0, 0, 0), -45, 0, 500, canvas);

    function render() {
        // background
        gl.clearColor(0.5, 0.9, 1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        camera.update();

        var worldMatrix = [
            camera.view,
            scalem(100, 100, 100), // world size
            scalem(1, .5, 1), // noise height proportions
            translate(-.5, -1, -.5), // scale down only
        ].reduce(mult);

        // Draw terrain using triangles
        {
            let uLocation = gl.getUniformLocation(program, 'vWorld');
            gl.uniformMatrix4fv(uLocation, false, flatten(worldMatrix));
        } {
            let uLocation = gl.getUniformLocation(program, 'vView');
            gl.uniformMatrix4fv(uLocation, false, flatten(camera.perspective));
        } {
            let uLocation = gl.getUniformLocation(program, 'vGradient');
            gl.uniform3fv(uLocation, flatten([.4, .50, 0]));
        } {
            let uLocation = gl.getUniformLocation(program, 'vBias');
            gl.uniform3fv(uLocation, flatten([.3, .15, .15]));
        }

        gl.drawArrays(gl.TRIANGLES, 0, vertices.length);

        // Draw points to show vertices
        {
            let uLocation = gl.getUniformLocation(program, 'vGradient');
            gl.uniform3fv(uLocation, flatten([0, 0, 0]));
        } {
            let uLocation = gl.getUniformLocation(program, 'vBias');
            gl.uniform3fv(uLocation, flatten([0.2, 0.2, 0.2]));
        }

        gl.drawArrays(gl.POINTS, 0, vertices.length);

        window.requestAnimationFrame(render);
    }

    gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(2, 3);

    window.requestAnimationFrame(render);
}

context()