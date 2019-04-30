module.exports = process.env.NODE_ENV === 'production'
  ? () => { /* discard debug messages in production */ }
  : console.log;
