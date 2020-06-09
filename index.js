const pdfreader = require('pdfreader')
function load (file) {
  return new Promise((resolve, reject) => {
    const items = []
    new pdfreader.PdfReader().parseFileItems(file, function(err, item) {
      if (err) return reject(err)
      if (!item) return resolve(items)
      items.push(item)
    })
  })
}

function shaveArray (callback) {
  const newArray = []
  const remove = []
  
  this.forEach((item, i) => {
    if (!callback(this[i])) return
    newArray.push(this[i])
    remove.push(i)
  })
  
  for (var i = remove.length -1; i >= 0; i--) {
    this.splice(remove[i], 1)
  }

  return newArray
}

function getValue (segments) {
  if (segments.length === 0) return null
  
  return segments.reduce((text, segment) => {
    text += segment.text
    return text
  }, ' ').trim()
}

function getAbilities (segments) {
  const conditions =
    [ 'INVISIBLE'
    , 'PUSH'
    , 'MUDDLE'
    , 'POISON'
    , 'STUN'
    , 'DISARM'
    , 'CURSE'
    , 'IMMOBILIZE'
    , 'STRENGTHEN'
    ]

  const keywords =
    [ 'Move'
    , 'Attack'
    , 'Range'
    , 'Heal'
    , 'Shield'
    , 'Loot'
    , 'Retaliate'
    , 'Target'
    , 'Self'
    , 'Allies'
    , 'Jump'
    , 'Summon'
    , 'Augment'
    , 'XP'
    ]

  // Sort the segments as they appear on the card, not their default order.
  segments.sort((a, b) => a.y - b.y ? a.y - b.y : a.x - b.x)
  
  // Each "line" of a card is given by the y position of the segment, 
  // so we'll group all the segments into a single line.
  let lines = segments.reduce((lines, segment) => {
    if (segment.y == null) return lines
    lines[segment.y] = lines[segment.y] || []
    lines[segment.y].push(segment)
    return lines
  }, {})
  
  let abilities = { conditions: [], keywords: [] }
  Object.keys(lines).forEach(row => {
    let space = ''
    let text = lines[row].reduce((text, line)=>  {
      let label = line.oc === '#2b2e34' ? 'XP ' : ''
      
      text += space + label + line.text.trim().replace(/ {1,}/g, ' ')
      
      space = ' '
      return text
    }, '')
    
    let condition = conditions.find(condition => text.indexOf(condition) > -1)
    if (condition && abilities.conditions.indexOf(condition) === -1) {
      abilities.conditions.push(condition)
    }
    
    let keyword = keywords.find(word => text.indexOf(word) > -1)
    if (keyword) {
      if (abilities.keywords.indexOf(keyword) === -1) abilities.keywords.push(keyword)
      
      let regex = new RegExp(`.*?${keyword} ([0-9]+).*?`, 'i')
      let value = parseInt((text.match(regex)||[])[1]) || null
      if (value) abilities[keyword] = value
    }
  })

  return abilities
}

function findValue (text, term) {
  let regex = new RegExp(`.*?${term} ([0-9]+).*?`, 'i')
  return parseInt((text.match(regex)||[])[1]) || null
}


(async () => {
  const TITLE_YPOS = 0.3320000000000001
  const LEVEL_YPOS = 1.221
  const INIT_YPOS = 8.223
  const MIDPOINT_YPOS = 7.42
  const ID_YPOS = 14.031
  const ATTACK_YPOS = 7.42
  const MOVE_YPOS = 8.437
  
  const characters =
    [ { pdf: './pdfs/MT Cards.pdf'
      , name: 'Mindthief'
      }
    // , { pdf: './pdfs/SC Cards.pdf'
    //   , name: 'Scoundrel'
    //   }
    // , { pdf: './pdfs/CH Cards.pdf'
    //   , name: 'Cragheart'
    //   }
    ]
  
  // Load all the data from the character card pdf files
  const characterData = await Promise.all(characters.map(async character => {
    return await load(character.pdf)
  }))

  // Loop through each character that we've loaded and build a complete deck of cards.
  let cards = characterData.reduce((cards, character, index) => {
    // At this point, we have a bunch of text data for a single character.
    // and that data is spread across a bunch lines and sections.
    // So we'll start to group that data by the individual cards.
    let currentPage = null
    character.forEach(item => {
      // Set the current page and skip it if the page is null.
      // This happens when the pdf contains a header that isn't a card.
      // As every other page is a blank card back, we'll also skip the even pages.
      // When we skip a record, we'll add a new object to prepare for the next card's index calc.
      currentPage = item.page || currentPage
      if (currentPage == null || currentPage % 2 === 0) {
        cards.push({})
        return cards
      }
      
      // Now that we have a current page, we need to calculate the index of the card
      // by taking the current page and subtracting the number of cards. This is necessary
      // Because we are skipping cards and processing multiple characters.
      let id = currentPage - cards.length
      let card = cards[id]
      card.character = characters[index].name
      card.segments = card.segments || []
      card.segments.push(item)
    })

    return cards
  }, [])
  
  // Each character sheet loop creates an extra record at the end,
  // so remove the empty record
  cards.pop()
  
  // Each character's card has it's own data, but we still need to parse that data
  // so we'll loop through each card and parse out the segments where appropriate
  cards.forEach(card => {

    let shave = shaveArray.bind(card.segments)
    shave(segment => segment.height > 0 && segment.width > 0)
    shave(segment => segment.y === ATTACK_YPOS)
    shave(segment => segment.y === MOVE_YPOS)

    let character = card.character
    delete card.character
    
    card.id = getValue(shave(segment => segment.y === ID_YPOS))
    card.title = getValue(shave(segment => segment.y === TITLE_YPOS))
    card.initiative = getValue(shave(segment => segment.y === INIT_YPOS))

    card.character = character
    card.level = getValue(shave(segment => segment.y === LEVEL_YPOS))

    card.top = getAbilities(shave(segment => segment.y < MIDPOINT_YPOS))
    card.bottom = getAbilities(shave(segment => segment.y > MIDPOINT_YPOS))
    
    if (card.segments.length > 0) console.warn('UNUSED', card.segments)
    delete card.segments
  })
  
  // console.log(cards.find(card => card.id === '117'))
  console.log(cards.find(card => card.id === '117'))
})()



