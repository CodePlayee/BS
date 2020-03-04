/* 32-bit LCG random number function -- see http://www.firstpr.com.au/dsp/rand31/
 * for a great discussion of optimizations, none of which I need here
 *
 *    - Start with a seed
 *    - Each step, mutate seed
 *    - 0 < seed < wrap
 *    - to get integer random 0 <= x < N, use mod N
 *    - to get float random 0.0 <= x < 1.0, divide by range (wrap-1)
 *
 * This code is very simple, and the sequence of random numbers is reasonable
 * for a given seed, but the sequences for related seeds are related.
 */

// TODO: see https://github.com/nquinlan/better-random-numbers-for-javascript-mirror#license

function makeRand(seed) {
    const multiplier = 47271;
    const wrap = 0x7fffffff;
    seed = seed % wrap;
    if (typeof seed != "number" || !(seed > 0)) throw "check seed to makeRandInt";
    return function () {
        seed = (seed * multiplier) % wrap;
        return seed;
    };
}

//product predictable random integer number x(0<=x<N)
function makeRandInt(seed) {
    let generator = makeRand(seed);
    return N => generator() % N;
}

function makeRandFloat(seed) {
    const wrap = 0x7fffffff;
    let generator = makeRand(seed);
    return () => (generator() - 1.0) / (wrap - 1.0);
}

//两点之间的欧氏距离
function twoPointsDistance(startPt, endPt) {
    let dx, dy;
    if (startPt.x || startPt.x === 0) {
        dx = startPt.x - endPt.x;
        dy = startPt.y - endPt.y;
    } else if (startPt[0] || startPt[0] === 0) {
        dx = startPt[0] - endPt[0];
        dy = startPt[1] - endPt[1];
    }
    return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

//一点到直线（由两点确定）之间的距离
function pointToLineDistance(startPt, endPt, pt) {
    const A = endPt.y - startPt.y;
    const B = startPt.x - endPt.x;
    const C = endPt.x * startPt.y - startPt.x * endPt.y;
    const denominator = Math.sqrt(A * A + B * B);
    if (denominator === 0) {
        console.error("unvalid line.");
        return;
    }
    return Math.sqrt((A * pt.x + B * pt.y + C) / denominator);
}

//计算两个向量之间的夹角 v1:[x1,y1],v2:[x2,y2]
function calVectorsAngle(v1, v2) {
    let vecMulti, scale
    if (v1.x || v1.x === 0) {
        vecMulti = v1.x * v2.x + v1.y * v2.y;
        scale =
            Math.sqrt(v1.x * v1.x + v1.y * v1.y) *
            Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    } else {
        vecMulti = v1[0] * v2[0] + v1[1] * v2[1];
        scale =
            Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]) *
            Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
    }

    return Number(Math.acos(vecMulti / scale).toFixed(2));
}

//围绕两点连线中点，将两线逆时针旋转theta角度，求旋转后的两点
function calQuadPts(p1, p2, theta) {
    const dis = twoPointsDistance(p1, p2);
    const centerX = p1.x + (p2.x - p1.x) * 0.5;
    const centerY = p1.y + (p2.y - p1.y) * 0.5;
    const _p1 = [p1.x - centerX, p1.y - centerY];
    const rotatedP1 = [
        _p1[0] * Math.cos(theta) - _p1[1] * Math.sin(theta),
        _p1[1] * Math.cos(theta) + _p1[0] * Math.sin(theta)
    ];

    const _p2 = [p2.x - centerX, p2.y - centerY];
    const rotatedP2 = [
        _p2[0] * Math.cos(theta) - _p2[1] * Math.sin(theta),
        _p2[1] * Math.cos(theta) + _p2[0] * Math.sin(theta)
    ];

    return [
        [rotatedP1[0] + centerX, rotatedP1[1] + centerY],
        [rotatedP2[0] + centerX, rotatedP2[1] + centerY]
    ];
}

const utils = {
    makeRandInt,
    makeRandFloat,
    twoPointsDistance,
    pointToLineDistance,
    calVectorsAngle,
    calQuadPts
};

module.exports = { utils };
