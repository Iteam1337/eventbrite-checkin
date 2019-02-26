const fetch = require('node-fetch')
const mjpg = require('pipe2jpeg')
const fs = require('fs')
const path = require('path')

const cameraStreamer = (url, throttleTime = 1000) => {
  const jpg = new mjpg()
  let last = Date.now()
  jpg.on('jpeg', async (buffer) => {
    // throttle
    if (Date.now() - last < throttleTime) return
    const filename = './images/camera.jpg'
    fs.writeFileSync(filename, buffer)
    jpg.emit('frame', path.resolve(filename))
    last = Date.now()
  })
  fetch(url).then(res => {
    console.log('got response', JSON.stringify(res, null, 2))
    return res.body.pipe(jpg)
  }).catch(err => console.error(err))
  console.log('getting camera from', url)
  return jpg
}

module.exports = cameraStreamer
