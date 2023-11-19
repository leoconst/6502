import { Opcodes } from './processor'

export function compile(source: string, program_start: number) {
	const definitions = new Map<string, string>()
	const labels = new Map<string, number>()
	var program_pointer = program_start

	const program = source
		.split('\n')
		.map((line, index) => [line.trim(), index] as [string, number])
		.filter(line => line[0])
		.map(line_to_op_codes)
		.flat()

	return new Uint8Array(program)

	function line_to_op_codes(line: [string, number]) {
		const [line_text, line_index] = line
		const line_number = line_index + 1

		const words = line_text
			.split(' ')
			.map(part => part.trim())
		var word_index = 0

		const op_codes = get_op_codes()

		if (word_index < words.length) {
			throw line_error("Extra words")
		}

		program_pointer += op_codes.length

		return op_codes

		function get_op_codes() {
			const first_word = next_word()

			if (first_word === "define") {
				const name = next_word()
				const value = next_word()
				definitions.set(name, value)
				return []
			}

			const label = match_group_1(first_word, /([^:]+):/)
			if (label !== null) {
				labels.set(label, program_pointer)
				return []
			}

			const singleton = _singletons.get(first_word)
			if (singleton !== undefined) {
				return [singleton]
			}

			if (first_word === "JMP") {
				const address = get_label_address()
				const [lo, hi] = to_little_endian_bytes(address)
				return [Opcodes.JUMP_ABSOLUTE, lo, hi]
			}
			if (first_word === "BEQ") {
				const target_address = get_label_address()
				const signed_relative_jump_byte = 0x100 - (2 + program_pointer - target_address)
				return [Opcodes.BRANCH_IF_EQUAL, signed_relative_jump_byte]
			}
			if (first_word === "LDA") {
				return addressed({
					immediate: Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
					zero_page: Opcodes.LOAD_ACCUMULATOR_ZERO_PAGE})
			}
			if (first_word === "LDY") {
				return addressed({immediate: Opcodes.LOAD_Y_IMMEDIATE})
			}
			if (first_word === "INC") {
				return addressed({zero_page: Opcodes.INCREMENT_ZERO_PAGE})
			}
			if (first_word === "STA") {
				return addressed({
					zero_page: Opcodes.STORE_ACCUMULATOR_ZERO_PAGE,
					indirect_y_indexed: Opcodes.STORE_ACCUMULATOR_INDIRECT_Y_INDEXED})
			}
			if (first_word === "ADC") {
				return addressed({immediate: Opcodes.ADD_WITH_CARRY_IMMEDIATE})
			}
			if (first_word === "CMP") {
				return addressed({immediate: Opcodes.COMPARE_IMMEDIATE})
			}

			throw line_error("Unknown operator")
		}

		function get_label_address() {
			const location = next_word()
			const address = labels.get(location)
			if (address === undefined) {
				throw line_error(`Label '${location}' not present`)
			}
			return address 
		}

		function addressed(addressingOpcodes: AddressingOpcodes = {}) {
			const second_word = next_word()
			const [op_code, number_string] = address_opcode(second_word, addressingOpcodes)
			return [op_code ?? throw_unsupported_numeric_argument(), parse_number(number_string)]
		}

		function address_opcode(second_word: string, addressingOpcodes: AddressingOpcodes)
				: [Opcodes | undefined, string] {
			const immediate_number_string = match_group_1(second_word, /#(.*)/)
			if (immediate_number_string !== null) {
				return [addressingOpcodes.immediate, immediate_number_string]
			}

			const indirect_y_indexed_number_string = match_group_1(second_word, /\(([^)]*)\),Y/)
			if (indirect_y_indexed_number_string !== null) {
				return [addressingOpcodes.indirect_y_indexed, indirect_y_indexed_number_string]
			}

			return [addressingOpcodes.zero_page, second_word]
		}

		interface AddressingOpcodes {
			immediate?: Opcodes,
			zero_page?: Opcodes,
			indirect_y_indexed?: Opcodes,
		}

		function throw_unsupported_numeric_argument(): Opcodes {
			throw line_error("Numeric argument type not supported")
		}

		function next_word() {
			const word = words[word_index]

			if (word === undefined) {
				throw line_error("Not enough words")
			}

			word_index += 1

			return word
		}

		function line_error(message: string) {
			return new Error(`${message} on line ${line_number}:\n${line_text}`)
		}
	}

	function parse_number(source: string) {
		source = definitions.get(source) ?? source

		const hex_string = match_group_1(source, /\$(.+)/)

		if (hex_string !== null) {
			return parseInt(hex_string, 16)
		}

		return parseInt(source)
	}
}

const _singletons = new Map<string, Opcodes>([
	["CLC", Opcodes.CLEAR_CARRY],
	["TAY", Opcodes.TRANSFER_ACCUMULATOR_TO_Y],
	["TYA", Opcodes.TRANSFER_Y_TO_ACCUMULATOR],
])

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
