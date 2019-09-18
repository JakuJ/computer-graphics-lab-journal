/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

function context3() {
    // Prepare WebGL
    var canvas = document.getElementById("canvas3");
    var gl = setupWebGL(canvas);

    // Load shaders
    var program = initShaders(gl, "vertex-shader-3", "fragment-shader-3");
    gl.useProgram(program);

    // Vector-buffer class
    class VectorBuffer {
        constructor(vectorType, name) {
            this.name = name;
            this.atomSize = sizeof[vectorType];

            this._newBuffer();
        }

        append(vertex) {
            if (this.index >= this.length) {
                this._resize();
            }

            this.array.push(vertex);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, this.offset, flatten(vertex));

            this.index++;
        }

        pop() {
            this.index = Math.max(0, this.index - 1);
            return this.array.pop();
        }

        extend(array) {
            array.forEach(element => {
                this.append(element);
            });
        }

        clear() {
            gl.deleteBuffer(this.buffer);
            this._newBuffer();
        }

        setCurrent() {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            this._setAttribs();
        }

        get offset() {
            return this.index * this.atomSize;
        }

        get size() {
            return this.length * this.atomSize;
        }

        _newBuffer() {
            this.index = 0;
            this.length = 4;
            this.buffer = gl.createBuffer();
            this.array = [];

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            this._setAttribs();
            gl.bufferData(gl.ARRAY_BUFFER, this.size, gl.STATIC_DRAW);
        }

        _setAttribs() {
            let location = gl.getAttribLocation(program, this.name);
            gl.vertexAttribPointer(location, this.atomSize / 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(location);
        }

        _resize() {
            this.length *= 2;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.size * 2, gl.STATIC_DRAW);
        }
    }

    // Create buffer
    var pointBuffer = new VectorBuffer('vec2', 'vPosition');
    var triangleBuffer = new VectorBuffer('vec2', 'vPosition');
    var pointsColorBuffer = new VectorBuffer('vec3', 'vColor');
    var trianglesColorBuffer = new VectorBuffer('vec3', 'vColor');

    const colors = {
        'red': vec3(1, 0.2, 0.2),
        'green': vec3(0.3, 1, 0.3),
        'blue': vec3(0.2, 0.2, 1),
        'white': vec3(1, 1, 1),
        'black': vec3(0, 0, 0),
        'default': vec3(0.3921, 0.5843, 0.9294)
    }

    var bgColor = colors['default'];
    var penColor = colors['black'];

    const clearButton = document.getElementById("clear-canvas-3");
    const colorSelect = document.getElementById("colors-3");

    const pointsButton = document.getElementById("point-mode-3");
    const trianglesButton = document.getElementById("triangle-mode-3");

    var currentMode = 0 // [points, triangles]
    var triangleCounter = 0;

    pointsButton.onclick = () => {
        currentMode = 0;
    }
    trianglesButton.onclick = () => {
        currentMode = 1;
        triangleCounter = 0;
    }

    clearButton.onclick = () => {
        bgColor = colors[colorSelect.selectedOptions[0].value];
        
        pointBuffer.clear();
        triangleBuffer.clear();
        
        pointsColorBuffer.clear();
        trianglesColorBuffer.clear();
        
        window.requestAnimationFrame(render);
    };

    colorSelect.onchange = () => {
        penColor = colors[colorSelect.selectedOptions[0].value];
    }

    function render() {
        // background
        gl.clearColor(...bgColor, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // points
        pointBuffer.setCurrent();
        pointsColorBuffer.setCurrent();
        gl.drawArrays(gl.POINTS, 0, pointBuffer.index);

        triangleBuffer.setCurrent();
        trianglesColorBuffer.setCurrent();
        gl.drawArrays(gl.TRIANGLES, 0, triangleBuffer.index);
    }

    canvas.addEventListener("click", event => {
        const bbox = event.target.getBoundingClientRect();
        let x = -1 + 2 * (event.clientX - bbox.left) / canvas.clientWidth;
        let y = -1 + 2 * (canvas.clientHeight - (event.clientY - bbox.top)) / canvas.clientHeight;

        switch (currentMode) {
            default:
            case 0: {
                pointBuffer.append(vec2(x, y));
                pointsColorBuffer.append(penColor);
                break;
            }
            case 1: {
                if (triangleCounter < 2) {
                    pointBuffer.append(vec2(x, y));
                    pointsColorBuffer.append(penColor);
                    
                    triangleCounter++;
                } else {
                    let v2 = pointBuffer.pop()
                    let v1 = pointBuffer.pop()

                    let c2 = pointsColorBuffer.pop();
                    let c1 = pointsColorBuffer.pop();

                    triangleBuffer.extend([v1, v2, vec2(x, y)]);
                    trianglesColorBuffer.extend([c1, c2, penColor]);
                    
                    triangleCounter = 0;
                }
                break;
            }
        }

        window.requestAnimationFrame(render);
    });

    window.requestAnimationFrame(render);
}

context3()