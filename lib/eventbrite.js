const axios = require('axios')
const {
  eventbrite: { email: e, password: p, token },
  event: { id: eventId },
} = require('./config')

const email = encodeURIComponent(e)
const password = encodeURIComponent(p)

function getCookie(name, cookies) {
  const cookie = cookies.filter(c => c.indexOf(`${name}=`) !== -1)[0]
  if (!cookie) {
    console.log('cookie not found!')
    return undefined
  }

  return cookie
}

function getCookieValue(name, cookies) {
  const cookie = getCookie(name, cookies)
  if (!cookie) {
    console.log('cookie not found!')
    return undefined
  }

  return cookie.split(';')[0].replace(`${name}=`, '')
}

async function getCsrfToken() {
  const result = await axios.get('https://www.eventbrite.com/signin/', {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9,ro;q=0.8,ru;q=0.7,fr;q=0.6,sv;q=0.5',
      'cache-control': 'max-age=0',
      'upgrade-insecure-requests': '1',
    },
  })

  return getCookieValue('csrftoken', result.headers['set-cookie'])
}

async function getAuthCookies() {
  const csrfToken = await getCsrfToken()
  const result = await axios.post(
    'https://www.eventbrite.com/ajax/login/',
    `password=${password}&email=${email}`,
    {
      credentials: 'include',
      headers: {
        'x-csrftoken': csrfToken,
        referer: 'https://www.eventbrite.com/',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        cookie: `csrftoken=${csrfToken};`,
      },
    }
  )

  const cookies = result.headers['set-cookie']
  const mglogin2 = getCookie('mglogin2', cookies)
  const mgssl = getCookie('mgssl', cookies)

  return [mglogin2, mgssl]
}

async function getAttendee(email) {
  const {
    data: { attendees },
  } = await axios.get(
    `https://www.eventbriteapi.com/v3/events/${eventId}/attendees`,
    {
      headers: { authorization: `Bearer ${token}` },
    }
  )

  const attendee = attendees.find(a => a.profile.email === email)
  return attendee
}

async function checkIn(email) {
  const cookies = await getAuthCookies()
  const attendee = await getAttendee(email)
  if (!attendee) {
    throw new Error('attendee not found')
  }

  const result = await axios.get(
    `https://www.eventbrite.com/checkin_update?eid=${eventId}&attendee=${
      attendee.id
    }&quantity=1`,
    {
      headers: {
        cookie: cookies.join(';'),
      },
    }
  )

  return result.data
}

async function checkOut(email) {
  const cookies = await getAuthCookies()
  const attendee = await getAttendee(email)
  if (!attendee) {
    throw new Error('attendee not found')
  }
  const result = await axios.get(
    `https://www.eventbrite.com/checkin_update?eid=${eventId}&attendee=${
      attendee.id
    }&quantity=0`,
    {
      headers: {
        cookie: cookies.join(';'),
      },
    }
  )

  return result.data
}

module.exports = {
  getAuthCookies,
  checkIn,
  checkOut,
}
