attribute vec2 position;
uniform float aspectRatio;

varying vec2 fragPosition;

void main() { 
    fragPosition = position;
    gl_Position = vec4(fragPosition.x, fragPosition.y * aspectRatio, -1, 1);
}