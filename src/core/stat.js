'use strict'

const unmarshal = require('ipfs-unixfs').unmarshal
const promisify = require('promisify-es6')
const bs58 = require('bs58')
const {
  validatePath,
  traverseTo
} = require('./utils')
const waterfall = require('async/waterfall')
const log = require('debug')('mfs:stat')

const defaultOptions = {
  hash: false,
  size: false,
  withLocal: false
}

module.exports = function mfsStat (ipfs) {
  return promisify((path, options, callback) => {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    options = Object.assign({}, defaultOptions, options)

    try {
      path = validatePath(path)
    } catch (error) {
      return callback(error)
    }

    log(`Fetching stats for ${path}`)

    waterfall([
      (done) => traverseTo(ipfs, path, {
        withCreateHint: false
      }, done),
      ({ node }, done) => {
        if (options.hash) {
          return done(null, {
            hash: bs58.encode(node.multihash)
          })
        } else if (options.size) {
          return done(null, {
            size: node.size
          })
        }

        const meta = unmarshal(node.data)

        done(null, {
          hash: node.multihash,
          size: meta.fileSize(),
          cumulativeSize: node.size,
          childBlocks: meta.blockSizes.length,
          type: meta.type
        })
      }
    ], callback)
  })
}
