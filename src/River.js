const d3 = require("d3");
const Bezier = require('bezier-js')
const { recursiveSubdivision } = require("./noisyEdge.js");
const { utils } = require('./utils')
const { drawPt } = require('./draw')
const Point = require('./Point')

const seed = 4; //used to product random numbers
const randInt = utils.makeRandInt(seed); // random int maker

const branchAndMainstreamLenScale = 1.6 //支流总长度与干流总长度的比值
const defaultMsHeadLenRatio = 0.3 //干流开头一段河流长度与支流总长度的比值
const lenTolerate = 10 //曲线长度允许的误差范围

class River {
	/**
	 * 
	 * @param {River} parent 
	 * @param {Point} source 河源点
	 * @param {Point} target 河口点
	 * @param {object} properties 原始信息
	 */
	constructor(parent, source, target, properties) {
		// this.id=id //后续可能还需要 id 属性
		this.parent = parent //该河流汇入的上级河流，最高级干流的 parent 为空
		this.children = undefined //该河流的支流
		this.properties = properties //原始语义信息

		this.ration = properties && properties.ration // 当前节点量化值
		this.subsRation = properties && properties.subsRation // 当前节点的子节点量化值总和

		this.msHeadLen = undefined // 该河流作为干流时，其源头一段（与其支流表达作用类似）的长度
		this.setCurveLen = undefined // 河流的设定长度，在河流生成之前已按比例计算设定
		this.strightLen = undefined //河源到河口的图面直线距离
		this.source = source
		this.target = target

		// 以下数据可变
		this.varLinePts = undefined //折线上的点集合
		this.bezier = undefined //贝塞尔曲线
		this.bezierPts = undefined // 贝塞尔曲线上的点集合
		this.riverPts = undefined //光滑处理后的线上点集合

		this.branchMergePts = undefined // 干流上各支流汇入点 {pt:点,i:在0~1之间的 this.bezier 取点参数}
	}

	// 获取当前河流的层级
	getLevel() {
		let parent = this.parent
		let level = 0
		while (parent) {
			parent = parent.parent
			level++
		}
		return level
	}

	// 设置河源
	setSource(pt) {
		this.source = pt
	}

	// 设置河口
	setTarget(pt) {
		this.target = pt
	}

	/**
	 * 在起点未知的情况下，为该河流找到了合适的贝塞尔曲线并设置
	 * @param {Bezier} bezier 
	 * @param {Number} steps 贝塞尔曲线上内插的点数量
	 */
	setBezier(bezier, steps) {
		const { 0: source } = bezier.points
		this.setSource(new Point(source.x, source.y))
		this.bezier = bezier
		this.bezierPts = this.bezier.getLUT(steps)
	}

	/**
	 * 已确定起止点，由两个控制点生成贝塞尔曲线并获取线上中间点集合
	 * @param {Point} sCtrlPt 
	 * @param {Point} tCtrlPt 
	 * @param {number} steps 
	 */
	setBezierByCtrlPts(sCtrlPt, tCtrlPt, steps) {
		/**
		 *      sCtrlPt       tCtrlPt
		 * 
		 * 	source												target
		 */
		const bezier = new Bezier(this.source, sCtrlPt, tCtrlPt, this.target)

		this.bezier = bezier
		this.bezierPts = this.bezier.getLUT(steps)
		return bezier
	}

	// 设置该河流的支流
	setBranches(branches) {
		this.children = branches
	}

	// 获取河流图面符号长度
	// 暂时按贝塞尔曲线长度计算
	getCurveLen() {
		return this.bezier.length()
	}

	// 计算并设定各支流的曲线长度(在生成支流之前)
	setBranchCurveLen() {
		//支流总的曲线长度
		const branchCurveLenSum = this.setCurveLen * branchAndMainstreamLenScale
		this.msHeadLen = this.ration ? this.ration / this.subsRation * branchCurveLenSum
			: defaultMsHeadLenRatio * branchCurveLenSum
		this.children.forEach(branch => {
			branch.setCurveLen = (branch.ration + branch.subsRation) / this.subsRation * branchCurveLenSum
		})
	}

