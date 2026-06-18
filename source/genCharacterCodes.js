const target = process.argv[2] || 'trad'
const fs = require('node:fs');
yitiPath = target === 'jp' ? './yiti.jp.tsv' : 'simp' ? './yiti.simp.tsv' : './yiti.tsv'
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
const freqListPath = target === 'jp' ? 'jmdict.csv' : 'simp' ? './BCC-global.simp.csv' : './BCC-global.csv'
const wordCSVRanked = Object.fromEntries(
    Object.values(
        Object.groupBy(
            fs.readFileSync(freqListPath)
              .toString()
              .trim()
              .split('\n')
              .map(i => i.split(','))
              .flatMap(i => {
                  let vulgarized = vulgarize(i[0])
                  return [ [vulgarized[0], parseInt(i[1])], [vulgarized[1], parseInt(i[1]) - 1] ]
              })
            , i => i[0]
        )
    ).flatMap(i => i.sort((i, j) => i[1] - j[1]))
)
// const manualRoots = Object.fromEntries(fs.readFileSync('./manualRoots.tsv')
//                                           .toString()
//                                           .trim()
//                                           .split('\n')
//                                           .map(a => a.split('	')
//                                                      .slice(0,2)))
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
                                          .concat(fs.readFileSync('./fullCharManualCodes.tsv')
                                                    .toString()
                                                    .trim()
                                                    .split('\n')
                                                    .map(a => a.split('	')
                                                               .slice(0,2)
                                                        )
                                                    .map(a => [a[0], {
                                                        correctCodes: [ a[1] ]
                                                    }])
                                                 )
)
const dictPath = target === 'jp' ? 'jmdict.tsv' : 'simp' ? './dict.simp.tsv' : './dict.tsv'
// const wordCSV = fs.readFileSync(dictPath) //tmp for jp
//                                 .toString()
//                                 .trim()
//                                 .split('\n')
//                                 .map(i => i.split('	')[0])
//                                 .flatMap(i => vulgarize(i))
                             
const wordCSV = Object.keys(correctCodes) // non jp
                      .concat(fs.readFileSync(dictPath)
                                .toString()
                                .trim()
                                .split('\n')
                                .map(i => i.split('	')[0])
                                .flatMap(i => vulgarize(i))
                             )

