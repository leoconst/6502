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
    describe.each([true, false])('when the carry flag = %p', (carry) => {
        _test_processor('Clear Carry clears the carry flag', {
            program: [
                Opcode.CLEAR_CARRY,
            ],
            state: {
                carry,
            },
            expectations: {
                carry: false,
            }
        })
    })
    _test_processor('load accumulator (immediate) positive', {
        program: [
            Opcode.LOAD_ACCUMULATOR_IMMEDIATE, 3,
        ],
        expectations: {
            accumulator: 3,
        }
    })
    _test_processor('load accumulator (immediate) zero', {
        program: [
            Opcode.LOAD_ACCUMULATOR_IMMEDIATE, 0,
        ],
        expectations: {
            zero: true,
        }
    })
    _test_processor('load accumulator (immediate) negative', {
        program: [
            Opcode.LOAD_ACCUMULATOR_IMMEDIATE, -4,
        ],
        expectations: {
            accumulator: 0x100 - 4,
            negative: true,
        }
    })
    _test_processor('load accumulator (zero page) positive', {
        program: [
            Opcode.LOAD_ACCUMULATOR_ZERO_PAGE, 4,
        ],
        state: {
            memory: [4, [123]],
        },
        expectations: {
            accumulator: 123,
        }
    })
    _test_processor('load accumulator (zero page) zero', {
        program: [
            Opcode.LOAD_ACCUMULATOR_ZERO_PAGE, 234,
        ],
        expectations: {
            zero: true,
        }
    })
    _test_processor('load accumulator (zero page) negative', {
        program: [
            Opcode.LOAD_ACCUMULATOR_ZERO_PAGE, 1,
        ],
        state: {
            memory: [1, [-45]],
        },
        expectations: {
            accumulator: 0x100 - 45,
            negative: true,
        }
    })
})

function _test_processor(description: string, arguments_: _TestArguments) {
    test(description, () => {
        const processor = _set_up_processor(arguments_)

        const advance_count = _run_program(processor)

        _check_expectations(processor, advance_count, arguments_.expectations)
    })
}

type _TestArguments = Partial<_Setup> & { expectations: Partial<_Expectations> }

function _set_up_processor(setup: Partial<_Setup>) {
    const complete_start_state = {..._default_setup, ...setup}

    const processor = new Processor()

    _set_start_state(processor, setup.state)
    _set_memory(processor, setup.state?.memory)

    const program = new Uint8Array(complete_start_state.program)
    processor.load_program(program, complete_start_state.program_start)

    return processor
}

function _set_memory(processor: Processor, memory: _Memory | undefined) {
    if (memory !== undefined) {
        const [start_index, values] = memory
        for (var index = 0; index < values.length; ++index) {
            processor.memory[start_index + index] = values[index]
        }
    }
}

function _set_start_state(processor: Processor, setup: Partial<_State>) {
    _set_start_state_property(
        setup?.accumulator,
        accumulator => processor.accumulator._value = accumulator)
    _set_start_state_property(
        setup?.zero,
        zero => processor.status.zero = zero)
    _set_start_state_property(
        setup?.negative,
        negative => processor.status.negative = negative)
    _set_start_state_property(
        setup?.carry,
        carry => processor.status.carry = carry)
}

function _set_start_state_property<T>(property: T | undefined, set: (value: T) => void) {
    if (property !== undefined) {
        set(property)
    }
}

const _default_setup: _Setup = {
    program: [],
    program_start: 0x0200,
    state: {}
}

interface _Setup {
    program: number[],
    program_start: number,
    state: Partial<_State>,
}

function _run_program(processor: Processor) {
    var advance_count = 0

    while (processor.advance()) {
        ++advance_count
    }

    return advance_count
}

function _check_expectations(
    processor: Processor,
    advance_count: number,
    expectations: Partial<_Expectations>)
{
    const expected = {..._default_expectations, ...expectations}
    const actual = {
        advance_count,
        accumulator: processor.accumulator.getValue(),
        zero: processor.status.zero,
        negative: processor.status.negative,
        carry: processor.status.carry,
    }

    expect(actual).toStrictEqual(expected)
}

const _default_expectations: _Expectations = {
    advance_count: 1,
    accumulator: 0,
    zero: false,
    negative: false,
    carry: false,
}

type _Expectations = _State & { advance_count: number }

interface _State {
    accumulator: number,
    zero: boolean,
    negative: boolean,
    carry: boolean,
    memory?: _Memory,
}

type _Memory = [number, number[]]
