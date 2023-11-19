import { compile } from '../src/compiler'
import { Opcode } from '../src/opcodes'

describe('Compiler', () => {
	test('long program', () => {
		const source = `\
define row_lo $00
define row_hi $01
define colour $02

define screen_start $02
define screen_end $06

LDA #$00
STA row_lo
STA colour

start:
CLC
LDY #$00
INC colour
LDA #screen_start
STA row_hi

draw:
LDA colour
STA (row_lo),Y
TYA
ADC #$01
TAY
LDA row_hi
ADC #$00
CMP #screen_end
BEQ start
STA row_hi

JMP draw`

		const actual = compile(source, 0x600)

		const row_lo = 0x00
		const row_hi = 0x01
		const colour = 0x02

		const screen_start = 0x02
		const screen_end = 0x06

		const expected = new Uint8Array([
			Opcode.LOAD_ACCUMULATOR_IMMEDIATE,
			0x00,
			Opcode.STORE_ACCUMULATOR_ZERO_PAGE,
			row_lo,
			Opcode.STORE_ACCUMULATOR_ZERO_PAGE,
			colour,
			// start:
			Opcode.CLEAR_CARRY,
			Opcode.LOAD_Y_IMMEDIATE,
			0x00,
			Opcode.INCREMENT_ZERO_PAGE,
			colour,
			Opcode.LOAD_ACCUMULATOR_IMMEDIATE,
			screen_start,
			Opcode.STORE_ACCUMULATOR_ZERO_PAGE,
			row_hi,
			// draw:
			Opcode.LOAD_ACCUMULATOR_ZERO_PAGE,
			colour,
			Opcode.STORE_ACCUMULATOR_INDIRECT_Y_INDEXED,
			row_lo,
			Opcode.TRANSFER_Y_TO_ACCUMULATOR,
			Opcode.ADD_WITH_CARRY_IMMEDIATE,
			0x01,
			Opcode.TRANSFER_ACCUMULATOR_TO_Y,
			Opcode.LOAD_ACCUMULATOR_ZERO_PAGE,
			row_hi,
			Opcode.ADD_WITH_CARRY_IMMEDIATE,
			0x00,
			Opcode.COMPARE_IMMEDIATE,
			screen_end,
			Opcode.BRANCH_IF_EQUAL,
			0x100 - 25,
			Opcode.STORE_ACCUMULATOR_ZERO_PAGE,
			row_hi,
			Opcode.JUMP_ABSOLUTE,
			0x0F,
			0x06,
		])

		expect(actual).toStrictEqual(expected)
	})
})

