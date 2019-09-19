/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

function context4() {
    // Prepare WebGL
    var canvas = document.getElementById("canvas4");
    var gl = setupWebGL(canvas);

    // Load shaders
    var program = initShaders(gl, "vertex-shader-2", "fragment-shader-2");
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
                this.array.push(vertex);
                this._resize();
            } else {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, this.offset, flatten(vertex));
                this.array.push(vertex);
            }
        }

        pop() {
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

        get index() {
            return this.array.length;
        }

        get offset() {
            return this.index * this.atomSize;
        }

        get size() {
            return this.length * this.atomSize;
        }

        _newBuffer() {
            this.array = [];
            this.length = 4;
            
            this.buffer = gl.createBuffer();
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
            gl.bufferData(gl.ARRAY_BUFFER, this.size, gl.STATIC_DRAW);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(this.array));
        }
    }

    // Create buffer
    var vBuffer = new VectorBuffer('vec2', 'vPosition');
    var cBuffer = new VectorBuffer('vec3', 'vColor');

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

    const clearButton = document.getElementById("clear-canvas-4");
    const colorSelect = document.getElementById("colors-4");

    const pointsButton = document.getElementById("point-mode-4");
    const trianglesButton = document.getElementById("triangle-mode-4");
    const circlesButton = document.getElementById("circle-mode-4");

    var currentMode = 0 // [points, triangles, circles]
    var triangleCounter = 0;
    var circleCounter = 0;
    var circleCenter = [-1, -1];
    const circleDensity = 40;

    var points = [];
    var triangles = [];
    var circles = [];

    pointsButton.onclick = () => {
        currentMode = 0;
    }

    trianglesButton.onclick = () => {
        currentMode = 1;
        triangleCounter = 0;
    }

    circlesButton.onclick = () => {
        currentMode = 2;
        circleCounter = 0;
    }

    clearButton.onclick = () => {
        bgColor = colors[colorSelect.selectedOptions[0].value];

        vBuffer.clear();
        cBuffer.clear();

        points = [];
        triangles = [];
        circles = [];
        triangleCounter = 0;
        circleCounter = 0;

        window.requestAnimationFrame(render);
    };

    colorSelect.onchange = () => {
        penColor = colors[colorSelect.selectedOptions[0].value];
    }

    function render() {
        // background
        gl.clearColor(...bgColor, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // shapes
        let i = 0,
            j = 0,
            l = 0;

        for (let k = 0; k < vBuffer.index;) {
            if (points[i] == k) {
                let len = 1;

                for (let ii = i; ii < points.length; ii++) {
                    if (points[ii + 1] != points[ii] + 1) {
                        break;
                    }
                    len += 1;
                }

                gl.drawArrays(gl.POINTS, k, len);

                k += len;
                i += len;
            } else if (triangles[j] == k) {
                let len = 1;

                for (let ii = i; ii < points.length; ii++) {
                    if (points[ii + 1] != points[ii] + 3) {
                        break;
                    }
                    len += 1;
                }

                gl.drawArrays(gl.TRIANGLES, k, len * 3);

                k += len * 3;
                j += len;
            } else if (circles[l] == k) {
                gl.drawArrays(gl.TRIANGLE_FAN, k, circleDensity + 1); // including middle point

                k += circleDensity + 1;
                l++;
            }
        }
    }

    canvas.addEventListener("click", event => {
        const bbox = event.target.getBoundingClientRect();
        let x = -1 + 2 * (event.clientX - bbox.left) / canvas.clientWidth;
        let y = -1 + 2 * (canvas.clientHeight - (event.clientY - bbox.top)) / canvas.clientHeight;

        switch (currentMode) {
            default:
            case 0: {
                points.push(vBuffer.index);
                break;
            }
            case 1: {
                if (triangleCounter < 2) {
                    points.push(vBuffer.index);
                    triangleCounter++;
                } else {
                    points.pop();
                    points.pop();
                    triangles.push(vBuffer.index - 2);

                    triangleCounter = 0;
                }
                break;
            }
            case 2: {
                if (circleCounter == 0) {
                    points.push(vBuffer.index);

                    vBuffer.append(vec2(x, y));
                    cBuffer.append(penColor);

                    circleCenter = [x, y];
                    circleCounter++;
                } else {
                    points.pop();
                    circles.push(vBuffer.index - 1);
                    circleCounter = 0;

                    let [x0, y0] = circleCenter;
                    let dx = x0 - x;
                    let dy = y0 - y;
                    let R = length([dx, dy]);

                    for (let i = 0; i < circleDensity - 1; i++) {
                        let a = 2 * Math.PI * i / (circleDensity - 1);
                        vBuffer.append(vec2(R * Math.cos(a) + x0, R * Math.sin(a) + y0));
                        cBuffer.append(penColor);
                    }

                    vBuffer.append(vec2(R + x0, y0));
                    cBuffer.append(penColor);
                }
                break;
            }
        }

        if (currentMode != 2) {
            vBuffer.append(vec2(x, y));
            cBuffer.append(penColor);
        }

        window.requestAnimationFrame(render);
    });

    window.requestAnimationFrame(render);
}

context4()