//this lib refers to this blogs:
//https://www.redblobgames.com/maps/noisy-edges/
//and it's used to make iregular curve lines that represent rivers, coastlines and so on.
//authored by GaoZhen at 2019/11/28

// class Point {
//     constructor(x = 0, y = 0, color = "gray") {
//         this.x = x;
//         this.y = y;
//         this.color = color;
//     }
// }

//     Point.prototype.clone = function() {
//     return new Point(this.x, this.y, this.color);
// };

const mix = function (a, b, t) {
	return a * (1.0 - t) + b * t;
};

/**
 * Componentwise mix for arrays of equal length; 
 */
const mixp = function (p, q, t) {
	const pt = [0, 0]
	pt[0] = mix(p[0], q[0], t);
	pt[1] = mix(p[1], q[1], t);
	return pt;
};

/**
 * Return the noisy line from a to b, within quadrilateral a-p-b-q,
 * as an array of points, not including a. The recursive subdivision
 * has up to 2^levels segments. Segments below a given length are
 * not subdivided further.
 */
const divisor = 0x10000000;

//minLen:the min distance between two points in the noisy line
//amplitude:the degree of fluctuation of the noisy line(0-1)
function recursiveSubdivision(minLen, amplitude, randInt) {
	function recur(a, b, p, q) {
		const dx = a[0] - b[0],
			dy = a[1] - b[1];
		if (dx * dx + dy * dy < minLen * minLen) {
			return [b];
		}

		const ap = mixp(a, p, 0.5),
			bp = mixp(b, p, 0.5),
			aq = mixp(a, q, 0.5),
			bq = mixp(b, q, 0.5);

		const division =
			0.5 * (1 - amplitude) + (randInt(divisor) / divisor) * amplitude;

		const center = mixp(p, q, division);

		const results1 = recur(a, center, ap, aq),
			results2 = recur(center, b, bp, bq);

		return results1.concat(results2);
	}
	return recur;
}

module.exports = { recursiveSubdivision };