const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const wordList = wordCSV//.filter(i => i.length <= 3)
const wordTests = wordList.filter(i => [...i].every(j => j in correctCodes))
                          .map(i => {
                              const chars = [...i].map(j => {
                                  const fullCode = correctCodes[j].correctCodes[0].split('.')[0]
                                  const fourCode = correctCodes[j].correctCodes[0].split('.')[1]
                                  const roots = fullCode.split('.')[0].match(/([A-Z][a-z]*)/g)
                                  const stem = roots.length > 2
                                        ? roots[0][0] + roots[roots.length - 2][0] + roots[roots.length - 1].padEnd(2, 'v').slice(0, 2)
                                        : roots.length === 2
                                        ? (roots[0].slice(0, 2) + roots[1].padEnd(2, 'v')).slice(0,4)
                                        : roots[0].padEnd(3, 'a')
                                  return {
                                      char: j,
                                      fourCode: fourCode,
                                      roots: roots,
                                      oldStyle2Code: roots.length === 1
                                          ? roots[0].padEnd(2, 'a')
                                          : roots[0][0] + roots[1][0],
                                      newStyle3Code: stem.slice(0, 3), // AaAbAc
                                      shortCode: fourCode.length < 4 ? fourCode.padEnd(2,'a') : stem.slice(0, 3),
                                      stem: stem,
                                      newStyle2Code: stem[0] + stem[stem.length - 2] //AaAy
                                  }
                              })
                              const kanaDict = {"ぁ": "xa", "あ": "Xa", "ぃ": "xi", "い": "Xi", "ぅ": "xu", "う": "Xu", "ぇ": "xe", "え": "Xe", "ぉ": "xo", "お": "Xo", "か": "Ka", "が": "Ga", "き": "Ki", "ぎ": "Gi", "く": "Ku", "ぐ": "Gu", "け": "Ke", "げ": "Ge", "こ": "Ko", "ご": "Go", "さ": "Sa", "ざ": "Za", "し": "Si", "じ": "Zi", "す": "Su", "ず": "Zu", "せ": "Se", "ぜ": "Ze", "そ": "So", "ぞ": "Zo", "た": "Ta", "だ": "Da", "ち": "Ti", "ぢ": "Di", "っ": "tu", "つ": "Tu", "づ": "Du", "て": "Te", "で": "De", "と": "To", "ど": "Do", "な": "Na", "に": "Ni", "ぬ": "Nu", "ね": "Ne", "の": "No", "は": "Ha", "ば": "Ba", "ぱ": "Pa", "ひ": "Hi", "び": "Bi", "ぴ": "Pi", "ふ": "Hu", "ぶ": "Bu", "ぷ": "Pu", "へ": "He", "べ": "Be", "ぺ": "Pe", "ほ": "Ho", "ぼ": "Bo", "ぽ": "Po", "ま": "Ma", "み": "Mi", "む": "Mu", "め": "Me", "も": "Mo", "ゃ": "ya", "や": "Ya", "ゅ": "yu", "ゆ": "Yu", "ょ": "yo", "よ": "Yo", "ら": "Ra", "り": "Ri", "る": "Ru", "れ": "Re", "ろ": "Ro", "ゎ": "wa", "わ": "Wa", "𛅐": "wi", "ゐ": "Wi", "𛅑": "we", "ゑ": "We", "𛅒": "wo", "を": "Wo", "ん": "V", "𛅧": "nn", "ゔ": "Vu", "ァ": "xa", "ア": "Xa", "ィ": "xi", "イ": "Xi", "ゥ": "xu", "ウ": "Xu", "ェ": "xe", "エ": "Xe", "ォ": "xo", "オ": "Xo", "カ": "Ka", "ヵ": "ka", "ガ": "Ga", "キ": "Ki", "ギ": "Gi", "ク": "Ku", "ㇰ": "ku", "グ": "Gu", "ケ": "Ke", "ヶ": "ke", "ゲ": "Ge", "コ": "Ko", "ゴ": "Go", "サ": "Sa", "ザ": "Za", "シ": "Si", "ㇱ": "si", "ジ": "Zi", "ス": "Su", "ㇲ": "su", "ズ": "Zu", "セ": "Se", "ゼ": "Ze", "ソ": "So", "ゾ": "Zo", "タ": "Ta", "ダ": "Da", "チ": "Ti", "ヂ": "Di", "ッ": "tu", "ツ": "Tu", "ヅ": "Du", "テ": "Te", "デ": "De", "ト": "To", "ㇳ": "to", "ド": "Do", "ナ": "Na", "ニ": "Ni", "ヌ": "Nu", "ㇴ": "nu", "ネ": "Ne", "ノ": "No", "ハ": "Ha", "ㇵ": "ha", "バ": "Ba", "パ": "Pa", "ヒ": "Hi", "ㇶ": "hi", "ビ": "Bi", "ピ": "Pi", "フ": "Hu", "ㇷ": "hu", "ブ": "Bu", "プ": "Pu", "ヘ": "He", "ㇸ": "he", "ベ": "Be", "ペ": "Pe", "ホ": "Ho", "ㇹ": "ho", "ボ": "Bo", "ポ": "Po", "マ": "Ma", "ミ": "Mi", "ム": "Mu", "ㇺ": "mu", "メ": "Me", "モ": "Mo", "ャ": "ya", "ヤ": "Ya", "ュ": "yu", "ユ": "Yu", "ョ": "yo", "ヨ": "Yo", "ラ": "Ra", "ㇻ": "ra", "リ": "Ri", "ㇼ": "ri", "ル": "Ru", "ㇽ": "ru", "レ": "Re", "ㇾ": "re", "ロ": "Ro", "ㇿ": "ro", "ワ": "Wa", "ヮ": "wa", "ヰ": "Wi", "𛅤": "wi", "ヱ": "We", "𛅥": "we", "𛅦": "wo", "ヲ": "Wo", "ン": "V", "ヴ": "Vu", "ヷ": "Va", "ヸ": "Vi", "ヹ": "Ve", "ヺ": "Vo", "ー": "L", "𛀀": "Xe", "𛀀": "Ye", "𛀂": "Xa", "𛀅": "Xa", "𛀃": "Xa", "𛀄": "Xa", "𛀆": "Xi", "𛀇": "Xi", "𛀈": "Xi", "𛀉": "Xi", "𛀊": "Xu", "𛀋": "Xu", "𛀌": "Xu", "𛀍": "Xu", "𛀎": "Xu", "𛀁": "Ye", "𛀏": "Xe", "𛀐": "Xe", "𛀑": "Xe", "𛀒": "Xe", "𛀓": "Xe", "𛀔": "Xo", "𛀕": "Xo", "𛀖": "Xo", "𛀗": "Ka", "𛀘": "Ka", "𛀙": "Ka", "𛀚": "Ka", "𛀛": "Ka", "𛀢": "Ka", "𛀜": "Ka", "𛀝": "Ka", "𛀞": "Ka", "𛀟": "Ka", "𛀠": "Ka", "𛀡": "Ka", "𛀣": "Ki", "𛀤": "Ki", "𛀥": "Ki", "𛀦": "Ki", "𛀻": "Ki", "𛀧": "Ki", "𛀨": "Ki", "𛀩": "Ki", "𛀪": "Ki", "𛀫": "Ku", "𛀬": "Ku", "𛀭": "Ku", "𛀮": "Ku", "𛀯": "Ku", "𛀰": "Ku", "𛀱": "Ku", "𛀳": "Ke", "𛀲": "Ke", "𛀢": "Ke", "𛀴": "Ke", "𛀵": "Ke", "𛀶": "Ke", "𛀷": "Ke", "𛀸": "Ko", "𛂘": "Ko", "𛀹": "Ko", "𛀻": "Ko", "𛀺": "Ko", "𛀼": "Sa", "𛀽": "Sa", "𛀾": "Sa", "𛀿": "Sa", "𛁀": "Sa", "𛁁": "Sa", "𛁂": "Sa", "𛁃": "Sa", "𛁄": "Si", "𛁅": "Si", "𛁆": "Si", "𛁇": "Si", "𛁈": "Si", "𛁉": "Si", "𛁊": "Su", "𛁋": "Su", "𛁌": "Su", "𛁍": "Su", "𛁎": "Su", "𛁏": "Su", "𛁐": "Su", "𛁑": "Su", "𛁒": "Se", "𛁓": "Se", "𛁔": "Se", "𛁕": "Se", "𛁖": "Se", "𛁗": "So", "𛁘": "So", "𛁙": "So", "𛁚": "So", "𛁛": "So", "𛁜": "So", "𛁝": "So", "𛁞": "Ta", "𛁟": "Ta", "𛁠": "Ta", "𛁡": "Ta", "𛁢": "Ti", "𛁣": "Ti", "𛁤": "Ti", "𛁥": "Ti", "𛁦": "Ti", "𛁧": "Ti", "𛁨": "Ti", "𛁩": "Tu", "𛁪": "Tu", "𛁫": "Tu", "𛁬": "Tu", "𛁭": "Tu", "𛁮": "Te", "𛁯": "Te", "𛁰": "Te", "𛁱": "Te", "𛁲": "Te", "𛁳": "Te", "𛁴": "Te", "𛁵": "Te", "𛁶": "Te", "𛂎": "Te", "𛁷": "To", "𛁸": "To", "𛁹": "To", "𛁺": "To", "𛁻": "To", "𛁼": "To", "𛁽": "To", "𛁭": "To", "𛁾": "Na", "𛁿": "Na", "𛂀": "Na", "𛂁": "Na", "𛂂": "Na", "𛂃": "Na", "𛂄": "Na", "𛂅": "Na", "𛂆": "Na", "𛂇": "Ni", "𛂈": "Ni", "𛂉": "Ni", "𛂊": "Ni", "𛂋": "Ni", "𛂌": "Ni", "𛂍": "Ni", "𛂎": "Ni", "𛂏": "Nu", "𛂐": "Nu", "𛂑": "Nu", "𛂒": "Ne", "𛂓": "Ne", "𛂔": "Ne", "𛂕": "Ne", "𛂖": "Ne", "𛂗": "Ne", "𛂘": "Ne", "𛂙": "No", "𛂚": "No", "𛂛": "No", "𛂜": "No", "𛂝": "No", "𛂞": "Ha", "𛂟": "Ha", "𛂠": "Ha", "𛂡": "Ha", "𛂢": "Ha", "𛂣": "Ha", "𛂤": "Ha", "𛂥": "Ha", "𛂦": "Ha", "𛂧": "Ha", "𛂨": "Ha", "𛂩": "Hi", "𛂪": "Hi", "𛂫": "Hi", "𛂬": "Hi", "𛂭": "Hi", "𛂮": "Hi", "𛂯": "Hi", "𛂰": "Hu", "𛂱": "Hu", "𛂲": "Hu", "𛂳": "He", "𛂴": "He", "𛂵": "He", "𛂶": "He", "𛂷": "He", "𛂸": "He", "𛂹": "He", "𛂺": "Ho", "𛂻": "Ho", "𛂼": "Ho", "𛂽": "Ho", "𛂾": "Ho", "𛂿": "Ho", "𛃀": "Ho", "𛃁": "Ho", "𛃂": "Ma", "𛃃": "Ma", "𛃄": "Ma", "𛃅": "Ma", "𛃆": "Ma", "𛃇": "Ma", "𛃈": "Ma", "𛃖": "Ma", "𛃉": "Mi", "𛃊": "Mi", "𛃋": "Mi", "𛃌": "Mi", "𛃍": "Mi", "𛃎": "Mi", "𛃏": "Mi", "𛃐": "Mu", "𛃑": "Mu", "𛃒": "Mu", "𛃓": "Mu", "𛄝": "Mu", "𛄞": "Mu", "𛃔": "Me", "𛃕": "Me", "𛃖": "Me", "𛃗": "Mo", "𛃘": "Mo", "𛃙": "Mo", "𛃚": "Mo", "𛃛": "Mo", "𛃜": "Mo", "𛄝": "Mo", "𛄞": "Mo", "𛃝": "Ya", "𛃞": "Ya", "𛃟": "Ya", "𛃠": "Ya", "𛃡": "Ya", "𛃢": "Ya", "𛀆": "Yi", "𛃣": "Yu", "𛃤": "Yu", "𛃥": "Yu", "𛃦": "Yu", "𛀁": "Ye", "𛃧": "Yo", "𛃨": "Yo", "𛃩": "Yo", "𛃪": "Yo", "𛃫": "Yo", "𛃬": "Yo", "𛃢": "Yo", "𛃭": "Ra", "𛃮": "Ra", "𛃯": "Ra", "𛃰": "Ra", "𛁽": "Ra", "𛃱": "Ri", "𛃲": "Ri", "𛃳": "Ri", "𛃴": "Ri", "𛃵": "Ri", "𛃶": "Ri", "𛃷": "Ri", "𛃸": "Ru", "𛃹": "Ru", "𛃺": "Ru", "𛃻": "Ru", "𛃼": "Ru", "𛃽": "Ru", "𛃾": "Re", "𛃿": "Re", "𛄀": "Re", "𛄁": "Re", "𛄂": "Ro", "𛄃": "Ro", "𛄄": "Ro", "𛄅": "Ro", "𛄆": "Ro", "𛄇": "Ro", "𛄈": "Wa", "𛄉": "Wa", "𛄊": "Wa", "𛄋": "Wa", "𛄌": "Wa", "𛄍": "Wi", "𛄎": "Wi", "𛄏": "Wi", "𛄐": "Wi", "𛄑": "Wi", "𛄒": "We", "𛄓": "We", "𛄔": "We", "𛄕": "We", "𛄖": "Wo", "𛄗": "Wo", "𛄘": "Wo", "𛄙": "Wo", "𛄚": "Wo", "𛄛": "Wo", "𛄜": "Wo", "𛀅": "Wo", "𛄝": "V", "𛄞": "V"};
                              const kanaRegex = [ [ /([A-Z][a-z]+)/g, '<$1>' ],
                                                  [ /<(Xux|W)([aiueo])>/g, '<Xw$2>' ],
                                                  [ /<(Xix|Y)([aiueo])>/g, '<Xy$2>' ],
                                                  [ /<([SZTD])i>/g, '<$1yi>' ],
                                                  [ /<([TDH])u>/g, '<$1wu>' ],
                                                  [ /<Vuy([aiueo])>/g, '<Pw$2>' ],
                                                  [ /<Vu?([aiueo])>/g, '<Bw$2>' ],
                                                  [ /<([XKGSZTDNHBPMR])e[yx]?([ui])>/g, '<$1$2>' ],
                                                  [ /<([SZ])uxi>/g, '<$1i>/' ],
                                                  [ /<([XKGTDNHBPMR])u[wx]([aiueo])>/g, '<$1w$2>' ],
                                                  [ /<([XKGSZTDNHBPMR])i[yx]([aiueo])>/g, '<$1y$2>' ],
                                                  [ /<([XKGSZTDNHBPMR])ya>/g, '<$1b>' ],
                                                  [ /<([XKGSZTDNHBPMR])wa>/g, '<$1c>' ],
                                                  [ /<([XKGSZTDNHBPMR])yi>/g, '<$1j>' ],
                                                  [ /<([XKGSZTDNHBPMR])wi>/g, '<$1k>' ],
                                                  [ /<([XKGSZTDNHBPMR])yu>/g, '<$1v>' ],
                                                  [ /<([XKGSZTDNHBPMR])wu>/g, '<$1w>' ],
                                                  [ /<([XKGSZTDNHBPMR])ye>/g, '<$1f>' ],
                                                  [ /<([XKGSZTDNHBPMR])we>/g, '<$1g>' ],
                                                  [ /<([XKGSZTDNHBPMR])yo>/g, '<$1p>' ],
                                                  [ /<([XKGSZTDNHBPMR])wo>/g, '<$1q>' ],
                                                  [ /<([A-Z][a-z]+)>/g, '$1' ]
                                                ]
                              function kanaConvert(sequence) {
                                  return kanaRegex.reduce((acc, cur, i) => acc.replaceAll(cur[0], cur[1]), [...i].map(char => char in kanaDict ? kanaDict[char] : char).join(''))
                                  
                              }
                              const kanaConverted = kanaRegex.reduce((acc, cur, i) => acc.replaceAll(cur[0], cur[1]), [...i].map(char => char in kanaDict ? kanaDict[char] : char).join(''))
                              // const kanaSplit = Object.groupBy([...i], char => char in kanaDict);
                              // if('true' in kanaSplit && 'false' in kanaSplit && kanaSplit.true.filter(i => kanaDict[i] === kanaDict[i].toLowerCase()).length > 0) console.log(kanaConverted)
                              const charsByChar = Object.groupBy(chars, char => char.char)
                              // console.log(charsByChar)
                              return [ i, [...i].length === 1
                                       ? {
                                           rank: wordCSVRanked[i],
                                           oldStyle: chars[0].fourCode,
                                           // newStyle: chars[0].fourCode,
                                           newStyle: chars[0].roots.length === 1 && chars[0].roots.length[0] === 1
                                               ? chars[0].fourCode + 'v'
                                               : chars[0].fourCode,
                                           twoCode: chars[0].newStyle2Code,
                                           threeCode: chars[0].newStyle3Code,
                                           stem: chars[0].stem,
                                       }
                                       : target === 'jp'
                                       ? {
                                           rank: wordCSVRanked[i],
                                           oldStyle: '',
                                           newStyle: [...kanaConvert(i)].map(char => char in charsByChar ? charsByChar[char][0].shortCode : char).join(''),
                                           twoCode: '',
                                           threeCode: '',
                                           stem: ''
                                       }
                                       : [...i].length < 4
                                       ? {
                                           rank: wordCSVRanked[i],
                                           oldStyle: chars[0].oldStyle2Code + chars[1].oldStyle2Code,
                                           newStyle: chars.map(char => latin.indexOf(char.char) > -1 ? char.stem[0] : char.shortCode).join('').padEnd(5, 'v'),
                                           twoCode:   [...i].length === 2 ? chars.map(char => char.stem[0]).join('') : '',
                                           threeCode: [...i].length === 3 ? chars.map(char => char.stem[0]).join('') : '' ,
                                           stem: ''
                                       }
                                       : [...i].length >= 4
                                       ? {
                                           rank: wordCSVRanked[i],
                                           oldStyle: chars[0].oldStyle2Code + chars[1].oldStyle2Code,
                                           newStyle: chars.map(char => latin.indexOf(char.char) > -1 ? char.stem[0] : char.newStyle2Code).join(''),
                                           twoCode: '',
                                           threeCode: '',
                                           stem: ''
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
                                           threeCode: '',
                                           stem: ''
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
                                           stem: ''
                                       }
                                       : {
                                           rank: wordCSVRanked[i],
                                           oldStyle: chars[0].oldStyle2Code + chars[1].oldStyle2Code + chars[2].oldStyle2Code[0],
                                           newStyle: chars.map(i => i.newStyle2Code).join(''),
                                           // newStyle: chars.slice(0, 4).map(i => i.newStyle2Code).join('') + chars.slice(4, chars.length).map(i => i.newStyle2Code[0]).join(''),
                                           // newStyle: chars.map(i => i.newStyle2Code).join(''),
                                           // newStyle: chars[0].newStyle2Code + chars[1].newStyle2Code + chars[2].newStyle2Code + chars.slice(3, chars.length).map(i => i.roots[i.roots.length - 1][0]).join(''),
                                           twoCode: '',
                                           threeCode: '',
                                           stem: ''
                                       }
                                     ]
})
// const fullWordShorts = wordTests.filter(i => [...i[0]].length < 1)
// console.dir(fullWordShorts, {depth: 100})
const wordTestSortedOld = Object.groupBy(wordTests, i => i[1].oldStyle.toLowerCase())
const wordTestSortedNew = Object.groupBy(wordTests, i => i[1].newStyle.toLowerCase())
// const stems = Object.groupBy(wordTests, i => i[1].stem.toLowerCase())
// console.dir(Object.entries(stems),{ depth: 4, 'maxArrayLength': 1000 })
console.log(`words you would make an error on if typed without looking in old system: ${wordTests.length - Object.keys(wordTestSortedOld).length} out of ${wordTests.length} or ${(100 - (Object.keys(wordTestSortedOld).length / wordTests.length) * 100).toFixed(2)}`)
console.log(`words you would make an error on if typed without looking in new system: ${wordTests.length - Object.keys(wordTestSortedNew).length} out of ${wordTests.length} or ${(100 - (Object.keys(wordTestSortedNew).length / wordTests.length) * 100).toFixed(2)}`)
console.log(`errors saved: ${(wordTests.length - Object.keys(wordTestSortedOld).length) - (wordTests.length - Object.keys(wordTestSortedNew).length)}`)
console.dir(Object.entries(wordTestSortedNew).filter(i => [...i[0]].length > 4 && i[1].length > 1).map(i => [i[0], i[1].sort((k,l) => (l[1].rank||0) - (k[1].rank||0) )]).sort((a, b) => (b[1][1][1].rank||0) - (a[1][1][1].rank||0))
                  .flat(), { depth: 4, 'maxArrayLength': 1000 })

