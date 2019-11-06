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
    var canvas = document.getElementById("canvas4");
    var gl = setupWebGL(canvas);

    // Load shaders
    var program = initShaders(gl, "vertex-shader-4", "fragment-shader-4");
    gl.useProgram(program);

    // POSITIONS
    const vertices = [
        vec3(1, -1, -1),
        vec3(-1, 1, -1),
        vec3(-1, -1, 1),
        vec3(1, 1, 1),
    ].map(x => scale(1 / Math.sqrt(3), x));

    var elems = [];

    const cubeVertices = [
        vec3(-1, -1, 0.999),
        vec3(0.999, -1, 0.999),
        vec3(0.999, 0.999, 0.999),
        vec3(-1, 0.999, 0.999),
        vec3(-1, -1, -1),
        vec3(0.999, -1, -1),
        vec3(0.999, 0.999, -1),
        vec3(-1, 0.999, -1)
    ];

    function quad(a, b, c, d) {
        var indices = [a, b, c, a, c, d];
        elems.push(...indices.map(x => cubeVertices[x - 1]));
    }

    function cube() {
        quad(2, 1, 5, 6);
        quad(6, 5, 8, 7);
        quad(5, 1, 4, 8);
        quad(2, 6, 7, 3);
        quad(4, 3, 7, 8);
        quad(1, 2, 3, 4);
    }

    function triangle(a, b, c) {
        elems.push(a, c, b);
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
        cube();
        tetrahedron(...vertices, subdivision);

        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(elems), gl.STATIC_DRAW);

        let vLocation = gl.getAttribLocation(program, 'vPosition');
        gl.vertexAttribPointer(vLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vLocation);
    }

    var subdivision = 8;
    redraw_sphere(subdivision);

    // texture

    const defaultFaceInfos = [{
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            filepath: './textures/main/cm_left.png'
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            filepath: './textures/main/cm_right.png'
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            filepath: './textures/main/cm_top.png'
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            filepath: './textures/main/cm_bottom.png'
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            filepath: './textures/main/cm_back.png'
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            filepath: './textures/main/cm_front.png'
        },
    ];

    const otherTextures = ['autumn', 'brightday2', 'cloudyhills', 'greenhill', 'terrain'];

    function getCubeTexture(name) {
        return [{
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                filepath: `./textures/cubemaps/${name}_cubemap/${name}_posx.png`
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                filepath: `./textures/cubemaps/${name}_cubemap/${name}_negx.png`
            },
            {
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                filepath: `./textures/cubemaps/${name}_cubemap/${name}_posy.png`
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                filepath: `./textures/cubemaps/${name}_cubemap/${name}_negy.png`
            },
            {
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                filepath: `./textures/cubemaps/${name}_cubemap/${name}_posz.png`
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
                filepath: `./textures/cubemaps/${name}_cubemap/${name}_negz.png`
            },
        ];
    }

    function loadCubeTexture(faceInfos, flip) {
        var texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip); // only for default cube texture
        
        for (let info of faceInfos) {
            const {
                target,
                filepath
            } = info;

            let image = document.createElement('img');
            image.crossorigin = 'anonymous';
            image.onload = e => {
                gl.texImage2D(target, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, e.target);
            };
            image.src = filepath;
        }

        gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    loadCubeTexture(defaultFaceInfos, true);

    const texSelect = document.getElementById("textureSelect");
    texSelect.onchange = () => {
        if (texSelect.value === 'default') {
            loadCubeTexture(defaultFaceInfos, true);
        } else {
            let faceInfos = getCubeTexture(texSelect.value);
            loadCubeTexture(faceInfos, false);

        }
    };

    // bump map texture

    var image = document.createElement('img');
    image.crossorigin = 'anonymous';
    image.onload = e => {
        var texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

        gl.uniform1i(gl.getUniformLocation(program, "bumpMap"), 1);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    };
    image.src = 'textures/main/normalmap.png';

    function render(time) {
        // background
        gl.clearColor(0, 0, 0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // view
        var worldMatrix = [translate(0, 0, -3), rotateY(-time / 30)].reduce(mult);

        var viewMatrix = [
            perspective(90, 1, 1, 20)
        ].reduce(mult);

        {
            let uLocation = gl.getUniformLocation(program, 'worldMatrix');
            gl.uniformMatrix4fv(uLocation, false, flatten(worldMatrix));
        } {
            let uLocation = gl.getUniformLocation(program, 'viewMatrix');
            gl.uniformMatrix4fv(uLocation, false, flatten(viewMatrix));
        } {
            let uLocation = gl.getUniformLocation(program, 'eyePos');
            gl.uniform4fv(uLocation, flatten(mult(inverse(worldMatrix), vec4(0, 0, 0, 1))));
        }

        var texMatrix = [
            inverse(worldMatrix),
            inverse(viewMatrix)
        ].reduce(mult);

        {
            let uLocation = gl.getUniformLocation(program, 'texMatrix');
            gl.uniformMatrix4fv(uLocation, false, flatten(texMatrix));
        } {
            let uLocation = gl.getUniformLocation(program, 'reflective');
            gl.uniform1i(uLocation, false);
        }

        // background
        gl.drawArrays(gl.TRIANGLES, 0, 36);

        {
            let uLocation = gl.getUniformLocation(program, 'texMatrix');
            gl.uniformMatrix4fv(uLocation, false, flatten(mat4()));
        } {
            let uLocation = gl.getUniformLocation(program, 'reflective');
            gl.uniform1i(uLocation, true);
        }

        gl.drawArrays(gl.TRIANGLES, 36, elems.length - 36);

        window.requestAnimationFrame(render);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    window.requestAnimationFrame(render);
}

context()