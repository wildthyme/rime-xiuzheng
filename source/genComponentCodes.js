const fs = require('node:fs');
const ZMFile = fs.readFileSync('./zhengma.tsv')
                 .toString()
                 .trim()
                 .split('\n')
                 .map(a => a.split('	')
                            .slice(0,3))

const ZMRanks = Object.fromEntries(ZMFile.map(i => [i[1], parseInt(i[2])]))
const ZMTestCodes = Object.fromEntries(Object.entries(Object.groupBy(ZMFile.map(i => i.slice(0,2)),
                                                                     i => i[1]
                                                                    )
                                                     ).map(i => [i[0], i[1].map(j => j[0])])
                                             // .filter(i => i[1].length > 1)
                                      )
const IDSChars = [ '⿰', '⿱', '⿺', '⿳', '⿴', '⿻', '⿵', '⿲', '⿸', '⿹', '⿷', '⿶' ]
const IDS = fs.readFileSync('./ids.tsv')
              .toString()
              .trim()
              .split('\n')
              .map(a => a.split('	')
                         .slice(0,2))

const manualCodes = Object.fromEntries(fs.readFileSync('./manualCodes.tsv')
                                          .toString()
                                          .trim()
                                          .split('\n')
                                          .map(a => a.split('	')
                                                     .slice(0,2)))
const correctCodes = Object.fromEntries(fs.readFileSync('./componentCodes.tsv')
                                          .toString()
                                          .trim()
                                          .split('\n')
                                          .map(a => a.split('	')
                                                     .slice(0,3)
                                                     )
                                          .map(a => [a[0], {
                                              correctCodes: a[1].split(':').sort((c,d) => d.split('.')[1].length - c.split('.')[1].length),
                                              testCodes: a[2].split(':').sort((c,d) => d.length - c.length),
                                          }])
)

const IDSObj = Object.fromEntries(IDS)
// const IDSObj = Object.fromEntries(IDS.toReversed())
function getCode(component) {
    const code = component in manualCodes ? manualCodes[component]
          : component in correctCodes ? correctCodes[component].correctCodes[0].split('.')[0]
          : component in IDSObj ? IDSObj[component] === component ? component : parseIDS(component)
          : component
    // console.log('component ' + component + ' has code ' + code)
    return code
}
function parseIDS (component, manualIDSeq) {
    const IDSeq = manualIDSeq || IDSObj[component] || component
    // only convert component to code once the root IDS char has been reached?
    // [⿺,辶,首] → [首,辶] → [ [⿱, 䒑,自], 辶] → [ [首,䒑,自], 辶]  → [ [Ua,Nl], W ] → [Ua,Nl,W] → UaNlW
    if (component in manualCodes || component in correctCodes || [...IDSeq].length === 1) return [ getCode(component) ]
    const treed = [...IDSeq].reduceRight((acc, cur, index) => {
        // if (acc.length>0) console.log(acc[0])
        // console.log(index)
        // console.log(acc)
        return acc.length >= 2 && ((cur === '⿶' && acc[0] === '凵') || (cur === '⿻' && acc[0] === '山') || (cur === '⿶' && acc[0] === '十'))
            ? [ [ getCode(acc[1]), getCode(acc[0]) ] ].concat(acc.slice(2, acc.length))
            // : acc.length >= 2 && (cur === '⿺' && acc[0] === '辶') // zhengma only semiconsistent w/ stroke orde here
            // ? [ [ getCode(acc[1]), getCode(acc[0]) ] ].concat(acc.slice(2, acc.length))
            : [ '⿳', '⿲' ].indexOf(cur) > -1
                ? ('⿲' === cur && '丿' === acc[0] && '乚' === acc[2]) // IDS says e.g. ⿲丿育乚 but zhengma treats it as 儿 + 育
                ? [ [ getCode('儿')], getCode(acc[1]) ]
            : ('⿳' === cur && '一' === acc[0] && '一' === acc[2])
                ? [ [ getCode('二')], getCode(acc[1]) ]
                : [ [ getCode(acc[0]), getCode(acc[1]), getCode(acc[2]) ] ].concat(acc.slice(3, acc.length))
            : ('⿵' === cur && ['冂', '⺆'].indexOf(acc[0]) > -1 && index !== 0) // drop contents of 冂
            ? [ 'Ld' ].concat(acc.slice(2, acc.length))
            : ('⿻' === cur && '一' === acc[0] && '曲' === acc[1]) // ⿻一曲 = top of 曹
            ? [ 'EKk' ].concat(acc.slice(2, acc.length))
            : ('⿻' === cur && 'コ' === acc[0] && '一' === acc[1]) // ⿻コ一 = Xb
            ? [ 'Xb' ].concat(acc.slice(2, acc.length))
            : IDSChars.indexOf(cur) > -1
            ? [ [ getCode(acc[0]), getCode(acc[1]) ] ].concat(acc.slice(2, acc.length))
            : [ cur ].concat(acc)
    }, [] ) 
    // console.log('component: ' + component)
    // console.dir('IDSeq: ' + IDSeq)
    // console.log('tree:')
    // console.dir(treed, {depth: 1000})
    return treed;
}
// console.dir(parseIDS('𢌞'), {depth:100})

