const { River } = require('./River')
const Point = require('./Point')
const { drawPt, drawLine } = require('./draw')
const Bezier = require('bezier-js')
const turf = require('@turf/turf')
const { utils } = require('./utils')

const sqrt2 = Math.sqrt(2)
const digitMatcher = /\d+/

const lenTolerate = 10 //曲线长度允许的误差范围
const mbAngle = Math.PI / 3 //支流汇入干流的角度不大于 60°
const minMergeAngle = 10 // 支流汇入干流的最小角度
const stepAngle = 5 // 调整支流位置时每次绕汇入点旋转的角度


// 构建顶级干流，由贝塞尔曲线生成
function genMainStream(svg, padding, properties) {
    let { width, height } = svg.style
    width = +width.match(digitMatcher)[0] || 960
    height = +height.match(digitMatcher)[0] || 600

    const source = new Point(padding, height * 0.5)
    const target = new Point(width - padding, height * 0.5)
    const sCtrlPt = new Point(width * 0.5, height * 0.25)
    const tCtrlPt = new Point(width * 0.5, height * 0.75)

    const ms = new River(null, source, target, properties)
    ms.setBezierByCtrlPts(sCtrlPt, tCtrlPt)
    ms.setCurveLen = ms.bezier.length()

    return ms
}

/**
 * 
 * @param {River} parent 上级河流
 * @param {[]} data 上级河流的各支流原始数据
 */
function genBranches(parent, data) {
    const branchCount = data.length

    let branch
    const branches = [] // 未设置起止点和贝塞尔曲线的支流
    const leftBranchesBeziers = [] // 干流左侧支流对应的贝塞尔曲线
    const rightBranchesBeziers = [] // 干流右侧支流对应的贝塞尔曲线

    for (let i = 0; i < branchCount; i++) {
        branch = new River(parent, undefined, undefined, data[i])
        branches.push(branch)
    }

    parent.setBranches(branches)

    const branchMergePts = parent.calcBranchMergePts()
    branches.forEach((branch, idx) => {
        const { pt, iValue } = branchMergePts[idx]
        // 1.确定各支流的汇入点（河口）
        branch.setTarget(pt)
        drawPt(branch.target)

        // 2.对于各支流，生成满足设定长度的贝塞尔曲线，在干流两侧交错排布但未旋转
        let branchBezier = genBezierByLen(branch.target, branch.setCurveLen, idx)
        // drawLine(branchBezier.getLUT(), 2, 'green') 

        // 3.沿着干流，依次对各支流，绕各自的 target 点旋转，将支流摆放到合理位置
        const msNormal = parent.bezier.normal(iValue) //干流上汇入点的法向量
        let bNormal = branchBezier.normal(1)//支流上汇入点的法向量
        let angle = utils.calVectorsAngle(msNormal, bNormal) //干流与初始位置的支流在汇入点的夹角

        if (idx % 2 === 0) {
            branchBezier = hangBranch(false, rightBranchesBeziers, branchBezier, branch.target, angle, minMergeAngle, stepAngle)
        } else {
            branchBezier = hangBranch(true, leftBranchesBeziers, branchBezier, branch.target, angle, minMergeAngle, stepAngle)
        }

        branch.setBezier(branchBezier)
    });

    // [...leftBranchesBeziers, ...rightBranchesBeziers].forEach(branchBezier => {
    //     drawLine(branchBezier.getLUT(), 2)
    // })

    return branches
}

//---------------------工具函数--------------------
/**
 * 玄学函数：根据 target 点和预设曲线长度生成贝塞尔曲线，注意还需要经过旋转等操作。
 * @param {Point} t 
 * @param {Number} len 
 * @param {Number} idx 支流的序号，以奇偶将支流交错排布在干流两侧
 */
function genBezierByLen(t, len, idx) {
    let w, h, s, sCtrl, tCtrl, bezier, i = 1
    const d = len / sqrt2 * 0.75
    w = d
    if (idx % 2 !== 0) {
        while (i < 2) {
            h = d * i
            i += 0.05
            s = new Point(t.x - w, t.y + h)
            sCtrl = new Point(s.x, s.y - h * 0.5)
            tCtrl = new Point(t.x, t.y + h * 0.5)
            bezier = new Bezier(s, sCtrl, tCtrl, t)
            if (Math.abs(bezier.length() - len) < lenTolerate) {
                break
            }
        }
    } else {
        while (i < 2) {
            h = d * i
            i += 0.05
            s = new Point(t.x - w, t.y - h)
            sCtrl = new Point(s.x, s.y + h * 0.5)
            tCtrl = new Point(t.x, t.y - h * 0.5)
            bezier = new Bezier(s, sCtrl, tCtrl, t)
            if (Math.abs(bezier.length() - len) < lenTolerate) {
                break
            }
        }
    }

    return bezier
}

