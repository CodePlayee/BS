
// import * as d3 from "d3"
const d3 = require("d3");
const GUI = require('GUI')
// import { GUI } from "../../node_modules/dat.gui/build/dat.gui.module.js";
const { Point, recursiveSubdivision } = require("./noisyEdge.js");
const { utils } = require('./utils')
// import { utils } from "./utils.js";

const seed = 4; //used to product random numbers
const randInt = utils.makeRandInt(seed); //

const width = window.innerWidth || 960;
const height = window.innerHeight || 600;

//创造单条河流所需的参数
class Options {
    constructor(
        minLen = 10,
        amplitude = 0.5,
        x0 = 10,
        y0 = height * 0.5,
        x1 = width * 0.9,
        y1 = height * 0.5,
        x2 = width * 0.5,
        y2 = 10,
        x3 = width * 0.5,
        y3 = height * 0.9
    ) {
        this.minLen = minLen;
        this.amplitude = amplitude;
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.x3 = x3;
        this.y3 = y3;
    }
}

//生成一条曲线的构成点
function genVarlinePts(options) {
    const { minLen, amplitude, x0, y0, x1, y1, x2, y2, x3, y3 } = options;
    const getVarlinePts = recursiveSubdivision(minLen, amplitude, randInt);
    const startPt = new Point(x0, y0);
    const endPt = new Point(x1, y1);
    const topPt = new Point(x2, y2);
    const bottomPt = new Point(x3, y3);

    const ptsInVarline = getVarlinePts(startPt, endPt, topPt, bottomPt);

    return [startPt, ...ptsInVarline];
}

const svg = d3.select("svg");

//除河网外的辅助性要素
const branchStartPtCandidates = []; //各支流的起点候选集
let segPts = []; //干流支流交汇点(包括干流首尾点)
const quadPts = []; //绘制曲线时的起始四边形控制点（控制点与曲线起止点构成四边形）
let branchEnds = []; //各支流起止点

const msStartPt = new Point(100, height * 0.7);
const msEndPt = new Point(width * 0.7, 100);
const msTopPt = new Point(100, 100);
const msBottomPt = new Point(width * 0.7, height * 0.7);
//干流(ms:main stream)
const msOpts = new Options(
    10,
    0.2,
    msStartPt.x,
    msStartPt.y,
    msEndPt.x,
    msEndPt.y,
    msTopPt.x,
    msTopPt.y,
    msBottomPt.x,
    msBottomPt.y
);

//const branchLenRatio = [0.2, 0.3, 0.2, 0.15, 0.15]; //各支流长度比
const branchLenRatio = [0.1, 0.13, 0.17, 0.12, 0.18, 0.1, 0.1, 0.1];
branchEnds = renderRivers(msOpts, branchLenRatio);

//  renderAssitObj(branchStartPtCandidates, branchEnds);
addGUI(branchStartPtCandidates, msOpts, branchLenRatio, branchEnds);

//------------------------------------------------------------------------
//干流上的分割点
//msPts:干流上的构成点
//lenRatioArr:各支流占总长的比例(为简化处理，各支流长度之和为干流长度)
function genSegPts(msPts, lenRatioArr, msLen) {
    if (!msPts || msPts.length < 2) return;
    const len = msPts.length;
    if (!msLen) {
        let lenSum = 0; //干流长度
        msPts.reduce((acc, cur, idx) => {
            lenSum += utils.twoPointsDistance(msPts[idx - 1], cur);
        });
        msLen = lenSum;
    }

    const branchLenArr = lenRatioArr.map(ratio => ratio * msLen);
    const segPts = [msPts[0]];

    let idx = 1;
    for (let i = 0; i < lenRatioArr.length - 1; i++) {
        let segLen = 0;
        for (let j = idx; j < len; j++) {
            segLen += utils.twoPointsDistance(msPts[j], msPts[j - 1]);
            if (segLen >= branchLenArr[i]) {
                segPts.push(msPts[j]);
                idx = j;
                break;
            }
        }
    }
    segPts.push(msPts[len - 1]);
    return segPts;
}

