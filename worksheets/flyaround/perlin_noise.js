class PerlinNoise {
    constructor(gridWidth, gridHeight) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.grid = [];

        for (let i = 0; i < this.gridHeight + 1; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.gridWidth + 1; j++) {
                let angle = Math.random() * 2 * Math.PI;
                this.grid[i][j] = vec2(Math.cos(angle), Math.sin(angle));
            }
        }
    }

    sample(x, y) {
        if (Number.isNaN(x) || Number.isNaN(y)) {
            throw new Error("Argument is NaN");
        }

        if (x < 0 || x > 1 || y < 0 || y > 1) {
            throw new Error("Argument out of range");
        }

        let gridX = x * this.gridWidth;
        let gridY = y * this.gridHeight;

        let i = Math.floor(gridY);
        let j = Math.floor(gridX);

        let point = vec2(gridX, gridY);

        let vals = [
            [j, i],
            [j + 1, i],
            [j, i + 1],
            [j + 1, i + 1]
        ].map(([_j, _i]) => {
            let corner = vec2(_j, _i);
            let grad = this.grid[_i][_j];
            let dist = subtract(point, corner);
            return dot(dist, grad);
        })

        const ix0 = PerlinNoise.interpolate(vals[0], vals[1], gridX - j);
        const ix1 = PerlinNoise.interpolate(vals[2], vals[3], gridX - j);
        const height = PerlinNoise.interpolate(ix0, ix1, gridY - i);

        return height / Math.sqrt(2 / 4);
    }

    static interpolate(a, b, w) {
        return a + w * (b - a);
    }

    static fractal_noise(pixelWidth, pixelHeight, n = 6, fun = (x => [x * x, x * x])) {
        const generators = [];
        for (let i = 1; i <= n; i++) {
            let [gx, gy] = fun(i);
            generators.push(new PerlinNoise(gx, gy));
        }

        const vertices = [];

        for (let y = 0; y < pixelHeight; y++) {
            for (let x = 0; x < pixelWidth; x++) {
                let normY = y / pixelHeight;
                let normX = x / pixelWidth;

                let height = 0.5;
                let amp = 1;

                for (let gen of generators) {
                    amp /= 2;
                    height += amp * gen.sample(normX, normY);
                };

                height = Math.max(0, Math.min(1, height));

                vertices.push(vec3(x / pixelWidth, height, y / pixelHeight));
            }
        }

        return vertices;
    }
}