const manyKeyShortcuts = Object.entries(wordTestSortedNew)
                               .filter(i => [...i[0]].length >= 5)
                               .map(i => [
                                   i[0],
                                   i[1].sort((j, k) => (k[1].rank||0) - (j[1].rank||0))
                                       .map(j => j[0])
                               ])
                               .flatMap(i => i[1].map(j => [i[0], j]))
// console.dir(manyKeyShortcuts, {depth: 100})
// console.dir(Object.fromEntries(Object.entries(Object.groupBy(manyKeyShortcuts.filter(i => true || [...i[1]].length === 3), i => i[0])).filter(i => i[0].length === 8).map(i => [i[0], i[1].map(j=>j[1])]).sort((j, k) => (wordCSVRanked[k[1][1]]||0) - (wordCSVRanked[j[1][1]]||0))), {depth: 100})

const oneKeyShortcutsTrad = { a: "一", b: "都", c: "長", d: "把", e: "著", f: "要", g: "在", h: "到", j: "中", i: "上", k: "是", l: "用", m: "我", n: "的", o: "會", p: "所", q: "月", r: "亇", s: "就", t: "次", u: "為", v: "沒", w: "這", x: "又", y: "了", z: "將" }
const oneKeyShortcutsSimp = { a: "一", b: "都", c: "长", d: "把", e: "其", f: "要", g: "在", h: "到", j: "中", i: "上", k: "是", l: "用", m: "我", n: "的", o: "个", p: "所", q: "月", r: "比", s: "就", t: "次", u: "为", v: "没", w: "這", x: "对", y: "了", z: "將" }
const oneKeyShortcuts = target === 'simp' ? oneKeyShortcutsSimp : oneKeyShortcutsTrad

