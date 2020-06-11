// Cards creates all the card assets based on the Gloomhaven
// PDF files distributed by Isaac Childres (the creator of Gloomhaven)
// https://drive.google.com/drive/folders/0B8ppELln5Z0rLXdWYnh3QkZuMU0

// This probably doesn't need to be run very often, but I've included it
// as part of the project as a reference for fixing any emerging errors in the process.

const characters = require('./characters')
const fs = require('fs')
const path = require('path')
const PDFImage = require('pdf-image').PDFImage

const TEMP_DIR = './tmp'
const TARGET_DIR = './assets/Characters'
const PDF_DIR = './pdfs'

function getFileNumber (filePath) {
  return parseInt(filePath.split('-')[1].replace('.png', ''))
}

class Cards {
  static async export () {
    // Each caracter object contains data that we will need to process the pdfs.
    // So, using them as the source, we'll loop through each character,
    // read the pdf, and export the images we want as assets.
    console.log('Exporting Cards ... this will take a bit.\n')
    
    // Delete the old temp directory if it exists and create a new one.
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmdirSync(TEMP_DIR, { recursive: true })
    }
    fs.mkdirSync(TEMP_DIR)

    const promises = characters.map(async character => {
      console.log(`Starting to export ${character.name}`)

      // Create a pdf object based on the character's pdf information
      const pdfImage = new PDFImage(`${PDF_DIR}/${character.key} Cards.pdf`, 
        { outputDirectory: TEMP_DIR
        , pdfFileBaseName: character.key
        , convertOptions: 
          { "-resize": "400x600"
          , "-quality": "100"
          , "-density": "600"
          }
        }
      )
      
      // Export all the card images to our temp directory
      let imagePaths = await pdfImage.convertFile()
      
      // Move each card image to the correct folder with the correct name.
      // First we need to sort the cards in numeric order.
      console.log(`Cleaning up output for ${character.name}\n`)
      imagePaths.sort((a, b) => {
        return getFileNumber(a) - getFileNumber(b)
      })

      const characterDir = `./${TARGET_DIR}/${character.key}`
      
      // We want to clear out any old cards for the character, 
      // so delete the old directory and create a new one.
      if (fs.existsSync(characterDir)) {
        fs.rmdirSync(characterDir, { recursive: true })
      }
      fs.mkdirSync(characterDir)
      
      // The second card in the list is always the back of the card.
      fs.renameSync(imagePaths[1], path.join(characterDir, 'back.png'))
      imagePaths.splice(1, 1)
      
      // The rest of the card backs can be removed from the image set.
      let remove = imagePaths.filter(p => getFileNumber(p)%2 === 1)
      remove.forEach(p => fs.unlinkSync(p))
      
      // Finally, we can move all the cards to the Character cards asset folder.
      let move = imagePaths.filter(p => getFileNumber(p)%2 === 0)
      move.forEach((p, index) => {
        let id = (index + character.cardIdStart).toString().padStart(3, '0')
        let target = path.join(characterDir, `${id}.png`)
        fs.renameSync(p, target)
        console.log(`${target} complete`)
      })
    })
    
    let results = await Promise.all(promises)
    fs.rmdirSync(TEMP_DIR, { recursive: true })
  }
}

Cards.export()