// 缩小坐标
function minimizeCoord(pt) {
    return [pt.x * 0.01, pt.y * 0.01]
}
// 放大坐标
function magnifyCoord(pt) {
    return [pt[0] * 100, pt[1] * 100]
}

function genBezierBy4pts(s, sCtrl, tCtrl, t) {
    s = new Point(s[0], s[1])
    sCtrl = new Point(sCtrl[0], sCtrl[1])
    tCtrl = new Point(tCtrl[0], tCtrl[1])
    t = new Point(t[0], t[1])
    bezier = new Bezier(s, sCtrl, tCtrl, t)
    return bezier
}

/**
 * 绕一个点，旋转贝塞尔曲线。实际上是先旋转2端点和2控制点，再重新生成 Bezier 曲线
 * @param {Bezier} bezier 贝塞尔曲线对象
 * @param {Point} pivot 旋转围绕的点
 * @param {number} theta 旋转角度,顺时针为负，单位为度
 */
function rotateBezier(bezier, pivot, theta) {
    let { 0: s, 1: sCtrl, 2: tCtrl, 3: t } = bezier.points
    s = minimizeCoord(s)
    sCtrl = minimizeCoord(sCtrl)
    tCtrl = minimizeCoord(tCtrl)
    t = minimizeCoord(t)
    pivot = minimizeCoord(pivot)

    const points = turf.multiPoint([s, sCtrl, tCtrl, t]) //点的第二个坐标不能大于90
    const rotatedPts = turf.transformRotate(points, theta, { pivot })
        .geometry.coordinates.map(pt => magnifyCoord(pt))

    const rotatedBezier = genBezierBy4pts(...rotatedPts)
    return rotatedBezier
}

/**
 * 两条线是否相交
 * @param {Bezier | []} bezier1 
 * @param {Bezier | []} bezier2 
 */
function isTwoLinesIntersect(bezier1, bezier2) {
    let pts1, pts2
    if (Array.isArray(bezier1)) {
        pts1 = bezier1
        pts2 = bezier2
    } else {
        pts1 = bezier1.getLUT().map(pt => [pt.x, pt.y])
        pts2 = bezier2.getLUT().map(pt => [pt.x, pt.y])
    }

    const line1 = turf.lineString(pts1);
    const line2 = turf.lineString(pts2);
    return !turf.booleanDisjoint(line1, line2);
}

/**
 * 一条线与多条线进行是否相交的检测
 * @param {[Bezier] | [[]]} beziers 
 * @param {Bezier | []} bezier 
 */
function isLinesIntersect(beziers, bezier) {
    let intersect = false
    for (let i = beziers.length - 1; i > -1; i--) {
        intersect = isTwoLinesIntersect(beziers[i], bezier)
        if (intersect) {
            break
        }
    }
    return intersect
}

/**
 * 将支流挂在干流上
 * @param {boolean} isLeft 该支流是否在干流左侧
 * @param {[]} branchesBezires 干流一侧的已经挂好的支流
 * @param {Bezier} branchBezier 代表该支流的贝塞尔曲线对象
 * @param {Point} pivot 贝塞尔曲线旋转所围绕的点
 * @param {number} angle 旋转前支流与干流在汇入点的夹角
 * @param {number} minMergeAngle 最小汇入角
 * @param {number} stepAngle 调整支流位置时每次旋转的角度
 */
function hangBranch(isLeft, branchesBezires, branchBezier, pivot, angle, minMergeAngle, stepAngle) {
    let intersect
    // 奇数序数的支流，绕 targrt 顺时针旋转，排在干流起点到终点方向左侧
    if (isLeft) {
        branchBezier = rotateBezier(branchBezier, pivot, -angle / Math.PI * 180 - minMergeAngle)
        intersect = isLinesIntersect(branchesBezires, branchBezier)
        while (intersect) {
            branchBezier = rotateBezier(branchBezier, pivot, -angle / Math.PI * 180 - minMergeAngle - stepAngle)
            intersect = isLinesIntersect(branchesBezires, branchBezier)
        }
    } else {
        // 偶数序数的支流，绕 targrt 逆时针旋转，排在干流起点到终点方向右侧
        branchBezier = rotateBezier(branchBezier, pivot, angle / Math.PI * 180 + minMergeAngle)
        intersect = isLinesIntersect(branchesBezires, branchBezier)
        while (intersect) {
            branchBezier = rotateBezier(branchBezier, pivot, angle / Math.PI * 180 + minMergeAngle + stepAngle)
            intersect = isLinesIntersect(branchesBezires, branchBezier)
        }
    }

    branchesBezires.push(branchBezier)
    return branchBezier
}

function layoutOptimize(ms, branchesBezires) {

}

module.exports = { genMainStream, genBranches }