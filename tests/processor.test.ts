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
    test('load accumulator immediate positive', () => {
        const processor = _programmed_processor(
            Opcode.LOAD_ACCUMULATOR_IMMEDIATE, 3,
        )

        _run_program(processor)

        _expect_state(processor, {
            accumulator: 3,
        })
    })
    test('load accumulator immediate zero', () => {
        const processor = _programmed_processor(
            Opcode.LOAD_ACCUMULATOR_IMMEDIATE, 0,
        )

        _run_program(processor)

        _expect_state(processor, {
            zero: true,
        })
    })
    test('load accumulator immediate negative', () => {
        const processor = _programmed_processor(
            Opcode.LOAD_ACCUMULATOR_IMMEDIATE, -4,
        )

        _run_program(processor)

        _expect_state(processor, {
            accumulator: 0x100 - 4,
            negative: true,
        })
    })
})

function _programmed_processor(...program: number[]) {
    const processor = new Processor()
    processor.load_program(new Uint8Array(program), 0x0600)
    return processor
}

function _run_program(processor: Processor, expected_advance_count: number = 1) {
    var advance_count = 0

    while (processor.advance()) {
        ++advance_count
    }

    expect(advance_count).toBe(expected_advance_count)
}

function _expect_state(processor: Processor, state: _ProcessorState) {
    const expected = {..._default_state, ...state}
    const actual = {
        accumulator: processor.accumulator.getValue(),
        zero: processor.status.zero,
        negative: processor.status.negative,
    }

    expect(actual).toStrictEqual(expected)
}

const _default_state: _ProcessorState = {
    accumulator: 0,
    zero: false,
    negative: false,
}

interface _ProcessorState {
    accumulator?: number,
    zero?: boolean,
    negative?: boolean,
}

function _test_clear_carry(carry: boolean) {
    const processor = new Processor()
    processor.status.carry = carry
    const program = new Uint8Array([Opcode.CLEAR_CARRY])
    processor.load_program(program, 0x06_00)

    const proceed = processor.advance()

    expect(proceed).toBe(true)
    expect(processor.status.carry).toBe(false)
}