//确定各支流的端点
//segPts:分支点；lens：各支流的长度
function genBranchEnds(segPts, lens, branchStartPtCandidates) {
    const len = segPts.length;
    if (!len || len < 2) {
        console.error("the count of branches can not be less than 2!");
        return [];
    }
    const branchEnds = [[segPts[0], segPts[1]]];
    for (let i = 1; i < len - 1; i++) {
        //干流在分支点的夹角（由前一分支点、当前分支点、后一分支点计算）
        const msAngle = utils.calVectorsAngle(
            [segPts[i - 1].x - segPts[i].x, segPts[i - 1].y - segPts[i].y],
            [segPts[i + 1].x - segPts[i].x, segPts[i + 1].y - segPts[i].y]
        );

        let baseAngle = 0;

        if (i % 2 === 1) {
            //后一分支点、当前分支点连线与x轴正方向的夹角
            baseAngle = utils.calVectorsAngle(
                [1, 0],
                [segPts[i + 1].x - segPts[i].x, segPts[i + 1].y - segPts[i].y]
            );
        } else {
            //前一分支点、当前分支点连线与x轴正方向的夹角
            baseAngle =
                Math.PI * 2 -
                utils.calVectorsAngle(
                    [1, 0],
                    [segPts[i - 1].x - segPts[i].x, segPts[i - 1].y - segPts[i].y]
                );
        }

        const segStartPts = []; //某一支流的可能起点
        for (
            // let theta = msAngle * 0.25;
            // theta <= msAngle * 0.75;
            // theta += 0.1
            let theta = msAngle * 0.1;
            theta <= msAngle * 0.25 ||
            (theta > msAngle * 0.75 && theta <= msAngle * 0.9);
            theta += 0.1
        ) {
            const x =
                segPts[i].x + lens[i] * Math.cos(Math.PI * 2 - theta - baseAngle);
            const y =
                segPts[i].y + lens[i] * Math.sin(Math.PI * 2 - theta - baseAngle);
            const pt = new Point(x, y);
            segStartPts.push(pt);
            branchStartPtCandidates.push(pt);
            // drawPts([pt], `branch${i}`, "green");
        }

        //从segStartPts随机选出一个点
        //const idx = Math.floor(Math.random() * (segStartPts.length - 1));
        //branchEnds.push([segStartPts[idx], segPts[i]]);

        //羽毛状河网
        let theta = 0;
        if (i % 2 === 1) {
            theta = msAngle * 0.75;
        } else {
            theta = msAngle * 0.25;
        }

        //平形状河网
        //theta = msAngle * 0.5;

        const x =
            segPts[i].x + lens[i] * Math.cos(Math.PI * 2 - theta - baseAngle);
        const y =
            segPts[i].y + lens[i] * Math.sin(Math.PI * 2 - theta - baseAngle);
        const pt = new Point(x, y);
        branchEnds.push([pt, segPts[i]]);
    }
    return branchEnds;
}

//
function drawPts(pts, classVal, ptColor, containID) {
    let lineEndPts;
    if (containID) {
        lineEndPts = svg
            .select(`#${containID}`)
            .selectAll("circle")
            .data(pts);
    } else {
        lineEndPts = svg.selectAll(`.${classVal}`).data(pts); //the update part in d3
    }

    lineEndPts
        .enter()
        .append("circle")
        .attr("cx", d => d.x || d[0])
        .attr("cy", d => d.y || d[1])
        .attr("r", 5)
        .attr("class", `${classVal}`)
        .style("fill", d => ptColor || d.color || "black");

    lineEndPts.attr("cx", d => d.x).attr("cy", d => d.y);

    lineEndPts.exit().remove();
}

