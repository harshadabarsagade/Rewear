import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

import Clothing from './models/Clothing.js'
import Outfit from './models/Outfit.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadDir = path.join(__dirname, 'uploads')

fs.mkdirSync(uploadDir, { recursive: true })

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(uploadDir))

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true)
    } else {
      callback(new Error('Only image files are allowed'))
    }
  },
})

app.get('/', (_req, res) => {
  res.json({ message: 'ReWear API is running' })
})

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

// Upload clothing photo
app.post('/api/upload', (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (error) return next(error)

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' })
    }

    res.status(201).json({
      image: `/uploads/${req.file.filename}`,
    })
  })
})

// Get all clothes
app.get('/api/clothes', async (_req, res, next) => {
  try {
    const clothes = await Clothing.find().sort({ createdAt: -1 })
    res.json(clothes)
  } catch (error) {
    next(error)
  }
})

// Add clothing
app.post('/api/clothes', async (req, res, next) => {
  try {
    const { name, category, color, occasion, image } = req.body

    if (!name?.trim() || !category || !color?.trim() || !image) {
      return res.status(400).json({
        message: 'Name, category, color and image are required',
      })
    }

    const clothing = await Clothing.create({
      name,
      category,
      color,
      occasion: occasion || 'Any',
      image,
    })

    res.status(201).json(clothing)
  } catch (error) {
    next(error)
  }
})

// Update clothing
app.put('/api/clothes/:id', async (req, res, next) => {
  try {
    const clothing = await Clothing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    if (!clothing) {
      return res.status(404).json({ message: 'Clothing item not found' })
    }

    res.json(clothing)
  } catch (error) {
    next(error)
  }
})

// Delete clothing
app.delete('/api/clothes/:id', async (req, res, next) => {
  try {
    const clothing = await Clothing.findByIdAndDelete(req.params.id)

    if (!clothing) {
      return res.status(404).json({ message: 'Clothing item not found' })
    }

    await Outfit.updateMany(
      { items: clothing._id },
      { $pull: { items: clothing._id } }
    )

    res.json({ message: 'Clothing item deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Get saved outfits
app.get('/api/outfits', async (_req, res, next) => {
  try {
    const outfits = await Outfit.find()
      .populate('items')
      .sort({ createdAt: -1 })

    res.json(outfits)
  } catch (error) {
    next(error)
  }
})

// Save outfit
app.post('/api/outfits', async (req, res, next) => {
  try {
    const { name, occasion, items } = req.body

    if (!name?.trim() || !Array.isArray(items) || items.length < 2) {
      return res.status(400).json({
        message: 'Outfit name and at least two clothing items are required',
      })
    }

    const uniqueItems = [...new Set(items)]

    const existingItems = await Clothing.find({
      _id: { $in: uniqueItems },
    })

    if (existingItems.length !== uniqueItems.length) {
      return res.status(400).json({
        message: 'One or more clothing items do not exist',
      })
    }

    const outfit = await Outfit.create({
      name,
      occasion: occasion || 'Any',
      items: uniqueItems,
    })

    await outfit.populate('items')
    res.status(201).json(outfit)
  } catch (error) {
    next(error)
  }
})

// Delete outfit
app.delete('/api/outfits/:id', async (req, res, next) => {
  try {
    const outfit = await Outfit.findByIdAndDelete(req.params.id)

    if (!outfit) {
      return res.status(404).json({ message: 'Outfit not found' })
    }

    res.json({ message: 'Outfit deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// Outfit recommendation helpers
const neutralColors = [
  'black', 'white', 'beige', 'grey', 'gray',
  'brown', 'cream', 'navy', 'denim',
]

function normalizeColor(color = '') {
  return color.toLowerCase().trim()
}

function colorsMatch(first = '', second = '') {
  const a = normalizeColor(first)
  const b = normalizeColor(second)

  if (!a || !b || a === 'unknown' || b === 'unknown') return false
  if (a === b) return true
  if (neutralColors.includes(a) || neutralColors.includes(b)) return true

  const goodPairs = [
    ['blue', 'white'],
    ['blue', 'beige'],
    ['pink', 'white'],
    ['pink', 'grey'],
    ['green', 'beige'],
    ['green', 'white'],
    ['red', 'black'],
    ['red', 'white'],
    ['purple', 'white'],
    ['yellow', 'blue'],
    ['brown', 'cream'],
  ]

  return goodPairs.some(([x, y]) =>
    (a === x && b === y) || (a === y && b === x)
  )
}

function occasionMatches(item, occasion) {
  return !occasion ||
    occasion === 'Any' ||
    item.occasion === 'Any' ||
    item.occasion === occasion
}

function makeRecommendations(clothes, occasion) {
  const available = clothes.filter((item) =>
    occasionMatches(item, occasion)
  )

  const tops = available.filter((item) => item.category === 'Tops')
  const bottoms = available.filter((item) => item.category === 'Bottoms')
  const dresses = available.filter((item) => item.category === 'Dresses')
  const ethnic = available.filter((item) => item.category === 'Ethnic Wear')
  const shoes = available.filter((item) => item.category === 'Footwear')
  const accessories = available.filter((item) => item.category === 'Accessories')

  const suggestions = []

  function addSuggestion(mainItems) {
    if (mainItems.length === 0) return

    const baseColorsWork = mainItems.every((item, index) =>
      mainItems.slice(index + 1).every((other) =>
        colorsMatch(item.color, other.color)
      )
    )

    if (!baseColorsWork) return

    const matchingShoes = shoes.find((shoe) =>
      mainItems.some((item) => colorsMatch(item.color, shoe.color))
    )

    const matchingAccessory = accessories.find((accessory) =>
      mainItems.some((item) => colorsMatch(item.color, accessory.color))
    )

    const items = [
      ...mainItems,
      ...(matchingShoes ? [matchingShoes] : []),
      ...(matchingAccessory ? [matchingAccessory] : []),
    ]

    suggestions.push({
      name: mainItems.map((item) => item.name).join(' + '),
      occasion,
      items,
      reason: `Colors match for a ${occasion || 'versatile'} look.`,
    })
  }

  for (const top of tops) {
    for (const bottom of bottoms) {
      if (colorsMatch(top.color, bottom.color)) {
        addSuggestion([top, bottom])
      }
    }
  }

  for (const dress of dresses) addSuggestion([dress])
  for (const item of ethnic) addSuggestion([item])

  return suggestions.slice(0, 12)
}

// Get outfit suggestions
app.get('/api/recommendations', async (req, res, next) => {
  try {
    const occasion = req.query.occasion || 'Any'
    const clothes = await Clothing.find()
    const suggestions = makeRecommendations(clothes, occasion)
    res.json(suggestions)
  } catch (error) {
    next(error)
  }
})

// Error handler
app.use((error, _req, res, _next) => {
  console.error(error.message)

  const status = error.name === 'ValidationError' ? 400 : 500

  res.status(status).json({
    message: error.message || 'Something went wrong',
  })
})

async function startServer() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is missing. Add it to backend/.env')
    process.exit(1)
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('MongoDB connected successfully')

    app.listen(PORT, () => {
      console.log(`ReWear API running at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Could not connect to MongoDB:', error.message)
    process.exit(1)
  }
}

startServer()
