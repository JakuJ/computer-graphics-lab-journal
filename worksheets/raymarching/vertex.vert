attribute vec2 position;
varying vec2 fragPosition;

void main() { 
    fragPosition = position;
    gl_Position = vec4(fragPosition, -1, 1);
}