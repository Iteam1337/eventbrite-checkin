const app = require('./lib/server')
const trainer = require('./lib/avatarTrainer')
const camera = require('./lib/camera')
const eventbrite = require('./lib/eventbrite')
const beep = require('beepbeep')
const { fromEvent } = require('rxjs')
const { map, filter, mergeMap, tap, mergeAll, catchError, doto} = require('rxjs/operators')
const fr = require('face-recognition')
const { 
  port, 
  event: { id: eventId },
  minimumDistance,
  cameraUrl,
 } = require('./lib/config')

 const loggedIn = {}

const {detector, recognizer} = trainer(eventId)
const frames = camera(cameraUrl, 1000)
const checkedIn = fromEvent(frames, 'frame').pipe(
  mergeMap(filename => detector.detectFaces(fr.loadImage(filename))),
  filter(faces => faces.length),
  tap(faces => console.log(`[ ] Detected ${faces.length} face(s)`)),
  mergeAll(),
  mergeMap(face => recognizer.predictBest(face)),
  map(({className:email, distance}) => ({email, distance})),
  filter(({email, distance}) => {
    if (loggedIn[email]) return console.log(`[ ] Already checked in ${email}`)
    if (distance < minimumDistance) return console.log(`[ ] Didn't recognize this face. ${distance * 100}% ${email} < 90%`)
    console.log(`[ ] Recognized ${email} with ${distance * 100}% accuracy!`)
    return true
  }),
  tap(({className:email}) => console.log(`[ ] Checking in ${email}...`)),
  mergeMap(({className:email}) => eventbrite.checkIn(email)),
)

checkedIn.subscribe(({email}) => {
  loggedIn[email] = true
  console.log(`[x] Done checking in ${email}!`)
  beep(1)
})

app.listen(port, () => console.log(`Server started on port ${port}`))
