enum Opcodes {
	BREAK = 0x00,
	JUMP_ABSOLUTE = 0x4C,
	STORE_ACCUMULATOR_ABSOLUTE = 0x8C,
	STORE_ACCUMULATOR_ABSOLUTE_Y_INDEXED = 0x99,
	LOAD_Y_IMMEDIATE = 0xA0,
	LOAD_ACCUMULATOR_IMMEDIATE = 0xA9,
	INCREMENT_Y = 0xC8,
}

class Processor {
	memory: Uint8Array = new Uint8Array(0x10000)

	accumulator: number = 0
	x_register: number = 0
	y_register: number = 0

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
		case Opcodes.JUMP_ABSOLUTE:
			this.program_counter = this._16_bit(this._next(), this._next())
			break
		case Opcodes.STORE_ACCUMULATOR_ABSOLUTE:
			this._store(this.accumulator, this._next(), this._next())
			break
		case Opcodes.STORE_ACCUMULATOR_ABSOLUTE_Y_INDEXED:
			this._store(this.accumulator, this.y_register, this._next())
			break
		case Opcodes.LOAD_Y_IMMEDIATE:
			this.y_register = this._next()
			break
		case Opcodes.LOAD_ACCUMULATOR_IMMEDIATE:
			this.accumulator = this._next()
			break
		case Opcodes.INCREMENT_Y:
			this.y_register = this.y_register == 255
				? 0
				: this.y_register + 1
			break
		default:
			throw new Error(`Unknown opcode (${_hex(op_code)}), terminating program.`)
		}

		return true
	}

	_store(value: number, lo: number, hi: number) {
		this.memory[this._16_bit(lo, hi)] = value
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

class UI {
	_processor: Processor = new Processor()

	_screen_memory_offset: number = 0x200
	_screen_width: number = 32
	_screen_height: number = 32
	_screen = document.getElementById("Screen") as HTMLCanvasElement ?? _throwForNull()
	_screen_context: CanvasRenderingContext2D = this._screen.getContext("2d") ?? _throwForNull()

	_console: HTMLElement = document.getElementById("Console") ?? _throwForNull()

	_frame_time_length_ms: number = (1000 / 60)

	load_program() {
		const program = new Uint8Array([
			Opcodes.LOAD_Y_IMMEDIATE,
			0x00,
			Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
			0x00,
			Opcodes.STORE_ACCUMULATOR_ABSOLUTE_Y_INDEXED,
			0x02,
			Opcodes.INCREMENT_Y,
			Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
			0x03,
			Opcodes.STORE_ACCUMULATOR_ABSOLUTE_Y_INDEXED,
			0x02,
			Opcodes.JUMP_ABSOLUTE,
			0x02,
			0x06,
		])
		this._processor.load_program(program)
	}

	run() {
		var proceed = false
		var now = performance.now()
		var next_frame_time = now - (now % this._frame_time_length_ms) + this._frame_time_length_ms

		while (true) {
			try {
				proceed = this._processor.advance()
			}
			catch (error: any) {
				this._append_console(error.message)
				return
			}

			this._redraw_screen()

			if (!proceed) {
				this._append_console("Done")
				return
			}

			if (performance.now() > next_frame_time) {
				setTimeout(() => this.run(), 0)
				return
			}
		}
	}

	_redraw_screen() {
		const canvas_width = this._screen.width
		const canvas_height = this._screen.height

		const cell_width = canvas_width / this._screen_height
		const cell_height = canvas_height / this._screen_height

		const context = this._screen_context
		const memory = this._processor.memory

		var screen_pointer = this._screen_memory_offset

		for (var y_index = 0; y_index < this._screen_height; ++y_index) {
			const y_position = y_index*cell_height
			for (var x_index = 0; x_index < this._screen_width; ++x_index) {
				const value = memory[screen_pointer]
				const x_position = x_index*cell_width
				context.fillStyle = this._value_to_colour(value)
				context.fillRect(x_position, y_position, cell_width, cell_height)
				screen_pointer += 1
			}
		}
	}

	_colours = [
		"000000", // Black
		"FFFFFF", // White
		"880000", // Red
		"AAFFEE", // Cyan
		"CC44CC", // Violet / Purple
		"00CC55", // Green
		"0000AA", // Blue
		"EEEE77", // Yellow
		"DD8855", // Orange
		"664400", // Brown
		"FF7777", // Lightish red
		"333333", // Dark gray / Gray 1
		"777777", // Gray 2
		"AAFF66", // Light green
		"0088FF", // Light blue
		"BBBBBB", // Light gray / Gray 3
	]

	_value_to_colour(value: number) {
		const index = (value & 0x0F)
		return "#" + this._colours[index]
	}

	_append_console(output: string) {
		this._console.innerHTML += output + "\n"
	}
}

function _hex(number: number) {
	const raw = number.toString(16).toUpperCase()
	const padded = raw.length % 2 == 0
		? raw
		: '0' + raw
	return "$" + padded
}

function _throwForNull(): never {
	throw new Error("Unexpected null")
}


const ui = new UI()

ui.load_program()
ui.run()
