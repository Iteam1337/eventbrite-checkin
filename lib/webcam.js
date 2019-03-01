const Webcam = require( 'node-webcam' )
const fs = require('fs')
const EventEmitter = require('events')


function startCamera(filename = './images/camera.jpg', interval = 1000) {
  const output = new EventEmitter()
  const cam = Webcam.create( {} )
  setInterval(() => cam.capture(filename, ( err, data ) => {
    if (err) console.error(err)
    const filename = './images/camera.jpg'
    output.emit('frame', filename)
  }), interval)
  return output
}
 
module.exports = startCamera