const coded = Object.fromEntries(
    Object.entries(
        Object.groupBy(
            IDS.map(i => [ i[0], parseIDS(i[0], i[1]).flat(Infinity).join('') ]),
            i => i[0]
        )
    ).map(i => [i[0], i[1].map(j => j[1])//.filter(j => j.match(/^[A-Za-z]+$/))
               ])
          .filter(i => i[1].length > 0)
);

const collated = Object.keys(coded).reduce((acc, cur) => {
    const predictedCodes = coded[cur].map(i => {
        const topRoots = i.replace(/[^A-Z]/g, '')
        const roots = i.match(/([A-Z][a-z]*)/g) || ''
        let prediction = roots.length >= 4
            ? roots[0] + roots[1].slice(0, Math.max(2 - roots[0].length, 0)) + roots[roots.length - 2].slice(0, Math.min(3 - roots[0].length, 1)) + roots[roots.length - 1][0]
        : roots.length === 3
            ? roots.reduce((acc, cur, ind) => ind === 0
                                ? acc + cur
                           : ind === 1
                                ? acc + cur.slice(0, 3 - acc.length).slice(0,1)
                                : acc + cur.slice(0, 4 - acc.length)
                           , '')
            : roots.length === 2
                ? roots[0] + roots[1].slice(0,4 - roots[0].length)
                : i
        return i + '.' + prediction 
    });
    const filteredPredictedCodes = cur in ZMTestCodes
          ? [...new Set(predictedCodes.filter(i => ZMTestCodes[cur].filter(j => j === i.split('.')[1].toLowerCase()).length > 0))]
          : []
        const result = [...acc, [cur, {
            testCodes: ZMTestCodes[cur] || [],
            predictedCodes: predictedCodes,
            correctCodes: filteredPredictedCodes || [],
            rank: ZMRanks[cur] || 0
        }] ]
        return result
}, []).sort((a,b) => b[1].rank - a[1].rank)

const correctnessGrouped = Object.groupBy(collated, i => {
    return i[1].predictedCodes.filter(predictedCode => !(/[^A-z.]/.test(predictedCode))).length === 0
        ? 'missingComponent'
    : i[1].testCodes.length === 0
        ? 'noTest'
    : i[1].correctCodes.length > 0
        ? 'correct' 
    : i[1].predictedCodes.filter(
        predictedCode => i[1].testCodes.filter(
            testCode => testCode.padEnd(4, 'a') === predictedCode.split('.')[1].toLowerCase().padEnd(4, 'a')
                || testCode.padEnd(4, 'v') === predictedCode.split('.')[1].toLowerCase().padEnd(4, 'v')
        ).length > 0
    ).length > 0
        // ? 'halfCorrect'
        ? 'correct'
    : i[1].rank === 0
        ? 'lowRank'
        : 'incorrect'
})
// console.dir(correctnessGrouped, {depth: 10})

console.dir(correctnessGrouped.lowRank.map(i => i[0] + ', test:' + i[1].testCodes.join(' ') + ', pred:' + i[1].predictedCodes.join(' ') + ', rank:' + i[1].rank), {'maxArrayLength': 20000})
// console.dir(correctnessGrouped.lowRank.map(i => i[0] + ', test:' + i[1].testCodes.join(' ') + ', pred:' + i[1].predictedCodes.join(' ') + ', rank:' + i[1].rank), {'maxArrayLength': 20000})

// console.dir(correctnessGrouped.correct.map(i => i[0] + ', test:' + i[1].testCodes.join(' ') + ', corr:' + i[1].correctCodes.join(' ') + ', rank:' + i[1].rank), {'maxArrayLength': 1000})
// console.log(`correct: ${Object.keys(correctnessGrouped.correct).length}, halfCorrect: ${Object.keys(correctnessGrouped.halfCorrect).length}, incorrect: ${Object.keys(correctnessGrouped.incorrect).length}`)

fs.writeFile('./componentCodes.tsv', correctnessGrouped.correct.map(i => [
    i[0],
    i[1].correctCodes.length > 0
        ? i[1].correctCodes.join(':')
        : i[1].predictedCodes.join(':'),
    i[1].testCodes.join(':')
].join('	')).join('\n'), err => console.error(err))
