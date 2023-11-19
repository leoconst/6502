import { describe, test } from '@jest/globals'
import { Processor, Opcodes } from '../src/processor'

describe('Processor', () => {
    test('default values', () => {
        let processor = new Processor()

        expect(processor.memory).toStrictEqual(new Uint8Array(0x10000))
        expect(processor.status.negative).toBe(false)
        expect(processor.status.zero).toBe(false)
        expect(processor.status.carry).toBe(false)
        expect(processor.accumulator.getValue()).toBe(0)
        expect(processor.x.getValue()).toBe(0)
        expect(processor.y.getValue()).toBe(0)
        expect(processor.program_counter).toBe(0x600)
    })
    test('load program', () => {
        let program = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
        let processor = new Processor()
        let memory_start = processor.program_counter

        processor.load_program(program)

        let actual_memory_slice = processor.memory.slice(memory_start, memory_start + program.length)
        expect(actual_memory_slice).toStrictEqual(program)
    })
    test('advance without program', () => {
        let processor = new Processor()

        let proceed = processor.advance()

        expect(proceed).toBe(false)
        expect(processor.memory).toStrictEqual(new Uint8Array(0x10000))
    })
    test('clear carry from set', () => {
        _test_clear_carry(true)
    })
    test('clear carry from unset', () => {
        _test_clear_carry(false)
    })
})

function _test_clear_carry(carry: boolean) {
    let processor = new Processor()
    processor.status.carry = carry
    let program = new Uint8Array([Opcodes.CLEAR_CARRY])
    processor.load_program(program)

    let proceed = processor.advance()

    expect(proceed).toBe(true)
    expect(processor.status.carry).toBe(false)
}
