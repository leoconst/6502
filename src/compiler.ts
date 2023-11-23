import { Opcode } from './opcodes'

export function compile(source: string, program_start: number) {
	const state = new State(program_start)

	const program = source
		.split('\n')
		.map((text, index) => _make_raw_line(text, index))
		.filter(line => line.clean_text)
		.map(line => _line_to_opcodes(line, state))
		.flat()

	return new Uint8Array(program)
}

function _make_raw_line(original_text: string, index: number) {
	const clean_text = original_text.split(";")[0].trim()
	return {
		original_text,
		clean_text,
		index
	}
}

function _line_to_opcodes(raw_line: RawLine, state: State) {
	const line = new Line(raw_line)

	const opcodes = _get_opcodes(line, state)

	if (line.extra_words()) {
		throw line.error("Extra words")
	}

	state.increment_program_pointer(opcodes.length)

	return opcodes
}

function _get_opcodes(line: Line, state: State) {
	const first_word = line.next_word()

	if (first_word === "define") {
		const name = line.next_word()
		const value = line.next_word()
		state.define(name, value)
		return []
	}

	const label = match_group_1(first_word, /([^:]+):/)
	if (label !== null) {
		state.add_label(label)
		return []
	}

	const singleton = _singletons.get(first_word)
	if (singleton !== undefined) {
		return [singleton]
	}

	if (first_word === "JMP") {
		const address = _get_label_address(line, state)
		const [lo, hi] = to_little_endian_bytes(address)
		return [Opcode.JUMP_ABSOLUTE, lo, hi]
	}
	if (first_word === "BEQ") {
		const target_address = _get_label_address(line, state)
		const execution_length = 2
		const address_after_execution = state.get_program_pointer() + execution_length
		const address_diff = target_address - address_after_execution
		const signed_relative_jump_byte = _to_twos_compliment(address_diff)
		return [Opcode.BRANCH_IF_EQUAL, signed_relative_jump_byte]
	}
	if (first_word === "LDA") {
		return _addressed(line, state, {
			immediate: Opcode.LOAD_ACCUMULATOR_IMMEDIATE,
			zero_page: Opcode.LOAD_ACCUMULATOR_ZERO_PAGE})
	}
	if (first_word === "LDY") {
		return _addressed(line, state, {
			immediate: Opcode.LOAD_Y_IMMEDIATE})
	}
	if (first_word === "INC") {
		return _addressed(line, state, {
			zero_page: Opcode.INCREMENT_ZERO_PAGE})
	}
	if (first_word === "STA") {
		return _addressed(line, state, {
			zero_page: Opcode.STORE_ACCUMULATOR_ZERO_PAGE,
			indirect_y_indexed: Opcode.STORE_ACCUMULATOR_INDIRECT_Y_INDEXED})
	}
	if (first_word === "ADC") {
		return _addressed(line, state, {
			immediate: Opcode.ADD_WITH_CARRY_IMMEDIATE})
	}
	if (first_word === "CMP") {
		return _addressed(line, state, {
			immediate: Opcode.COMPARE_IMMEDIATE})
	}

	throw line.error("Unknown operator")
}

function _to_twos_compliment(value: number) {
	return value < 0
		? 0x100 + value
		: value
}

const _singletons = new Map<string, Opcode>([
	["CLC", Opcode.CLEAR_CARRY],
	["TAY", Opcode.TRANSFER_ACCUMULATOR_TO_Y],
	["TYA", Opcode.TRANSFER_Y_TO_ACCUMULATOR],
	["INY", Opcode.INCREMENT_Y]
])

function _get_label_address(line: Line, state: State) {
	const name = line.next_word()
	const address = state.get_label(name)

	if (address === undefined) {
		throw line.error(`Label '${name}' not present`)
	}

	return address 
}

function _addressed(line: Line, state: State, opcodes: AddressingOpcodes = {}) {
	const second_word = line.next_word()
	const [opcode, number_string] = _address_opcode(second_word, opcodes)

	if (opcode === undefined) {
		throw line.error("Numeric argument type not supported")
	}

	const value = _parse_number(number_string, state)
	return [opcode, value]
}

function _address_opcode(second_word: string, opcodes: AddressingOpcodes)
		: [Opcode | undefined, string] {
	const immediate_number_string = match_group_1(second_word, /#(.*)/)
	if (immediate_number_string !== null) {
		return [opcodes.immediate, immediate_number_string]
	}

	const indirect_y_indexed_number_string = match_group_1(second_word, /\(([^)]*)\),Y/)
	if (indirect_y_indexed_number_string !== null) {
		return [opcodes.indirect_y_indexed, indirect_y_indexed_number_string]
	}

	return [opcodes.zero_page, second_word]
}

interface AddressingOpcodes {
	immediate?: Opcode,
	zero_page?: Opcode,
	indirect_y_indexed?: Opcode,
}

function _parse_number(source: string, state: State) {
	source = state.get_definition(source) ?? source

	const hex_string = match_group_1(source, /\$(.+)/)

	if (hex_string !== null) {
		return parseInt(hex_string, 16)
	}

	return parseInt(source)
}

class State {
	readonly _definitions = new Map<string, string>()
	readonly _labels = new Map<string, number>()

	_program_pointer: number

	constructor(program_pointer: number) {
		this._program_pointer = program_pointer
	}

	define(name: string, value: string) {
		this._definitions.set(name, value)
	}

	get_definition(name: string) {
		return this._definitions.get(name)
	}

	add_label(name: string) {
		this._labels.set(name, this._program_pointer)
	}

	get_label(name: string) {
		return this._labels.get(name)
	}

	increment_program_pointer(increment: number) {
		this._program_pointer += increment
	}

	get_program_pointer() {
		return this._program_pointer
	}
}

class Line {
	readonly _original_text
	readonly _index
	readonly _words

	_word_index = 0

	constructor(raw_line: RawLine) {
		this._original_text = raw_line.original_text
		this._index = raw_line.index
		this._words = raw_line.clean_text
			.split(/\s+/)
			.map(part => part.trim())
	}

	next_word() {
		const word = this._words[this._word_index]

		if (word === undefined) {
			throw this.error("Not enough words")
		}

		this._word_index += 1

		return word
	}

	extra_words() {
		return this._word_index < this._words.length
	}

	error(message: string) {
		const line_number = this._index + 1
		return new Error(`${message} on line ${line_number}:\n${this._original_text}`)
	}
}

function to_little_endian_bytes(value: number) {
	return [value & 0xFF, value >> 8]
}

function match_group_1(string: string, regex: RegExp) {
	const match = string.match(regex)

	if (match === null) {
		return null
	}

	const group_1 = match[1]

	if (group_1 == undefined) {
		throw new Error("No group in match")
	}

	return group_1
}

interface RawLine {
	original_text: string,
	clean_text: string
	index: number,
}
