// 以一本书的目录为例
const rawData = {
    level0: {
        // 用于确定干流-支流长度的数值，根据各节点原始信息中的本质属性量化而来
        subsRation: 540, // 当前节点的子节点量化值总和
        ration: 60,  // 当前节点量化值
        // 节点的原始信息，后续会有补充修改
        description: 'preface'
    },
    // 每一层级各项数据值的分布尽量符合正态分布，即两端数值小，中间大，
    // 这样更有利于河流线符号的布局
    level1: [
        { subsRation: 80, ration: 0, description: 'chap0' },
        { subsRation: 135, ration: 0, description: 'chap1' },
        { subsRation: 140, ration: 0, description: 'chap2' },
        { subsRation: 115, ration: 0, description: 'chap3' },
        { subsRation: 70, ration: 0, description: 'chap4' }
    ],
    level2: [
        [
            { subsRation: 30, ration: 0, description: 'chap0-0' },
            { subsRation: 70, ration: 0, description: 'chap0-1' }
        ],
        [
            { subsRation: 30, ration: 0, description: 'chap1-0' },
            { subsRation: 70, ration: 0, description: 'chap1-1' },
            { subsRation: 50, ration: 0, description: 'chap1-2' }
        ],
        [
            { subsRation: 40, ration: 0, description: 'chap2-0' },
            { subsRation: 70, ration: 0, description: 'chap2-1' },
            { subsRation: 30, ration: 0, description: 'chap2-2' }
        ],
        [
            { subsRation: 40, ration: 0, description: 'chap3-0' },
            { subsRation: 40, ration: 0, description: 'chap3-1' }
        ],
        [
            { subsRation: 25, ration: 0, description: 'chap4-0' },
            { subsRation: 45, ration: 0, description: 'chap4-1' }
        ],
    ]
}

module.exports = rawData