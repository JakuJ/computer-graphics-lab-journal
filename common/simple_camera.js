// @ts-nocheck
class SimpleCamera {
    constructor(position, pitch, yaw, depth, canvas) {
        this.position = position;

        this.speed = 0.5;
        this.pitch = pitch;
        this.yaw = yaw;

        this.ratio = canvas.width / canvas.height;
        this.depth = depth;
        
        this.pressed = {
            'w': false,
            's': false,
            'a': false,
            'd': false,
            'shift': false,
            'z': false
        };

        window.onkeydown = e => {
            this.pressed[e.key.toLowerCase()] = true;
        };
    
        window.onkeyup = e => {
            this.pressed[e.key.toLowerCase()] = false;
        };

        canvas.onmousemove = event => {
            const bbox = event.target.getBoundingClientRect();
            let x = (event.clientX - bbox.left) / canvas.clientWidth;
            let y = (canvas.clientHeight - (event.clientY - bbox.top)) / canvas.clientHeight;
    
            const leftright = 360;
            const updown = 180;
    
            this.yaw = yaw + leftright * (x - 0.5);
            this.pitch = pitch + updown * (y - 0.5);
        };
    }

    update() {
        const forward = vec3([rotateY(this.yaw), rotateX(this.pitch), vec4(0, 0, 1, 0)].reduce(mult));
        const right = vec3([rotateY(this.yaw), vec4(-1, 0, 0, 0)].reduce(mult));
        const up = normalize(cross(right, forward));

        // update this position
        this.position = add(this.position, scale((this.pressed['w'] - this.pressed['s']) * this.speed, forward));
        this.position = add(this.position, scale((this.pressed['d'] - this.pressed['a']) * this.speed, right));
        this.position = add(this.position, scale((this.pressed['shift'] - this.pressed['z']) * this.speed, up));
        
        return [
            perspective(45, this.ratio, 1, this.depth), // perspective projection
            lookAt(this.position, add(this.position, forward), up), // look-at matrix
        ].reduce(mult);
    }
}