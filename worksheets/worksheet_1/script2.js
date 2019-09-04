function assign_attribute(gl, program, vectors, shape, name)
{   
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vectors), gl.STATIC_DRAW);
    
    var location = gl.getAttribLocation(program, name);
    gl.vertexAttribPointer(location, shape, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(location);
}

function init() {
    var canvas = document.getElementById("canvas2");
    var gl = WebGLUtils.setupWebGL(canvas);

    // BACKGROUND
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // LOADING SHADERS
    var program = initShaders(gl, "vertex-shader-2", "fragment-shader-2");
    gl.useProgram(program);

    // POSITIONS
    const vertices = [vec2(0, 0), vec2(1, 0), vec2(1, 1)];
    assign_attribute(gl, program, vertices, 2, "a_Position");

    gl.drawArrays(gl.POINTS, 0, vertices.length);
}

init()