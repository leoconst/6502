export enum Opcodes {
	BREAK = 0x00,
	CLEAR_CARRY = 0x18,
	JUMP_ABSOLUTE = 0x4C,
	ADD_WITH_CARRY_IMMEDIATE = 0x69,
	STORE_ACCUMULATOR_ZERO_PAGE = 0x85,
	DECREMENT_Y = 0x88,
	STORE_ACCUMULATOR_ABSOLUTE = 0x8D,
	STORE_ACCUMULATOR_INDIRECT_Y_INDEXED = 0x91,
	TRANSFER_Y_TO_ACCUMULATOR = 0x98,
	STORE_ACCUMULATOR_ABSOLUTE_Y_INDEXED = 0x99,
	LOAD_Y_IMMEDIATE = 0xA0,
	LOAD_ACCUMULATOR_ZERO_PAGE = 0xA5,
	TRANSFER_ACCUMULATOR_TO_Y = 0xA8,
	LOAD_ACCUMULATOR_IMMEDIATE = 0xA9,
	INCREMENT_Y = 0xC8,
	COMPARE_IMMEDIATE = 0xC9,
	INCREMENT_ZERO_PAGE = 0xE6,
	BRANCH_IF_EQUAL = 0xF0,
}

export class Processor {
	readonly memory: Uint8Array = new Uint8Array(0x10000)

	readonly status: Status = new Status()

	readonly accumulator: Register = new Register(this.status)
	readonly x: Register = new Register(this.status)
	readonly y: Register = new Register(this.status)

	program_counter = 0x0600

	load_program(program: Uint8Array) {
		const program_start = this.program_counter
		for (var index = 0; index < program.length; ++index) {
			this.memory[program_start + index] = program[index]
		}
	}

	advance() {
		const op_code = this._next()

		switch (op_code) {
		case Opcodes.BREAK:
			return false
		case Opcodes.CLEAR_CARRY:
			this.status.carry = false
			break
		case Opcodes.JUMP_ABSOLUTE:
			this.program_counter = this._absolute_address()
			break
		case Opcodes.ADD_WITH_CARRY_IMMEDIATE:
			this._add_with_carry(this._next())
			break
		case Opcodes.STORE_ACCUMULATOR_ZERO_PAGE:
			this._store(this.accumulator, this._zero_page_address())
			break
		case Opcodes.DECREMENT_Y:
			this._decrement_register(this.y)
			break
		case Opcodes.STORE_ACCUMULATOR_ABSOLUTE:
			this._store(this.accumulator, this._absolute_address())
			break
		case Opcodes.STORE_ACCUMULATOR_INDIRECT_Y_INDEXED:
			this._store(this.accumulator, this._indirect_y_indexed_address())
			break
		case Opcodes.TRANSFER_Y_TO_ACCUMULATOR:
			this._transfer(this.y, this.accumulator)
			break
		case Opcodes.STORE_ACCUMULATOR_ABSOLUTE_Y_INDEXED:
			this._store(this.accumulator, this._absolute_y_indexed_address())
			break
		case Opcodes.LOAD_Y_IMMEDIATE:
			this._load_immediate(this.y)
			break
		case Opcodes.LOAD_ACCUMULATOR_ZERO_PAGE:
			this._load_from_address(this.accumulator, this._zero_page_address())
			break
		case Opcodes.TRANSFER_ACCUMULATOR_TO_Y:
			this._transfer(this.accumulator, this.y)
			break
		case Opcodes.LOAD_ACCUMULATOR_IMMEDIATE:
			this._load_immediate(this.accumulator)
			break
		case Opcodes.INCREMENT_Y:
			this._increment_register(this.y)
			break
		case Opcodes.COMPARE_IMMEDIATE:
			// TODO: Set all relevant status flags
			this.status.zero = this.accumulator.getValue() == this._next()
			break
		case Opcodes.INCREMENT_ZERO_PAGE:
			this._increment_memory(this._zero_page_address())
			break
		case Opcodes.BRANCH_IF_EQUAL:
			this._branch_if(this.status.zero)
			break
		default:
			throw new Error(`Unknown opcode (${_hex(op_code)}), terminating program.`)
		}

		return true
	}

	_add_with_carry(value: number) {
		const sum = this.accumulator.getValue()
			+ value
			+ this._boolean_to_integer(this.status.carry)
		this.status.carry = sum > 0xFF
		this.accumulator.set(sum)
	}

	_boolean_to_integer(value: boolean) {
		return value
			? 1
			: 0
	}

	_branch_if(condition: boolean) {
		const relative_jump = this._next()
		if (condition) {
			this.program_counter += this._twos_compliment(relative_jump) + 1
		}
	}

	_twos_compliment(value: number) {
		return value > 0x7F
			? -0x100 + value
			: value
	}

	_increment_register(register: Register) {
		register.set(register.getValue() + 1)
	}

	_decrement_register(register: Register) {
		register.set(register.getValue() - 1)
	}

	_increment_memory(address: number) {
		this.memory[address] += 1
	}

	_load_immediate(register: Register) {
		register.set(this._next())
	}

	_load_from_address(register: Register, address: number) {
		register.set(this.memory[address])
	}

	_store(register: Register, address: number) {
		this.memory[address] = register.getValue()
	}

	_transfer(from: Register, to: Register) {
		to.set(from.getValue())
	}

	_zero_page_address() {
		return this._next()
	}

	_absolute_address() {
		const lo = this._next()
		const hi = this._next()
		return this._16_bit(lo, hi)
	}

	_absolute_y_indexed_address() {
		return this._absolute_address() + this.y.getValue()
	}

	_indirect_y_indexed_address() {
		const lo_address = this._next()
		const hi_address = lo_address + 1
		const lo = this.memory[lo_address]
		const hi = this.memory[hi_address]
		return this._16_bit(lo, hi) + this.y.getValue()
	}

	_16_bit(lo: number, hi: number) {
		return (hi * 0x100) + lo
	}

	_next() {
		const value = this.memory[this.program_counter]
		this.program_counter += 1
		return value
	}
}

class Register {
	readonly _status: Status

	_value: number = 0

	constructor(status: Status) {
		this._status = status
	}

	getValue() {
		return this._value
	}

	set(value: number) {
		const clamped = this._clamp_byte(value)

		this._status.negative = clamped > 0x7F
		this._status.zero = clamped == 0

		this._value = clamped
	}

	_clamp_byte(value: number) {
		return value & 0xFF
	}
}

class Status {
	negative: boolean = false
	zero: boolean = false
	carry: boolean = false
}

function _hex(number: number) {
	const raw = number.toString(16).toUpperCase()
	const padded = raw.length % 2 == 0
		? raw
		: '0' + raw
	return "$" + padded
}
