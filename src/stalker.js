const fs = require('fs')
const PNG = require('pngjs').PNG
const PNGCrop = require('png-crop')
const pixelmatch = require('pixelmatch')
const icons = require('./icons')
const characters = require('./characters')

async function loadStencils () {
  return await Promise.all(icons.map(async icon => {
    const iconPng = PNG.sync.read(fs.readFileSync(`./assets/Icon Stencils/${icon.type}.png`))
    const result = JSON.parse(JSON.stringify(icon))
    result.width = iconPng.width
    result.height = iconPng.height
    result.data = iconPng.data
    return result
  }))
}

async function crop (cardBuffer, location) {
  return new Promise((resolve, reject) => {
    PNGCrop.cropToStream(cardBuffer, location, (err, outputStream) => {
      if (err) return reject(err)
      outputStream.pipe(new PNG()).on("parsed", resolve)
    })
  })
}

async function find (cardBuffer, stencil) {
  // let checkpoints = [...Array(6).keys()].splice(1)
  // const locations = stencil.locations.reduce((locations, location) => {
  //   locations.push(location)
  //   checkpoints.forEach(point => {
  //     locations.push({ left: location.left + point, top: location.top })
  //     locations.push({ left: location.left - point, top: location.top })
  //     locations.push({ left: location.left, top: location.top + point })
  //     locations.push({ left: location.left, top: location.top - point })
  //     locations.push({ left: location.left + point, top: location.top + point })
  //     locations.push({ left: location.left - point, top: location.top - point })
  //   })
  //   return locations
  // }, [])
  
  const matches = await Promise.all(stencil.locations.map(async location => {
    let config = 
      { width: stencil.width
      , height: stencil.height
      , top: location.top
      , left: location.left
      }
    
    const pixles = stencil.width * stencil.height
    const cropped = await crop(cardBuffer, config)
    const diff = (new PNG(config))
    const numDiffPixels = pixelmatch(cropped, stencil.data, diff.data, config.width, config.height)
    if (numDiffPixels < pixles * 0.33) return true
    return false
  }))
  
  return matches
}

class Stalker {
  static async findIcons (card) {
    const cardBuffer = fs.readFileSync(`./assets/Characters/${card.characterKey}/${card.id}.png`)
    const stencils = await loadStencils()
    
    let found = await Promise.all(stencils.map(async stencil => {
      let found = await find(cardBuffer, stencil)
      if (found.some(match => match === true)) return stencil
      return null
    }))

    return found.filter(stencil => stencil !== null).map(stencil => {
      return { type: stencil.type, half: stencil.half }
    })
  }
}

module.exports = Stalker