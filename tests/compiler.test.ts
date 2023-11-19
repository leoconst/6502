import { compile } from '../src/compiler'
import { Opcodes } from '../src/processor'

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
			Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
			0x00,
			Opcodes.STORE_ACCUMULATOR_ZERO_PAGE,
			row_lo,
			Opcodes.STORE_ACCUMULATOR_ZERO_PAGE,
			colour,
			// start:
			Opcodes.CLEAR_CARRY,
			Opcodes.LOAD_Y_IMMEDIATE,
			0x00,
			Opcodes.INCREMENT_ZERO_PAGE,
			colour,
			Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
			screen_start,
			Opcodes.STORE_ACCUMULATOR_ZERO_PAGE,
			row_hi,
			// draw:
			Opcodes.LOAD_ACCUMULATOR_ZERO_PAGE,
			colour,
			Opcodes.STORE_ACCUMULATOR_INDIRECT_Y_INDEXED,
			row_lo,
			Opcodes.TRANSFER_Y_TO_ACCUMULATOR,
			Opcodes.ADD_WITH_CARRY_IMMEDIATE,
			0x01,
			Opcodes.TRANSFER_ACCUMULATOR_TO_Y,
			Opcodes.LOAD_ACCUMULATOR_ZERO_PAGE,
			row_hi,
			Opcodes.ADD_WITH_CARRY_IMMEDIATE,
			0x00,
			Opcodes.COMPARE_IMMEDIATE,
			screen_end,
			Opcodes.BRANCH_IF_EQUAL,
			0x100 - 25,
			Opcodes.STORE_ACCUMULATOR_ZERO_PAGE,
			row_hi,
			Opcodes.JUMP_ABSOLUTE,
			0x0F,
			0x06,
		])

		expect(actual).toStrictEqual(expected)
	})
})

