// @ts-nocheck
/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

function context1() {
    // Prepare WebGL
    var canvas = document.getElementById("canvas1");
    var gl = setupWebGL(canvas);

    // Load shaders
    var program = initShaders(gl, "vertex-shader-1", "fragment-shader-1");
    gl.useProgram(program);

    // Vector-buffer class
    class VectorBuffer {
        constructor(vectorType, name) {
            this.atomSize = sizeof[vectorType];
            this.length = 4;

            this.buffer = gl.createBuffer();
            this.index = 0;

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.size, gl.STATIC_DRAW);

            const location = gl.getAttribLocation(program, name);
            gl.vertexAttribPointer(location, this.atomSize / 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(location);
        }

        append(vertex) {
            if (this.index >= this.length) {
                this._resize();
            }
            
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, this.offset, flatten(vertex));
            
            this.index++;
        }

        extend(array) {
            array.forEach(element => {
                this.append(element);
            });
        }

        render(mode) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.drawArrays(mode, 0, this.index);
        }

        get offset() {
            return this.index * this.atomSize;
        }

        get size() {
            return this.length * this.atomSize;
        }

        _resize() {
            this.length *= 2;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.size * 2, gl.STATIC_DRAW);
        }
    }

    // Create buffer
    var buffer = new VectorBuffer('vec2', 'vPosition');

    // POSITIONS
    const vertices = [vec2(0, 0), vec2(1, 0), vec2(1, 1)];
    buffer.extend(vertices);

    function render() {
        // background
        gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // points
        buffer.render(gl.POINTS);
    }

    canvas.addEventListener("click", event => {
        const bbox = event.target.getBoundingClientRect();
        let x = -1 + 2 * (event.clientX - bbox.left) / canvas.width;
        let y = -1 + 2 * (canvas.height - (event.clientY - bbox.top)) / canvas.height;

        buffer.append(vec2(x, y));
        
        window.requestAnimationFrame(render);
    });

    window.requestAnimationFrame(render);
}

context1()