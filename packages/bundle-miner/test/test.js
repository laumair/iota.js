'use strict'

const { describe } = require('riteway')
const { createBundleMiner } = require('../src/index.js')
const { normalizedBundle } = require('@iota/signing')
const { TRANSACTION_LENGTH } = require('@iota/transaction')
const { trytesToTrits } = require('@iota/converter')

describe('createBundleMiner()', async assert => {
    const normalizedBundles = [
        'QVXRKNRXFZIPFPREXRAPNHNSRFFQOWBGCAFZEGFCKDPDXRNVZQ9VJPQPPTFXKPVZVAIENQLETXRVSFKFO',
		    'JKHLAKTRTDIKMTERIRYEWI9PPOJAKHZEMNCXFB9GTRZRWKSFVAZANHSPABGGQIJAVULKMPPAL9VBSRB9E',
    ]
        .map(trytesToTrits)
        .map(normalizedBundle)

    const bundle = new Int8Array(TRANSACTION_LENGTH * 4).fill(0)

    const bundleMiner = createBundleMiner({
        normalizedBundles,
        bundle,
        threshold: 100,
        numberOfWorkers: 2,
        valuesPerWorkerRound: 1000,
    })

    assert({
        given: 'normalized bundle hashes, a sweep bundle and security threshold',
        should: 'find a good index.',
        actual: await new Promise((resolve, reject) => {
            bundleMiner.start()
            bundleMiner.on('end', ({ index }) => resolve(index))
            bundleMiner.on('error', reject)
        }),
        expected: 4091
    })
})
