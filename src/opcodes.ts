export enum Opcode {
	BREAK = 0x00,
	CLEAR_CARRY = 0x18,
	JUMP_TO_SUBROUTINE = 0x20,
	JUMP_ABSOLUTE = 0x4C,
	RETURN_FROM_SUBROUTINE = 0x60,
	ADD_WITH_CARRY_IMMEDIATE = 0x69,
	STORE_ACCUMULATOR_ZERO_PAGE = 0x85,
	DECREMENT_Y = 0x88,
	STORE_ACCUMULATOR_ABSOLUTE = 0x8D,
	STORE_ACCUMULATOR_INDIRECT_Y_INDEXED = 0x91,
	TRANSFER_Y_TO_ACCUMULATOR = 0x98,
	STORE_ACCUMULATOR_ABSOLUTE_Y_INDEXED = 0x99,
	LOAD_Y_IMMEDIATE = 0xA0,
	LOAD_X_IMMEDIATE = 0xA2,
	LOAD_ACCUMULATOR_ZERO_PAGE = 0xA5,
	TRANSFER_ACCUMULATOR_TO_Y = 0xA8,
	LOAD_ACCUMULATOR_IMMEDIATE = 0xA9,
	INCREMENT_Y = 0xC8,
	COMPARE_IMMEDIATE = 0xC9,
	BRANCH_IF_NOT_EQUAL = 0xD0,
	COMPARE_X_IMMEDIATE = 0xE0,
	INCREMENT_ZERO_PAGE = 0xE6,
	INCREMENT_X = 0xE8,
	NO_OPERATION = 0xEA,
	BRANCH_IF_EQUAL = 0xF0,
}