// const twoKeyShortcuts = Object.fromEntries(
//     Object.entries(
//         Object.groupBy(wordTests.filter(
//             i => i[1].twoCode !== ''
//                 && -1 === Object.keys(manualRoots).indexOf(i[0])
//                 && -1 === Object.values(manualRoots).map(i => i.toLowerCase()).indexOf(i[1].twoCode.toLowerCase())
//         ), i => i[1].twoCode.toLowerCase())
//     )
//           .map(i => [ i[0]
//                       , i[1].sort((j, k) => (wordCSVRanked[k[0]]||0) - (wordCSVRanked[j[0]]||0))[0][0]
//                     ])
// )
const allTwoKeyShortcuts = Object.fromEntries(
    Object.entries(
        Object.groupBy(wordTests.filter(
            i => i[1].twoCode !== ''
                && -1 === Object.keys(oneKeyShortcuts).indexOf(i[0])
                // && -1 === Object.keys(manualRoots).indexOf(i[0])
                // && -1 === Object.values(manualRoots).map(i => i.toLowerCase()).indexOf(i[1].twoCode.toLowerCase())
        ), i => i[1].twoCode.toLowerCase())
    )
          .map(i => [ i[0]
                      , i[1].sort((j, k) => (wordCSVRanked[k[0]]||0) - (wordCSVRanked[j[0]]||0)).map(j => j[0])
                    ])
)
const twoKeyShortcuts = Object.fromEntries(Object.entries(allTwoKeyShortcuts).map(i => [i[0], i[1][0]]))
// console.dir(allTwoKeyShortcuts, { depth: 4, 'maxArrayLength': 1000 })

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
                              twoKeyShortcuts[i[1].toLowerCase()] !== i[0]
                              // -1 === Object.keys(manualRoots).indexOf(i[0])
                              // && twoKeyShortcuts[i[1].toLowerCase()] !== i[0]
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
// console.dir(longcuts, { depth: 4, 'maxArrayLength': 1000 })

