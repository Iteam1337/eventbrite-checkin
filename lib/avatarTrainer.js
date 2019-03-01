const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const fr = require('face-recognition')
const {
  clearbit: {key: clearbitKey},
  event: { id: eventId },
  eventbrite: {
    token: eventbriteToken
  }
} = require('./config')

const { from, pipe, of } = require('rxjs')
const { map, filter, mergeMap, tap, mergeAll, catchError, doto, finalize} = require('rxjs/operators')
const clearbit = require('clearbit')(clearbitKey)
const detector = fr.AsyncFaceDetector()
const recognizer = fr.AsyncFaceRecognizer()
const jitters = 15

const getAttendees = (eventId) =>  fetch(`https://www.eventbriteapi.com/v3/events/${eventId}/attendees`, {
  headers: {
    authorization: `Bearer ${eventbriteToken}`
  }
}).then(res => res.json()).then(json => json.attendees) // TODO: add pagination

const getProfile = (email) => clearbit.Person.find({ email: email, stream: true })
const download = (url, dest) => !url ? Promise.resolve(url) : fetch(url).then(res => new Promise(resolve => res.body.pipe(fs.createWriteStream(dest).once('finish', () => resolve(dest)))))

const enrichProfile = () => pipe(
  mergeMap(attendee => getProfile(attendee.profile.email).then(clearbit => ({...attendee, clearbit})).catch(err => Promise.resolve({...attendee, clearbit: {err}}))),
  map(({
    id, 
    profile: {email}, 
    clearbit: { 
      github: {avatar: github} = {},
      facebook: {avatar: facebook} = {},
      twitter: {avatar: twitter} = {},
      linkedin: {avatar: linkedin} = {},
      googleplus: {avatar: googleplus} = {},
      gravatar: {avatar: gravatar} = {}
    } = {}
  }) => ({id, email, github, facebook, twitter, linkedin, googleplus, gravatar})),
  map(profile => fs.existsSync(`./images/faces/${profile.email}.jpg`) ? {...profile, manual: `./images/faces/${profile.email}.jpg`} : profile)
)

const downloadAvatars = () => pipe(
  mergeMap(attendee => download(attendee.github, `./avatars/github/${attendee.email}.jpg`).then((dest) => ({...attendee, github: dest}))),
  mergeMap(attendee => download(attendee.facebook, `./avatars/facebook/${attendee.email}.jpg`).then((dest) => ({...attendee, facebook: dest}))),
  mergeMap(attendee => download(attendee.twitter, `./avatars/twitter/${attendee.email}.jpg`).then((dest) => ({...attendee, twitter: dest}))),
  mergeMap(attendee => download(attendee.linkedin, `./avatars/linkedin/${attendee.email}.jpg`).then((dest) => ({...attendee, linkedin: dest}))),
  mergeMap(attendee => download(attendee.gravatar, `./avatars/gravatar/${attendee.email}.jpg`).then((dest) => ({...attendee, gravatar: dest}))),
  map(({email, id, github, facebook, twitter, linkedin, gravatar, manual}) => ({email, id, avatars: [github, facebook, twitter, linkedin, manual].filter(a => a)})),
  filter(p => p.avatars.length)
)

const extractFaces = () => pipe(
  map(({email, id, avatars}) => avatars.map(avatar => ({email, id, avatar}))),
  mergeAll(),
  tap(profile => console.log('loading image', profile.avatar)),
  map(profile => ({...profile, avatar: fr.loadImage(profile.avatar)})),
  catchError(err => {
    console.error(err)
    return of([])
  }),
  filter(p => p.avatar),
  mergeMap(({email, id, avatar}) => detector.detectFaces(avatar).then(faces => ({email, id, faces}))),
  filter(({faces}) => faces.length === 1),  // only keep avatars with one face
  map(({email, id, faces}) => faces.map(face => ({email, id, face}))),
  mergeAll()
)

const train = () => pipe(
  mergeMap(({face, email, id}) => recognizer.addFaces([face], email, jitters).then(() => ({face, email, id}))),
)

function trainOnAttendeesFromEvent(eventId) {
  return new Promise(resolve => {
    from(getAttendees(eventId)).pipe(
      mergeAll(),
      tap(({profile}) => console.log(`[x] Enriching profiles for ${profile.email}...`)),
      enrichProfile(),
      tap(profile => console.log(`[x] Clearbit result: ${Object.keys(profile).join(', ')}...`)),
      downloadAvatars(),
      tap(profile => console.log(`[x] Extracting faces for ${profile.email}, found ${profile.avatars}`)),
      extractFaces(),
      tap(profile => console.log(`[x] Training network for ${profile.email} with ${profile.face.cols}x${profile.face.rows} face`)),
      train(),
      finalize(() => resolve({recognizer, detector}))
    )
    .subscribe(({id, email}) => console.log(`[x] Done! id: ${id} email: ${email}`))
  }) 
}

module.exports = trainOnAttendeesFromEvent
