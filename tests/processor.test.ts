import { Processor } from '../src/processor'
import { Opcode } from '../src/opcodes'

describe('Processor', () => {
    test('default values', () => {
        const processor = new Processor()

        expect(processor.memory).toStrictEqual(new Uint8Array(0x10000))
        expect(processor.status.negative).toBe(false)
        expect(processor.status.zero).toBe(false)
        expect(processor.status.carry).toBe(false)
        expect(processor.accumulator.getValue()).toBe(0)
        expect(processor.x.getValue()).toBe(0)
        expect(processor.y.getValue()).toBe(0)
        expect(processor.program_counter).toBe(0)
    })
    test('load program', () => {
        const program = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
        const processor = new Processor()
        const program_start = 0x11_00

        processor.load_program(program, program_start)

        const actual_memory_slice = processor.memory.slice(program_start, program_start + program.length)
        expect(actual_memory_slice).toStrictEqual(program)
        expect(processor.program_counter).toBe(program_start)
    })
    test('advance without program', () => {
        const processor = new Processor()

        const proceed = processor.advance()

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
    const processor = new Processor()
    processor.status.carry = carry
    const program = new Uint8Array([Opcode.CLEAR_CARRY])
    processor.load_program(program, 0x06_00)

    const proceed = processor.advance()

    expect(proceed).toBe(true)
    expect(processor.status.carry).toBe(false)
}
