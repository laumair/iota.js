const { parentPort } = require('worker_threads')
const { valueToTrits } = require('@iota/converter')
const { normalizedBundle, NORMALIZED_FRAGMENT_LENGTH, MAX_TRYTE_VALUE } = require('@iota/signing')
const Kerl = require('@iota/kerl')
const { BUNDLE_LENGTH, ADDRESS_LENGTH, VALUE_LENGTH, OBSOLETE_TAG_LENGTH, isMultipleOfTransactionLength, transactionEssence } = require('@iota/transaction')

let running = false
let index
let count

function worker(essence, minNormalizedBundle) {
		const sponge = new Kerl.default()
		const bundleHash = new Int8Array(BUNDLE_LENGTH)

		const bundles = []

		let i = 0
		let bestHigher = 0

		while (running && i <= count && bestHigher !== minNormalizedBundle.length) {
			essence.set(valueToTrits(index), ADDRESS_LENGTH + VALUE_LENGTH, OBSOLETE_TAG_LENGTH)

			sponge.absorb(essence, 0, essence.length)
			sponge.squeeze(bundleHash, 0, BUNDLE_LENGTH)

			const normalized = normalizedBundle(bundleHash)

			let higher = 0

			if (normalized.indexOf(MAX_TRYTE_VALUE) === -1) {
					for (let j = 0; j < minNormalizedBundle.length; j++) {
							if ((MAX_TRYTE_VALUE - normalized[j]) >= minNormalizedBundle[j]) {
									higher++
							}
					}

					if (higher >= bestHigher) {
							bestHigher = higher


							let sum = 0
							let b = 0
              const means = []

							for (let offset = 0; offset < minNormalizedBundle.length; offset += NORMALIZED_FRAGMENT_LENGTH) {
									const negativeValues = normalized
											.slice(offset, offset + NORMALIZED_FRAGMENT_LENGTH)
											.filter(v => v < 0)
									const mean = negativeValues
											.reduce((acc, v) => acc += v, 0) / negativeValues.length
                  means.push(mean)
									sum += mean ** 2
									b += negativeValues.length
							}

              const dist = Math.sqrt(sum + b ** 3)

							bundles.push({
									index,
									dist,
                  means,
									normalizedBundle: normalized,
							})
					}
			}

			sponge.reset()

			index++
			i++
		}

		running = false
		parentPort.postMessage(bundles.sort((a, b) => a.dist - b.dist)[0])
}

parentPort.on('message', message => {
		switch (message.command) {
				case 'stop':
						running = false
            process.exit()
				case 'start':
						if (running) {
								throw new Error('Thread is already running.')
						}

						index = message.index
						count = message.count

						running = true

						process.nextTick(() => worker(message.essence, message.minNormalizedBundle))
		}
})