	// 按固定数量间隔获取贝塞尔曲线上的构成点，作为各支流的汇入点（河口），适用于顶级干流
	// 注意：尽管干流源头一段（msHead）与支流(branch[i])之间的长度比等于其量化数值比，
	// 但是 msHead、支流与干流上其他部分的长度不满足这样的比例关系，原因在于支流总长度不等于干流长度.
	calcBranchMergePts() {
		if (!this.bezier) return console.error('bezier of the river must be generated before calMergePts.')
		if (!this.children) return console.error('the children of this river is undefined.')

		const branchCount = this.children.length
		const { bezierPts } = this
		const msPtCount = bezierPts.length
		let mergePts = []

		this.setBranchCurveLen()

		let msHeadPt
		let curLen = this.bezier.split(0, 0.1).length()
		let i = Math.round(msPtCount * 0.1)
		// 通过长度确定第一个支流汇入点(干流上 0.1 到 0.5 点位处)
		for (; i < msPtCount * 0.5; i++) {
			curLen += utils.twoPointsDistance(bezierPts[i - 1], bezierPts[i])
			if (Math.abs(curLen - this.msHeadLen) < lenTolerate) {
				msHeadPt = bezierPts[i]
				break
			}
		}

		curLen = 0
		// 剩下的支流汇入点在第一个支流汇入点和河口之间按长度均匀分段获取
		const segLen = (this.setCurveLen - this.msHeadLen) / branchCount
		for (let j = msPtCount - 2; j > -1; j--) {
			curLen += utils.twoPointsDistance(bezierPts[j], bezierPts[j + 1])
			if (Math.abs(curLen - segLen) < 10) {
				mergePts.unshift(bezierPts[j])
				curLen = 0
				if (mergePts.length + 1 === branchCount) {
					break
				}
			}
		}
		mergePts.unshift(msHeadPt)

		// 最终转换为由 Bezier.get(t) 方法获得的点({pt:点,i:在 0~1之间的参数})
		mergePts = mergePts.map(pt => pt2i(this.bezier, pt))
		this.branchMergePts = mergePts
		return mergePts
	}

	// 利用 noisyEdge 生成折线上的点集合
	genVarlinePts(options) {
		const { minLen, amplitude, x0, y0, x1, y1, x2, y2, x3, y3 } = options;
		const getVarlinePts = recursiveSubdivision(minLen, amplitude, randInt);
		const startPt = [x0, y0];
		const endPt = [x1, y1];
		const topPt = [x2, y2];
		const bottomPt = [x3, y3];

		const ptsInVarline = getVarlinePts(startPt, endPt, topPt, bottomPt);
		this.varLinePts = [startPt, ...ptsInVarline]
		return this.varLinePts;
	}

	//计算河源到河口的图面直线距离
	calcStrightLen() {
		const { source, target } = this
		if (source && target) {
			const dx = source.x - target.x
			const dy = source.y - target.y
			return this.strightLen = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))
		}
		console.error('unvalid source and target in calStrightLen!')
	}

	/**
	 * 绘制单线河
	 * @param {[]} pts 代表河流的线上的点
	 * @param {string} id 河流id
	 * @param {string} color 
	 * @param {string} containerId 容器id
	 */
	draw(pts, id, color = 'blue', linewidth = 1, containerId) {
		const pathGen = d3.path();
		if (pts[0].x || pts[0].x === 0) {
			pathGen.moveTo(pts[0].x, pts[0].y);
			pts.forEach(pt => {
				pathGen.lineTo(pt.x, pt.y);
			});
		} else if (pts[0][0] || pts[0][0] === 0) {
			pathGen.moveTo(pts[0][0], pts[0][1]);
			pts.forEach(pt => {
				pathGen.lineTo(pt[0], pt[1]);
			});
		}

		let container;
		if (containerId) {
			container = d3.select(`#${containerId}`);
		} else {
			container = d3.select('svg');
		}

		let path = container.select(`#${id}`);
		path.remove();
		container
			.append("path")
			.style("stroke", color)
			.style('stroke-width', linewidth)
			.style("fill", "none")
			.attr("d", pathGen)
			.attr("id", () => id);
	}
}

// 由贝塞尔曲线上的点的坐标确定其 i 值
function pt2i(bezier, pt) {
	let curPt
	for (let i = 0.01; i < 1.0; i += 0.01) {
		curPt = bezier.get(i)
		if (Math.pow(curPt.x - pt.x, 2) + Math.pow(curPt.y - pt.y, 2) < 10) {
			return { pt: curPt, iValue: +i.toFixed(4) }
		}
	}
}

module.exports = { River }