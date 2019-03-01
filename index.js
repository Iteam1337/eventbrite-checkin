const app = require('./lib/server')
const trainer = require('./lib/avatarTrainer')
const ipCamera = require('./lib/ipCamera')
const webcam = require('./lib/webcam')
const eventbrite = require('./lib/eventbrite')
const beep = require('beepbeep')
const { from, fromEvent, pipe } = require('rxjs')
const { map, filter, mergeMap, tap, mergeAll, catchError, doto} = require('rxjs/operators')
const fr = require('face-recognition')
const { 
  port, 
  event: { id: eventId },
  maximumDistance,
  cameraUrl,
 } = require('./lib/config')

const loggedIn = {}

async function main () {  
  const {detector, recognizer} = await trainer(eventId)
  
  const filenames = fromEvent(webcam('./images/camera.jpg', 1000), 'frame') //from(['./images/cln.jpg']) //
  console.log('[x] Done training!')
  
  const faces = () => pipe(
    mergeMap(filename => detector.detectFaces(fr.loadImage(filename))),
    filter(faces => faces.length),
  )

  const find = () => pipe(
    mergeAll(),
    mergeMap(face => recognizer.predictBest(face)),
    map(({className:email, distance}) => ({email, distance})),
  )

  const checkedIn = filenames.pipe(
    faces(),
    tap(faces => console.log(`[ ] Detected ${faces.length} face(s)`)),
    find(),
    filter(({email, distance}) => {
      if (distance > maximumDistance) return console.log(`[ ] Didn't recognize this face. ${(distance)} distance ${email} > 0.5`)
      if (loggedIn[email]) return console.log(`[ ] Already checked in ${email}`)
      return true
    }),
    tap(({email, distance}) => console.log(`[ ] [ ] Recognized ${email} with ${(distance)} distance!`)),
    tap(({email}) => console.log(`[ ] Checking in ${email}... (disabled)`)),
    //mergeMap(({email}) => eventbrite.checkIn(email)),
  )

  checkedIn.subscribe(({email}) => {
    loggedIn[email] = true
    console.log(`[x] Done checking in ${email}!`)
    beep(1)
  })
}

main()
