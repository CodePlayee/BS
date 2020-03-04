const d3 = require('d3')

function drawPt(pt, radius = 5, color = 'white') {
    const svg = d3.select('svg')
    svg.append('circle')
        .attr('cx', pt[0] || pt.x)
        .attr('cy', pt[1] || pt.y)
        .attr('r', radius)
        .attr('fill', color)
}

function drawLine(pts, linewidth = 1, color = 'blue') {
    const svg = d3.select('svg')

    const path = d3.path()
    path.moveTo(pts[0].x, pts[0].y)
    for (let i = 1, len = pts.length; i < len; i++) {
        path.lineTo(pts[i].x, pts[i].y)
    }
    svg.append('path')
        .attr('d', path.toString())
        .style('stroke', color)
        .style('stroke-width', linewidth)
        .style('fill', 'none')

}

function drawSvgBorder(width, height) {
    const svg = d3.select('svg')
    svg.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .style('fill', 'none')
        .style('stroke', 'rgb(150,150,150)')
        .style('stroke-width', 2)
}

module.exports = { drawSvgBorder, drawPt, drawLine }