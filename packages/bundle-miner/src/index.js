'use strict'

/** @module bundle-miner */

const {
    TAG_LENGTH,
    TRANSACTION_LENGTH,
    TRANSACTION_ESSENCE_LENGTH,
    transactionEssence,
    isMultipleOfTransactionLength,
} = require('@iota/transaction')
const {
    NORMALIZED_FRAGMENT_LENGTH,
    MAX_TRYTE_VALUE,
} = require('@iota/signing')
const { valueToTrits, tritsToValue } = require('@iota/converter')
const pad = require('@iota/pad')
const { Worker } = require('worker_threads')
const { EventEmitter } = require('events')

function minNormalizedBundle(normalizedBundles, securityLevel) {
    const values = normalizedBundles[0]
        .slice(0, securityLevel * NORMALIZED_FRAGMENT_LENGTH)
        .map(v => MAX_TRYTE_VALUE - v)

    for (let i = 1; i < normalizedBundles.length; i++) {
        for (let j = 0; j < securityLevel * NORMALIZED_FRAGMENT_LENGTH; j++) {
            values[j] = Math.min(MAX_TRYTE_VALUE - normalizedBundles[i][j], values[j])
        }
    }

    return values
}

function bundleEssence(bundle) {
    const bundleCopy = bundle.slice()
    const essence = new Int8Array((bundleCopy.length / TRANSACTION_LENGTH) * TRANSACTION_ESSENCE_LENGTH)

    for (let offset = 0; offset < bundleCopy.length; offset += TRANSACTION_LENGTH) {
        essence.set(transactionEssence(bundleCopy, offset))
    }

		return essence
}

/**
 * Creates a bundle miner for a specific address reuse case.
 * The case is described by:
 * 1. Previous normalized bundle hashes which have been signed by the used private key.
 * 2. A new bundle that moves funds from the used address.
 * 3. The security level of the used address.
 *
 * Bundle miner offers an interface to stop and resume search.
 * It is also an event emitter that triggers the following events;
 *
 * 1. `data`: `{ index }` - Best known index value.
 * 2. `end`: `{ index }` - Index value that gives bundle with required security threshold.
 * 3. `error`: `Error` - Emitted when a thread returns an error.
 *
 * @method createBundleMiner
 *
 * @param {Int8Array} params.normalizedBundle - Previous normalized bundle hash(es).
 * @param {Int8Array} params.bundle - Bundle that sweeps funds from already used address.
 * @param {number} threshold - Threshold value to stop, once required security level is reached.
 * @param {number} [securityLevel=2] - Security level of spent address.
 * @param {number} [numberOfWorkers=1] - Number of threads to use.
 * @param {number} [valuesPerWorkerRound=1000] - How many indexes to check per round. Increasing results to less ipc.
 *
 * @return {object} - bundle miner object with start()/stop() methods.
 */
function createBundleMiner({
		normalizedBundles,
		bundle,
    threshold = 100, // TODO: define default threshold
    securityLevel = 2,
		numberOfWorkers = 1,
		valuesPerWorkerRound = 10 ** 3,
}) {
    if  (normalizedBundles.some(normalizedBundle => normalizedBundle.length < NORMALIZED_FRAGMENT_LENGTH * securityLevel)) {
        throw new Error('Illegal normalized bundle length.')
    }

		if (!isMultipleOfTransactionLength(bundle.length)) {
				throw new Error('Illegal bundle length')
		}

    if ([1, 2, 3].indexOf(securityLevel) === -1) {
        throw new Error('Illegal security level.')
    }

		let running = false
		let n = 0

		const workers = []
		const target = {}
		const bundleMiner = bundleMinerMixin.call(target)
		const startCommand = () => ({
				command: 'start',
				essence: bundleEssence(bundle),
				minNormalizedBundle: minNormalizedBundle(normalizedBundles, securityLevel),
				count: valuesPerWorkerRound,
				index: n++ * valuesPerWorkerRound,
		})
		const stopCommand = {
				command: 'stop',
		}

    let opt = Number.POSITIVE_INFINITY

		function bundleMinerMixin() {
				return Object.assign(
						this,
						{

                /**
                 * Starts searching for bundle that satisfies security threshold.
                 *
                 * @method start
                 *
                 * @param {number} offset - Offset to resume searching.
                 */
								start(offset) {
										if (running) {
												throw new Error('Search is already running.')
										}

										if (offset) {
												n = offset
										}

										running = true

										workers.forEach(worker => worker.postMessage(startCommand()))
								},
                /**
                 * Stops searching and kills active threads.
                 *
                 * @method stop
                 */
								stop() {
										if (running) {
												running = false

												workers.forEach(worker => worker.postMessage(stopCommand))
										}
								},
                /**
                 * Returns the latest round. Use this to periodically persit the returned offset
                 * and resume if search has been stopped.
                 *
                 * @method getOffset
                 *
                 * @return {number}
                 */
								getOffset() {
										return n
								}
						},
						EventEmitter.prototype,
				)
		}

		// Init workers
		for (let i = 0; i < numberOfWorkers; i++) {
				workers.push(new Worker('./src/worker.js'))
		}

		workers.forEach(worker => {
				worker.on('message', message => {
						if (message && Number.isInteger(message.index)) {
                if (message.dist < opt) {
								    opt = message.dist
                    bundleMiner.emit('data', message)
                }

								// TODO: estimate security level

								// Stop if required security level is reached
								if (message.dist < threshold) {
                    if (running) {
										    bundleMiner.emit('end', message)
										    bundleMiner.stop()
                    }
										return
								}

								// Begin next worker round
								worker.postMessage(startCommand())
						}
				})

				worker.on('error', error => bundleMiner.emit('error', error))
		})

		return bundleMiner
}


module.exports = {
    createBundleMiner,
    minNormalizedBundle,
}
