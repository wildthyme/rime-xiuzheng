const target = process.argv[2] || 'trad'
const fs = require('node:fs');
yitiPath = target === 'simp' ? './yiti.simp.tsv' : './yiti.tsv'
const yiti = Object.fromEntries(fs.readFileSync(yitiPath)
                                          .toString()
                                          .trim()
                                          .split('\n')
                                          .map(a => a.split('	')
                                                     .slice(0,2)))
function vulgarize (word) {
    return [...word].filter(char => char in yiti).length > 0
                                         ? [ word, [...word].map(char => char in yiti
                                                           ? yiti[char]
                                                           : char).join('') ]
                                         : [ word ]
    
}
const freqListPath = target === 'simp' ? './BCC-global.csv' : './BCC-global.simp.csv'
const wordCSVRanked = Object.fromEntries(
    Object.values(
        Object.groupBy(
            fs.readFileSync(freqListPath)
              .toString()
              .trim()
              .split('\n')
              .map(i => i.split(','))
              // .map(i => [i[0], parseInt(i[1])])
              .flatMap(i => vulgarize(i[0]).map(j => [j, parseInt(i[1])]))
            , i => i[0]
        )
    ).flatMap(i => i.sort((i, j) => i[1] - j[1]))
)
const manualRoots = Object.fromEntries(fs.readFileSync('./manualRoots.tsv')
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
const dictPath = target === 'simp' ? './dict.simp.tsv' : './dict.tsv'
const wordCSV = Object.keys(correctCodes)
                      .concat(fs.readFileSync(dictPath)
                                .toString()
                                .trim()
                                .split('\n')
                                .map(i => i.split('	')[0])
                                .flatMap(i => vulgarize(i))
                             )

const wordList = wordCSV//.filter(i => i.length <= 3)
const wordTests = wordList.filter(i => [...i].every(j => j in correctCodes))
                          .map(i => {
                              const chars = [...i].map(j => {
                                  const fullCode = correctCodes[j].correctCodes[0].split('.')[0]
                                  const fourCode = correctCodes[j].correctCodes[0].split('.')[1]
                                  const roots = fullCode.split('.')[0].match(/([A-Z][a-z]*)/g)
                                  return {
                                      char: j,
                                      fourCode: fourCode,
                                      roots: roots,
                                      oldStyle2Code: roots.length === 1
                                          ? roots[0].padEnd(2, 'a')
                                          : roots[0][0] + roots[1][0],
                                      newStyle3Code: roots.length === 1
                                            ? roots[0].padEnd(3, 'a')
                                          : roots.length === 2
                                            ? (roots[0].slice(0,2) + roots[1]).slice(0,3).padEnd(3, 'a')
                                            : roots[0][0] + roots[roots.length - 2][0] + roots[roots.length - 1][0],
                                          // : roots[0][0] + roots[1][0] + roots[roots.length - 1][0],
                                      newStyle2Code: roots.length === 1
                                          ? roots[0].slice(0,2).padEnd(2, 'a')
                                          : roots[0][0] + roots[roots.length - 1][0]
                                  }
                              })
                              return [ i, [...i].length === 1
                                       ? {
                                           rank: wordCSVRanked[i],
                                           oldStyle: chars[0].fourCode,
                                           // newStyle: chars[0].fourCode,
                                           newStyle: chars[0].roots.length === 1 && chars[0].roots.length[0] === 1
                                               ? chars[0].fourCode + 'v'
                                               : chars[0].fourCode,
                                           twoCode: chars[0].newStyle2Code,
                                           threeCode: chars[0].newStyle3Code
                                       }
                                       : [...i].length === 2
                                       ? {
                                           rank: wordCSVRanked[i],
                                           oldStyle: chars[0].oldStyle2Code + chars[1].oldStyle2Code,
                                           newStyle: chars[0].char === chars[1].char // reduplication: full code plus v's to hit min of 5
                                               ? chars[0].fourCode.padEnd(5, 'v')
                                            : chars[0].fourCode.length < 3 // 1 + 4, 2 + 4
                                               // ? chars[0].newStyle2Code.padEnd(3, 'v') + chars[1].fourCode.length < 3 ? chars[1].newStyle2Code : chars[1].newStyle3Code
                                               ? chars[0].newStyle2Code.padEnd(2, 'v') + chars[1].fourCode.padEnd(3, 'v')
                                            // : chars[0].roots.length < 3
                                            //    ? chars[0].newStyle2Code + chars[1].newStyle3Code
                                            : chars[1].fourCode.length === 2 // 3? + 2
                                               ? chars[0].newStyle3Code + chars[1].fourCode
                                               // ? chars[0].fourCode + chars[1].fourCode
                                               : chars[0].newStyle3Code + chars[1].newStyle3Code, // 3 + 3
                                            // : chars[0].fourCode.length === 1
                                            //    ? chars[0].fourCode + chars[1].fourCode.padEnd(4, 'v')
                                            // // : chars[0].roots.length < 3
                                            // //    ? chars[0].newStyle2Code + chars[1].newStyle3Code
                                            // : chars[0].fourCode.length === 2
                                            //    ? chars[0].fourCode + chars[1].newStyle3Code
                                            //    : chars[0].newStyle3Code + chars[1].newStyle2Code,
                                           twoCode: chars[0].char === chars[1].char
                                               ? chars[0].newStyle2Code[0] + 'v'
                                               : chars[0].newStyle2Code[0] + chars[1].newStyle2Code[0],
                                           threeCode: ''
                                       }
                                       : [...i].length === 3 // longstyle
                                       ? {
                                           rank: wordCSVRanked[i],
                                           oldStyle: chars[0].oldStyle2Code + chars[1].oldStyle2Code + chars[2].oldStyle2Code[0],
                                           newStyle: chars.map(i => i.newStyle3Code).join(''),
                                           // newStyle: chars[0].newStyle3Code + chars[1].newStyle2Code + chars[2].newStyle2Code,
                                           // newStyle: chars.map(i => i.newStyle2Code).join(''),
                                           twoCode: '',
                                           threeCode: chars[1].char === chars[2].char
                                               ? chars[0].newStyle3Code[0] + chars[0].newStyle3Code[1] + 'v'
                                               : chars[0].newStyle3Code[0] + chars[1].newStyle3Code[0]+ chars[2].newStyle3Code[0],
                                       }
                                       : {
                                           rank: wordCSVRanked[i],
                                           oldStyle: chars[0].oldStyle2Code + chars[1].oldStyle2Code + chars[2].oldStyle2Code[0],
                                           newStyle: chars.map(i => i.newStyle2Code).join(''),
                                           // newStyle: chars.slice(0, 4).map(i => i.newStyle2Code).join('') + chars.slice(4, chars.length).map(i => i.newStyle2Code[0]).join(''),
                                           // newStyle: chars.map(i => i.newStyle2Code).join(''),
                                           // newStyle: chars[0].newStyle2Code + chars[1].newStyle2Code + chars[2].newStyle2Code + chars.slice(3, chars.length).map(i => i.roots[i.roots.length - 1][0]).join(''),
                                           twoCode: '',
                                           threeCode: ''
                                       }
                                     ]
})
const wordTestSortedOld = Object.groupBy(wordTests, i => i[1].oldStyle.toLowerCase())
const wordTestSortedNew = Object.groupBy(wordTests, i => i[1].newStyle.toLowerCase())
console.log(`words you would make an error on if typed without looking in old system: ${wordTests.length - Object.keys(wordTestSortedOld).length} out of ${wordTests.length} or ${(100 - (Object.keys(wordTestSortedOld).length / wordTests.length) * 100).toFixed(2)}`)
console.log(`words you would make an error on if typed without looking in new system: ${wordTests.length - Object.keys(wordTestSortedNew).length} out of ${wordTests.length} or ${(100 - (Object.keys(wordTestSortedNew).length / wordTests.length) * 100).toFixed(2)}`)
console.log(`errors saved: ${(wordTests.length - Object.keys(wordTestSortedOld).length) - (wordTests.length - Object.keys(wordTestSortedNew).length)}`)
// console.dir(Object.entries(wordTestSortedNew).filter(i => [...i[0]].length > 4 && i[1].length > 1).map(i => [i[0], i[1].sort((k,l) => (l[1].rank||0) - (k[1].rank||0) )]).sort((a, b) => (b[1][1][1].rank||0) - (a[1][1][1].rank||0))
//                   .flat(), { depth: 4, 'maxArrayLength': 1000 })

const manyKeyShortcuts = Object.entries(wordTestSortedNew)
                               .filter(i => [...i[0]].length >= 5)
                               .map(i => [
                                   i[0],
                                   i[1].sort((j, k) => (k[1].rank||0) - (j[1].rank||0))
                                       .map(j => j[0])
                               ])
                               .flatMap(i => i[1].map(j => [i[0], j]))

const oneKeyShortcutsTrad = { a: "一", b: "都", c: "長", d: "把", e: "著", f: "要", g: "在", h: "到", j: "中", i: "上", k: "是", l: "用", m: "我", n: "的", o: "會", p: "所", q: "月", r: "亇", s: "就", t: "次", u: "為", v: "沒", w: "這", x: "又", y: "了", z: "將" }
const oneKeyShortcutsSimp = { a: "一", b: "都", c: "长", d: "把", e: "其", f: "要", g: "在", h: "到", j: "中", i: "上", k: "是", l: "用", m: "我", n: "的", o: "个", p: "所", q: "月", r: "比", s: "就", t: "次", u: "为", v: "没", w: "這", x: "对", y: "了", z: "將" }
const oneKeyShortcuts = target === 'simp' ? oneKeyShortcutsSimp : oneKeyShortcutsTrad

const twoKeyShortcuts = Object.fromEntries(
    Object.entries(
        Object.groupBy(wordTests.filter(
            i => i[1].twoCode !== ''
                && -1 === Object.keys(manualRoots).indexOf(i[0])
                && -1 === Object.values(manualRoots).map(i => i.toLowerCase()).indexOf(i[1].twoCode.toLowerCase())
        ), i => i[1].twoCode.toLowerCase())
    )
          .map(i => [ i[0]
                      , i[1].sort((j, k) => (wordCSVRanked[k[0]]||0) - (wordCSVRanked[j[0]]||0))[0][0]
                    ])
)

const longcuts = Object.fromEntries(Object.entries(
    Object.groupBy(
        Object.entries(
            Object.groupBy(
                Object.entries(correctCodes)
                      .map(i => [
                          i[0],
                          i[1].correctCodes[0].split('.')[1]
                      ])
                      .filter(i =>
                              -1 === Object.keys(manualRoots).indexOf(i[0])
                              && twoKeyShortcuts[i[1].toLowerCase()] !== i[0]
                      )
                      .map(i => [
                          i[0],
                          i[1].padEnd(3, 'v')
                      ])
                      .sort((j, k) => (wordCSVRanked[k[0]] || 0) - (wordCSVRanked[j[0]] || 0))
                , i => i[1].toLowerCase()
            )
        ).map(i => [i[0], i[1].map(j => j[0])])//.sort((j, k) => (wordCSVRanked[k[1][1]] || 0) - (wordCSVRanked[j[1][1]] || 0))
        , i => i[0].length)
).map(i => [i[0], Object.fromEntries(i[1])]))

const combinatoryShorts = Object.fromEntries(
    Object.entries(
        Object.groupBy(wordTests.filter(
            i => i[1].threeCode !== '' && [...i[0]].length === 1
        ) , i => i[1].threeCode.toLowerCase())
    ).flatMap( i => i[1].map(j => [ j[0], i[0] ]))
)
const threeKeyShortcuts = Object.fromEntries(
    Object.entries(
        Object.groupBy(wordTests.filter(
            i => i[1].threeCode !== ''
                && -1 === Object.values(twoKeyShortcuts).indexOf(i[0])
                && -1 === Object.values(oneKeyShortcuts).indexOf(i[0])
                && -1 === Object.keys(manualRoots).indexOf(i[0])
                && -1 === Object.values(manualRoots).map(i => i.toLowerCase()).indexOf(i[1].threeCode.toLowerCase())
        ) , i => i[1].threeCode.toLowerCase())
    )
          .map(i => [
              i[0],
              i[1] in longcuts['3']
                  ? longcuts['3'][i[0]]
                  : i[1].sort((j, k) => (wordCSVRanked[k[0]]||0) - (wordCSVRanked[j[0]]||0))[0][0]
          ])
)
// console.dir(twoKeyShortcuts, { depth: 4, 'maxArrayLength': 1000 })
// console.dir(threeKeyShortcuts, { depth: 4, 'maxArrayLength': 1000 })

const threePlusVCodes = Object.fromEntries(Object.entries(longcuts['3']).map(i => [i[0] + 'v', i[1]]))
const fourKeyShortcuts = [...new Set(Object.keys(threePlusVCodes).concat(Object.keys(longcuts['4'])))]
      .map(i => {
          // if (i in threePlusVCodes && threePlusVCodes[i].length === 1) return [i, (longcuts['4'][i]||[]) ]
          const allChars = (threePlusVCodes[i] || []).concat(longcuts['4'][i] || [])
          const firstShift = -1 !== Object.values(twoKeyShortcuts).indexOf(allChars[0])
                ? allChars.slice(1, allChars.length).concat(allChars.slice(0, 1))
                : allChars
          const secondShift = -1 !== Object.values(threeKeyShortcuts).indexOf(firstShift[0]) && firstShift.length > 1
                ? firstShift.slice(1, firstShift.length)
                : firstShift
          return [ i, secondShift ]
      }
          ).filter(i => i[1].length > 0).sort((j, k) => (wordCSVRanked[k[1][0]] || 0) - (wordCSVRanked[j[1][0]] || 0))
          // ).filter(i => i[1].length > 0).sort((j, k) => k[0].localeCompare(j[0]))
// console.dir(fourKeyShortcuts, { depth: 4, 'maxArrayLength': 10000 })
let allCodes = [].concat(
    Object.entries(oneKeyShortcuts),
    Object.entries(manualRoots).map(i => [i[1].toLowerCase(), i[0]]).filter(i => !(i[0].toLowerCase() in oneKeyShortcuts)),
    Object.entries(twoKeyShortcuts),
    Object.entries(threeKeyShortcuts),
    fourKeyShortcuts.flatMap(i => i[1].map(j => [i[0], j])),
    manyKeyShortcuts
).map(i => i.concat([
    wordCSVRanked[i[1]] || 0,
    combinatoryShorts[i[1]] || ''
]).join('	')).join('\n')
console.dir(allCodes, { depth: 4, 'maxArrayLength': 10000 })
const writePath = target === 'simp' ? './characterCodes.simp.tsv' : './characterCodes.simp.tsv'
fs.writeFile(writePath, allCodes, err => console.error(err))
