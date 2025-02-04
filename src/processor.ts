import { Opcode } from './opcodes'

export class Processor {
	readonly memory: Uint8Array = new Uint8Array(0x10000)

	readonly status: Status = new Status()

	readonly accumulator: Register = new Register(this.status)
	readonly x: Register = new Register(this.status)
	readonly y: Register = new Register(this.status)

	readonly stack: Stack = new Stack(this.memory)

	program_counter = 0

	load_program(program: Uint8Array, program_start: number) {
		this.memory.set(program, program_start)
		this.program_counter = program_start
	}

	reset() {
		this.memory.fill(0)
	}

	advance() {
		const opcode = this._next()

		switch (opcode) {
		case Opcode.BREAK:
			return false
		case Opcode.CLEAR_CARRY:
			this.status.carry = false
			break
		case Opcode.JUMP_TO_SUBROUTINE: {
			const return_address = this.program_counter + 2
			const [return_address_lo, return_address_hi] = this._8_bit(return_address)
			this.stack.push(return_address_hi)
			this.stack.push(return_address_lo)
			this.program_counter = this._absolute_address()
			break
		}
		case Opcode.JUMP_ABSOLUTE:
			this.program_counter = this._absolute_address()
			break
		case Opcode.RETURN_FROM_SUBROUTINE: {
			const return_address_lo = this.stack.pop()
			const return_address_hi = this.stack.pop()
			const return_address = this._16_bit(return_address_lo, return_address_hi)
			this.program_counter = return_address
			break
		}
		case Opcode.ADD_WITH_CARRY_IMMEDIATE:
			this._add_with_carry(this._next())
			break
		case Opcode.STORE_ACCUMULATOR_ZERO_PAGE:
			this._store(this.accumulator, this._zero_page_address())
			break
		case Opcode.STORE_X_ZERO_PAGE:
			this._store(this.x, this._zero_page_address())
			break
		case Opcode.DECREMENT_Y:
			this._decrement_register(this.y)
			break
		case Opcode.STORE_ACCUMULATOR_ABSOLUTE:
			this._store(this.accumulator, this._absolute_address())
			break
		case Opcode.STORE_ACCUMULATOR_INDIRECT_Y_INDEXED:
			this._store(this.accumulator, this._indirect_y_indexed_address())
			break
		case Opcode.TRANSFER_Y_TO_ACCUMULATOR:
			this._transfer(this.y, this.accumulator)
			break
		case Opcode.STORE_ACCUMULATOR_ABSOLUTE_Y_INDEXED:
			this._store(this.accumulator, this._absolute_y_indexed_address())
			break
		case Opcode.LOAD_Y_IMMEDIATE:
			this._load_immediate(this.y)
			break
		case Opcode.LOAD_X_IMMEDIATE:
			this._load_immediate(this.x)
			break
		case Opcode.LOAD_Y_ZERO_PAGE:
			this._load_zero_page(this.y)
			break
		case Opcode.LOAD_ACCUMULATOR_ZERO_PAGE:
			this._load_zero_page(this.accumulator)
			break
		case Opcode.TRANSFER_ACCUMULATOR_TO_Y:
			this._transfer(this.accumulator, this.y)
			break
		case Opcode.LOAD_ACCUMULATOR_IMMEDIATE:
			this._load_immediate(this.accumulator)
			break
		case Opcode.COMPARE_Y_IMMEDIATE:
			this._compare_immediate(this.y)
			break
		case Opcode.DECREMENT_ZERO_PAGE:
			this._decrement_memory(this._zero_page_address())
			break
		case Opcode.INCREMENT_Y:
			this._increment_register(this.y)
			break
		case Opcode.COMPARE_IMMEDIATE:
			this._compare_immediate(this.accumulator)
			break
		case Opcode.BRANCH_IF_NOT_EQUAL:
			this._branch_if(!this.status.zero)
			break
		case Opcode.COMPARE_INDIRECT_Y_INDEXED:
			this._compare(this.accumulator, this._indirect_y_indexed_address())
			break
		case Opcode.COMPARE_X_IMMEDIATE:
			this._compare_immediate(this.x)
			break
		case Opcode.INCREMENT_ZERO_PAGE:
			this._increment_memory(this._zero_page_address())
			break
		case Opcode.INCREMENT_X:
			this._increment_register(this.x)
			break
		case Opcode.NO_OPERATION:
			// TODO: Cycle simulation
			break
		case Opcode.BRANCH_IF_EQUAL:
			this._branch_if(this.status.zero)
			break
		default:
			throw new Error(`Unknown opcode (${_hex(opcode)}), terminating program.`)
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
			this.program_counter += this._from_twos_compliment(relative_jump) + 1
		}
	}

	_compare_immediate(register: Register) {
		const value = this._next()
		this._compare(register, value)
	}

	_compare(register: Register, value: number) {
		// TODO: Set all relevant status flags
		this.status.zero = register.getValue() == value
	}

	_from_twos_compliment(value: number) {
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

	_decrement_memory(address: number) {
		this.memory[address] -= 1
	}

	_load_immediate(register: Register) {
		register.set(this._next())
	}

	_load_zero_page(register: Register) {
		const address = this._zero_page_address()
		this._load_from_address(register, address)
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

	_8_bit(value: number) {
		const lo = value & 0xFF
		const hi = value >> 8
		return [lo, hi]
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

class Stack {
	readonly _memory: Uint8Array

	pointer = 0x01_FF

	constructor(memory: Uint8Array) {
		this._memory = memory
	}

	push(value: number) {
		this._memory[this.pointer] = value
		++this.pointer
	}

	pop() {
		--this.pointer
		return this._memory[this.pointer]
	}
}

function _hex(number: number) {
	const raw = number.toString(16).toUpperCase()
	const padded = raw.length % 2 == 0
		? raw
		: '0' + raw
	return "$" + padded
}
