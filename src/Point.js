class Point {
    constructor(x, y, z) {
        this.x = x
        this.y = y
        this.z = z
    }

    toString() {
        return `${this.x},${this.y},${this.z}`
    }

    toArray() {
        return [this.x || 0, this.y || 0, this.z || 0]
    }
}

module.exports = Point