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
    var canvas = document.getElementById("canvas5");
    var gl = WebGLUtils.setupWebGL(canvas);

    // LOADING SHADERS
    var program = initShaders(gl, "vertex-shader-5", "fragment-shader-5");
    gl.useProgram(program);

    // POSITIONS
    const N = 1000;
    const R = 0.35;
    const vertices = [vec2(0, 0)];

    for(let i = 0; i < N; i++)
    {
        let a = 2 * Math.PI * i / N;
        vertices.push(vec2(R * Math.cos(a), R * Math.sin(a)));
    }

    vertices.push(vec2(R, 0));

    assign_attribute(gl, program, vertices, 2, "a_Position");
    
    // COLOR
    var location = gl.getUniformLocation(program, 'u_Color');
    gl.uniform3f(location, 1, 1, 1);

    // MAIN LOOP
    var animate = time =>
    {
        let y = -Math.sin(time / 600) * R;
        
        // BACKGROUND
        gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // MOVE VECTOR
        var location = gl.getUniformLocation(program, 'u_movVec');
        gl.uniform2f(location, 0, y);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);
        window.requestAnimationFrame(animate);
    }
    animate(0);
}

init()