const combinatoryShorts = Object.fromEntries(
    Object.entries(
        Object.groupBy(wordTests.filter(
            i => i[1].stem !== '' && [...i[0]].length === 1
        ) , i => i[1].stem.toLowerCase())
    ).flatMap( i => i[1].map(j => [ j[0], i[0] ]))
)
// console.log(combinatoryShorts)
const threeKeyShortcuts = Object.fromEntries(
    Object.entries(
        Object.groupBy(wordTests.filter(
            i => i[1].threeCode !== ''
                && -1 === Object.values(twoKeyShortcuts).indexOf(i[0])
                && -1 === Object.values(oneKeyShortcuts).indexOf(i[0])
                // && -1 === Object.keys(manualRoots).indexOf(i[0])
                // && -1 === Object.values(manualRoots).map(i => i.toLowerCase()).indexOf(i[1].threeCode.toLowerCase())
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

const twoKeyPlusVCodes = Object.fromEntries(Object.entries(allTwoKeyShortcuts)
                                                  .filter(i => -1 === Object.keys(threeKeyShortcuts).indexOf(i[0])
                                                          && -1 === Object.keys(longcuts['3']).indexOf(i[0] + 'v'))
                                                  .map(i => [
                                                      i[0] + 'v',
                                                      i[1].filter(j => [...j].length === 2 && -1 === Object.values(twoKeyShortcuts).indexOf(j))[0]
                                                  ] )
                                                  // .filter(i => i[1].length > 0) // breaking jp mode
                                                  .filter(i => i[1] && i[1].length > 0)
                                                  .sort((j, k) => (wordCSVRanked[k[1]] || 0) - (wordCSVRanked[j[1]] || 0))
                                           )
console.log(twoKeyPlusVCodes)

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
    // Object.entries(manualRoots).map(i => [i[1].toLowerCase(), i[0]]).filter(i => !(i[0].toLowerCase() in oneKeyShortcuts)),
    Object.entries(twoKeyShortcuts),
    Object.entries(twoKeyPlusVCodes),
    Object.entries(threeKeyShortcuts),
    fourKeyShortcuts.flatMap(i => i[1].map(j => [i[0], j])),
    manyKeyShortcuts
)
                 .sort((j, k) => (wordCSVRanked[k[1]] || 0) - (wordCSVRanked[j[1]] || 0))
                 .map(i => i.concat([
    wordCSVRanked[i[1]] || 0,
    combinatoryShorts[i[1]] || ''
]).join('	')).join('\n')
console.dir(allCodes, { depth: 4, 'maxArrayLength': 10000 })
const writePath = target === 'jp' ? './characterCodes.jp.tsv' : 'simp' ? './characterCodes.simp.tsv' : './characterCodes.tsv'
fs.writeFile(writePath, allCodes, err => console.error(err))
