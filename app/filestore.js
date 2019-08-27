const express = require('express') // https://expressjs.com/en/4x/api.html#express
const router = express.Router()
const multer  = require('multer') // https://github.com/expressjs/multer
const fs = require('fs')
const path = require('path')

const uploadDir = 'uploads'

function createDir (dir, cb) {
  fs.access (dir, err => {
    if (err) {
      fs.mkdir (dir, {recursive: true}, err => {
        cb (err, dir)
      })
    }
    else {
      cb(err, dir)
    }
  })
}

router.use('/memory', function(req, res, next) {
  req.uploaddir = req.query.appdir
  req.args = (typeof req.query.args === 'string') ? JSON.parse (req.query.args) : req.query.args
  if (!req.uploaddir && req.args) req.uploaddir = req.args.appdir
  if (!req.uploaddir) req.uploaddir = uploadDir
  next()
})

router.post('/memory', multer({ storage: multer.memoryStorage() }).any(), function(req, res, next) {
  if (req.files && req.files.length > 0) {
    const appDir = req.uploaddir
    var dones = 0
    const nfiles = req.files.length
    function done (err) {
      if (err) {
        res.json({query: req.query, files: req.files, headers: req.headers, error: err})
      }
      else if (++dones == nfiles) {
        res.json({query: req.query, files: req.files, headers: req.headers})
      }
    }
    req.files.forEach (f => {
      if (f.buffer) {
        const buffer = f.buffer
        createDir (appDir, (err, dir) => {
          if (err) {
            f.error = err
            done (err)
          }
          else {
            const filepath = path.join (dir, `${f.fieldname}`)
            fs.writeFile (filepath, buffer, err => {
              if (err) {
                f.error = err
              }
              else {
                f.saved = true
                f.savedName = filepath
              }
              done ()
            })
          }
        })
        delete f.buffer
      }
    })
  }
})

module.exports = router