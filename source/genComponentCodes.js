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
missingCodes = []
function makeCode (inputChar, originalChar, IDSeq) {
    if (originalChar && inputChar === originalChar) missingCodes.push(inputChar);
    IDSeq = IDSeq || IDSObj[inputChar] || ''
    const code = IDSChars.indexOf(inputChar) > -1 ? ''
          : inputChar in manualCodes ? manualCodes[inputChar]
          : inputChar in correctCodes ? correctCodes[inputChar].correctCodes[0].split('.')[0] //working?
          : (IDSeq !== '' && inputChar !== originalChar) ? [...IDSeq].map(char => makeCode(char, inputChar)).join('')
          : inputChar
    if (inputChar === code) missingCodes.push(inputChar)
    // if (IDSeq !== 0) console.log("analyzed: " + [inputChar, IDSeq, code])
    // console.log([inputChar, code])
    return code
}
const coded = Object.fromEntries(
    Object.entries(
        Object.groupBy(
            IDS.map(i => [i[0], makeCode(i[0], undefined, i[1])]),
            // needCodes.map(char => [ char, makeCode(char)]),
            i => i[0]
        )
    ).map(i => [i[0], i[1].map(j => j[1])//.filter(j => j.match(/^[A-Za-z]+$/))
               ])
          .filter(i => i[1].length > 0)
);
missingCodes = [...new Set(missingCodes)]
console.dir(missingCodes, {'maxArrayLength': 1000});
console.log(missingCodes.length)
// console.log(coded)
// const allChars = [...new Set(Object.keys(ZMTestCodes).concat(IDS.map(i => i[0])))]

// const intersectChars = [...new Set(Object.keys(ZMTestCodes)).intersection(new Set(Object.keys(coded)))]
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
    return i[1].testCodes.length === 0
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

// const correctCharCodes = Object.fromEntries(collated.filter(i => i[1].correctCodes.length > 0))
// const correctCharCodes = correctnessSorted.true
// const incorrectCharCodes = correctnessSorted.false.filter(char => char[1].predictedCodes.map(predictedCode => predictedCode.split('.')[1])
                                                                         // .filter(predictedCode => char[1].testCodes.filter(testCode => testCode.padEnd(4, 'a') === predictedCode.toLowerCase().padEnd(4, 'a') || testCode.padEnd(4, 'v') === predictedCode.toLowerCase().padEnd(4, 'v')) > 0) > 0)

console.dir(correctnessGrouped.lowRank.map(i => i[0] + ', test:' + i[1].testCodes.join(' ') + ', pred:' + i[1].predictedCodes.join(' ') + ', rank:' + i[1].rank), {'maxArrayLength': 20000})
// console.dir(correctnessGrouped.correct.map(i => i[0] + ', test:' + i[1].testCodes.join(' ') + ', corr:' + i[1].correctCodes.join(' ') + ', rank:' + i[1].rank), {'maxArrayLength': 1000})
// console.log(`correct: ${Object.keys(correctnessGrouped.correct).length}, halfCorrect: ${Object.keys(correctnessGrouped.halfCorrect).length}, incorrect: ${Object.keys(correctnessGrouped.incorrect).length}`)

fs.writeFile('./componentCodes.tsv', correctnessGrouped.correct.map(i => [
    i[0],
    i[1].correctCodes.length > 0
        ? i[1].correctCodes.join(':')
        : i[1].predictedCodes.join(':'),
    i[1].testCodes.join(':')
].join('	')).join('\n'), err => console.error(err))
