import { compile } from '../src/compiler'
import { Processor } from '../src/processor'
import { Opcode } from '../src/opcodes'

describe('Compiler + Processor', () => {
	test('subroutines', () => {
        const program_start = 0x0600

		const source = `\
JSR set_accumulator
JSR set_x
JMP end

set_accumulator:
LDA #$77
RTS

set_x:
LDX #$33
RTS

end:`
        const program = compile(source, program_start)

        const processor = new Processor()
        processor.load_program(program, program_start)

        while (processor.advance())
        { }

        expect(processor.accumulator.getValue()).toBe(0x77)
    	expect(processor.x.getValue()).toBe(0x33)
	})
})