//绘制唯一id标识的path元素
function drawUniquePath(pts, id, color, containerId) {
    const pathGen = d3.path();
    if (pts[0].x || pts[0].x === 0) {
        pathGen.moveTo(pts[0].x, pts[0].y);
        pts.forEach(ele => {
            pathGen.lineTo(ele.x, ele.y);
        });
    } else if (pts[0][0] || pts[0][0] === 0) {
        pathGen.moveTo(pts[0][0], pts[0][1]);
        pts.forEach(ele => {
            pathGen.lineTo(ele[0], ele[1]);
        });
    }

    let container;
    if (containerId) {
        container = svg.select(`#${containerId}`);
    } else {
        container = svg;
    }
    let path = container.select(`#${id}`);
    path.remove();
    container
        .append("path")
        .style("stroke", () => color || "blue")
        .style("fill", "none")
        .attr("d", pathGen)
        .attr("id", () => id);
}

//绘制河网线要素
function renderRivers(msOpts, branchLenRatio, branchOpts) {
    const msPts = genVarlinePts(msOpts);

    let msLen = 0; //干流曲线长度
    msPts.reduce((acc, cur, idx) => {
        msLen += utils.twoPointsDistance(msPts[idx - 1], cur);
    });

    //干流支流交汇点(包括干流首尾点)
    segPts = genSegPts(msPts, branchLenRatio, msLen);
    //各支流起始点
    const branchEnds = genBranchEnds(
        segPts,
        branchLenRatio.map(ratio => ratio * msLen),
        branchStartPtCandidates
    );

    for (let i = 1; i < branchEnds.length; i++) {
        const p1 = branchEnds[i][0];
        const p2 = branchEnds[i][1];
        const [p3, p4] = utils.calQuadPts(p1, p2, Math.PI * 0.5);
        quadPts.push(p3, p4);

        const options = new Options(
            5,
            0.5,
            p1.x,
            p1.y,
            p2.x,
            p2.y,
            p3[0],
            p3[1],
            p4[0],
            p4[1]
        );
        const branchPts = genVarlinePts(options);
        drawUniquePath(branchPts, `branch_${i}`, "blue", "river");
    }

    drawUniquePath(msPts, "mainStream", "blue", "river");
    return branchEnds;
}

//绘制除河网以外的辅助要素
function renderAssitObj(branchStartPtCandidates, branchEnds) {
    drawPts(branchStartPtCandidates, "bspc", "green", "bspc");
    drawPts(branchEnds.flat(1), "branchEnds", "red", "branchEnds");
}

//
function addGUI(
    branchStartPtCandidates,
    msOpts,
    branchLenRatio,
    branchEnds
) {
    const gui = new GUI();

    const refreshOpt = {
        refresh: function () {
            svg
                .select("#branchEnds")
                .selectAll("circle")
                .remove();
            svg
                .select("#bspc")
                .selectAll("circle")
                .remove();

            renderRivers(msOpts, branchLenRatio);
            branchStartPtCandidates.length = 0;
            //  renderAssitObj(branchStartPtCandidates, branchEnds);
        }
    };
    gui.add(refreshOpt, "refresh").name("重新生成");

    gui
        .add(msOpts, "minLen", 1, 20, 2)
        .name("干流最小弧长")
        .onFinishChange(value => (msOpts.minLen = value));
    gui
        .add(msOpts, "amplitude", 0, 1, 0.1)
        .name("干流波动幅度")
        .onFinishChange(value => (msOpts.amplitude = value));

    const assitOpt = {
        bspcCtrl: function () {
            const container = svg.select("#bspc");
            container.attr("display", function () {
                return container.attr("display") === "none" ? "block" : "none";
            });
        }
    };
    gui.add(assitOpt, "bspcCtrl").name("支流起点候选集");
}

//检验生成的曲线是否满足要求(检验规则待定)
function validatePts(pts) {
    if (!pts || !pts.length) return;
    const len = pts.length;
    let varlineLen = 0;
    pts.reduce((acc, cur, idx) => {
        varlineLen += utils.twoPointsDistance(pts[idx - 1], cur);
        return varlineLen;
    });

    const straightLineLen = utils.twoPointsDistance(pts[0], pts[len - 1]);

    console.log(varlineLen);
    console.log(straightLineLen);
    console.log(varlineLen / straightLineLen);
}
