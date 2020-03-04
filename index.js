const Event = require('bcore/event');
// const $ = require('jquery');
// const _ = require('lodash');
const { genMainStream, genBranches } = require('./src/main')
const { drawPt, drawSvgBorder } = require('./src/draw')
const rawData = require('./src/data')

class Rivers extends Event {
  constructor(container, config) {
    super();
    this.container = container;
    this.config = config;
    this.apis = config.apis;
    this.data = [];
    this.init();
    this.rendered = false;

  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    let mainstream //顶级干流
    let level1Branches
    // let lenRatio //原始信息中数值与图面线符号长度的比值（例如数据中的 1 对应图面 100px）

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    svg.setAttribute("style", `width:${width}; height:${height}; z-index:1;`);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.container.appendChild && this.container.appendChild(svg)

    drawSvgBorder(width, height)

    const msPadding = 50 //顶级干流起止点与绘图区域边框之间的间隙
    mainstream = genMainStream(svg, msPadding, rawData.level0)
    mainstream.draw(mainstream.bezierPts, 'mainstream', undefined, 4, undefined)

    level1Branches = genBranches(mainstream, rawData.level1)
    mainstream.setBranches(level1Branches)

    level1Branches.forEach((branch, idx) => branch.draw(branch.bezierPts, `level1-${idx}`, undefined, 2, undefined))

    level1Branches.forEach((branch, idx) => {

    })

    // 用来展示点击详情
    // const infoDiv = document.createElement('div');
    // const divWidth = width * 0.3;

    // infoDiv.style.cssText = `background:gray; opacity:0.5; color:yellow; 
    // width:${divWidth}px; position:fixed; left:10px; top:10px; 
    // padding:5px;
    // border:3px solid black; z-index:1;`;
    // this.container.appendChild(infoDiv);

  }

  // allow the camera to orbit around a target
  loop() {
    requestAnimationFrame(this.loop.bind(this));
  }

  // render or setData
  render(data) {
    if (this.rendered) return;

    this.data = data;
    // this.loop();
    this.rendered = true;
  }

  // 用户在界面修改了配置
  updateOptions(config) {
    this.rendered = false;

    // this.render(this.data);

  }

  // destroy
  destroy() {
    // this.container.removeChild(this.canvas);
  }
}

module.exports = Rivers;

