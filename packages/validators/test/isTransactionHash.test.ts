import test from 'ava'
import { transactionObject, invalidTransactionObject } from '@iota/samples'
import { isTransactionHash } from '../src'

test('isTransactionHash() returns true for valid transaction hash.', t => {
    const hash = 'OZQCYCGHUJHNLDUOKXUPEDCDJCPEWEDXFAFPCGKKDVHVTGUEKBW9VUYDUVEAPZZGPHYMVHABOWZHA9999'
    t.is(isTransactionHash(hash), true, 'isTransactionHash() should return true for valid transaction hash.')
})

test('isTransactionHash() returns true for valid transaction', t => {
    t.is(isTransactionHash(transactionObject), true, 'isTransactionHash() returns true for valid transaction')
})

test('isTransactionHash() returns true if provided transaction.hash is valid and minWeightMagnitude <= weightMagnitude.', t => {
    t.is(
        isTransactionHash(transactionObject, 4),
        true,
        'isTransactionHash() returns true if provided transaction.hash is valid and minWeightMagnitude <= weightMagnitude.'
    )
})

test('isTransactionHash() returns false if provided transaction.hash is invalid and minWeightMagnitude > weightMagnitude.', t => {
    t.is(
        isTransactionHash(transactionObject, 5),
        false,
        'isTransactionHash() returns false if provided transaction.hash is invalid and minWeightMagnitude > weightMagnitude.'
    )
})

test('isTransactionHash() returns true if provided hash is valid and minWeightMagnitude <= weightMagnitude.', t => {
    t.is(
        isTransactionHash(transactionObject.hash, 3),
        true,
        'isTransactionHash() returns true if provided hash is valid and minWeightMagnitude <= weightMagnitude.'
    )
})

test('isTransactionHash() returns false if provided hash is invalid and minWeightMagnitude <= weightMagnitude.', t => {
    t.is(
        isTransactionHash('9'.repeat(80), 3),
        false,
        'isTransactionHash() returns false if provided hash is invalid and minWeightMagnitude <= weightMagnitude.'
    )
})

test('isTransactionHash() returns false if provided hash is valid and minWeightMagnitude > weightMagnitude.', t => {
    t.is(
        isTransactionHash(transactionObject.hash, 5),
        false,
        'isTransactionHash() returns false if provided hash is valid and minWeightMagnitude > weightMagnitude.'
    )
})

test('isTransactionHash() returns false for invalid transaction hash.', t => {
    const invalidLength = 'OZQCYCGHUJHNLDUOKXUPEDCDJCPEWEDXFAFPCGKKDVHVTGUEKBW9VUYDUVEAPZZGPHYMVHABOWZHA9999ASDFASDFA'
    const invalidTrytes = 'sadfYCGHUJHNLDUOKXUPEDCDJCPEWEDXFAFPCGKKDVHVTGUEKBW9VUYDUVEAPZZGPHYMVHABOWZHA9999'

    t.is(
        isTransactionHash(invalidLength),
        false,
        'isTransactionHash() should return false for input of invalid length.'
    )

    t.is(isTransactionHash(invalidTrytes), false, 'isTransactionHash() should return fasle for invalid trytes.')
})
