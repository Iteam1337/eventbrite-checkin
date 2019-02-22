const express = require('express')
const { port } = require('./config')
const eventbrite = require('./eventbrite')
const app = express()

app.get('/', async (_, res) => {
  const result = await eventbrite.checkIn()
  console.log('result', result)
  res.send('it should be w0rking!')
})

app.listen(port, () => console.log(`Server started on port ${port}`))
