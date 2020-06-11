const PNGCrop = require('png-crop')
  
const stencils =
  [ { type: 'lost'
    , location: { width: 25, height: 35, left: 300, top: 484 }
    , card: './assets/Characters/EL/478.png'
    }
  , { type: 'round'
    , location: { width: 25, height: 35, left: 323, top: 447 }
    , card: './assets/Characters/EL/486.png'
    }
  , { type: 'persistent'
    , location: { width: 25, height: 35, left: 187, top: 445 }
    , card: './assets/Characters/EL/478.png'
    }
  ]

async function crop (source, output, options) {
  return new Promise((resolve, reject) => {
    PNGCrop.crop(source, output, options, err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

class Stencils {
  static async export () {
    let promises = stencils.map(async icon => {
      await crop(icon.card, `./assets/Icon Stencils/${icon.type}.png`, icon.location)
    })
    
    await Promise.all(promises)
  }
}

Stencils.export()