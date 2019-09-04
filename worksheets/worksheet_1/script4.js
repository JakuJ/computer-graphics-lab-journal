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
    var canvas = document.getElementById("canvas4");
    var gl = WebGLUtils.setupWebGL(canvas);

    // LOADING SHADERS
    var program = initShaders(gl, "vertex-shader-4", "fragment-shader-4");
    gl.useProgram(program);

    // POSITIONS
    const vertices = [vec2(0, 0), vec2(-0.5, 0), vec2(0, 0.5), vec2(0.5, 0), vec2(0, -0.5), vec2(-0.5, 0)];
    assign_attribute(gl, program, vertices, 2, "a_Position");
    
    // COLOR
    var location = gl.getUniformLocation(program, 'u_Color');
    gl.uniform3f(location, 1, 1, 1);

    // MAIN LOOP
    var animate = time =>
    {
        let a = time / 600;
        
        // BACKGROUND
        gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // MOVE VECTOR
        var location = gl.getUniformLocation(program, 'u_rotMatrix');
        gl.uniformMatrix2fv(location, false, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a)]);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);
        window.requestAnimationFrame(animate);
    }
    animate(0);
}

init()