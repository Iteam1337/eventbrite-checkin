const express = require('express')
const bodyParser = require('body-parser')
const eventbrite = require('./eventbrite')
const app = express()

app.use(bodyParser.json())

app.get('/', (_, res) => {
  res.send('it should be w0rking!')
})

app.post('/checkin', async (req, res) => {
  try {
    const result = await eventbrite.checkIn(req.body.email)
    res.send(result)
  } catch (ex) {
    console.log(ex)
    res.status(500).send(ex.message)
  }
})

app.post('/checkout', async (req, res) => {
  try {
    const result = await eventbrite.checkOut(req.body.email)
    res.send(result)
  } catch (ex) {
    console.log(ex)
    res.status(500).send(ex.message)
  }
})


module.exports = app
