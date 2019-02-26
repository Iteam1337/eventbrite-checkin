const config = require('nconf-camel-cased')({
  file: {
    file: 'config.json',
    dir: '../',
  },
  env: {
    separator: '__',
    lowerCase: true,
  },
})

config.defaults = {
  port: 3000,
  minimumDistance: 0.9,
  event: {
    id: '1234567890',
  },
  eventbrite: {
    token: 'foobar fake token',
    email: 'your eventbrite email',
    password: 'your eventbrite password',
  },
}

module.exports = {
  port: config.get('port'),
  event: config.get('event'),
  eventbrite: config.get('eventbrite'),
  minimumDistance: config.get('minimumDistance'),
  clearbit: config.get('clearbit'),
  cameraUrl: config.get('cameraUrl'),
}
