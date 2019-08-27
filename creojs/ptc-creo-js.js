const fs = require('fs')
const path = require('path')

function copyFile (src, dst) {
  fs.copyFile(src, dst, (err) => {
    if (err) throw err;
    console.log(`${src} was copied to ${dst}`);
  })
}

function copyDir (src, dst) {
  fs.access (dst, err => {
    if (err) fs.mkdirSync (dst, {recursive: true})
    fs.readdir(src, (err, files) => {
      files.forEach(file => {
        const srcfile = path.join (src, file)
        const dstfile = path.join (dst, file)
        fs.stat (srcfile, (err, stats) => {
          if (err) throw err
          if (stats.isDirectory ()) {
            copyDir (srcfile, dstfile)
          }
          else {
            copyFile (srcfile, dstfile)
          }
        })
      });
    })
  })
}

module.exports.bootstrap = (root, js = 'creojsweb') => {
  const jsdst = path.join (root, js)
  const jssrc = path.join (__dirname, 'www')
  console.log (`copy ${jssrc} to ${jsdst}`)
  copyDir (jssrc, jsdst)
  const appdst = path.join (root, 'creo_app.html')
  fs.access (appdst, err => {
    if (err) {
      const appsrc = path.join (__dirname, 'ptc-creo-app.html')
      console.log (`copy ${appsrc} to ${appdst}`)
      copyFile (appsrc, appdst)
    }
    else {
      console.log (`${appdst} already exists`)
    }
  })
}