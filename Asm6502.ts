enum Opcodes {
	BREAK = 0,
	STORE_ACCUMULATOR_ABSOLUTE = 0x8C,
	LOAD_ACCUMULATOR_IMMEDIATE = 0xA9,
}

class Processor {
	memory: Uint8Array = new Uint8Array(0x10000)

	accumulator: Number = 0
	x_register: Number = 0
	y_register: Number = 0

	program_counter = 0x0600

	load_program = function(program: Uint8Array) {
		const program_start = this.program_counter
		for (var index = 0; index < program.length; ++index) {
			this.memory[program_start + index] = program[index]
		}
	}

	advance = function() {
		const op_code = this._next()

		switch (op_code) {
		case Opcodes.BREAK:
			return false
		case Opcodes.LOAD_ACCUMULATOR_IMMEDIATE:
			this.accumulator = this._next()
			break
		case Opcodes.STORE_ACCUMULATOR_ABSOLUTE:
			const address_lo = this._next()
			const address_hi = this._next()
			this.memory[(address_hi * 0x100) + address_lo] = this.accumulator
			break
		default:
			throw new Error(`Unknown opcode (${_hex(op_code)}), terminating program.`)
		}

		return true
	}

	_next = function() {
		const value = this.memory[this.program_counter]
		this.program_counter += 1
		return value
	}
}

class UI {
	_processor = new Processor()

	_screen_memory_offset = 0x200
	_screen_width = 32
	_screen_height = 32
	_screen = document.getElementById("Screen")
	_screen_pixels: Array<HTMLElement> = []

	_console = document.getElementById("Console")

	constructor() {
		this._make_screen()
	}

	_make_screen = function() {
		for (var y = 0; y < this._screen_height; ++y) {
			for (var x = 0; x < this._screen_width; ++x) {
				var pixel = document.createElement("div")
				pixel.style.width = "10px";
				pixel.style.height = "10px";
				pixel.style.backgroundColor = "black"
				pixel.style.display = "inline-block"
				this._screen.appendChild(pixel)
				this._screen_pixels.push(pixel)
			}
			this._screen.appendChild(document.createElement("br"))
		}
	}

	load_program = function() {
		const program = new Uint8Array([
			Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
			0x01,
			Opcodes.STORE_ACCUMULATOR_ABSOLUTE,
			0x00,
			0x02,
			Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
			0x02,
			Opcodes.STORE_ACCUMULATOR_ABSOLUTE,
			0x01,
			0x02,
			Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
			0x03,
			Opcodes.STORE_ACCUMULATOR_ABSOLUTE,
			0x02,
			0x02,

			Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
			0x04,
			Opcodes.STORE_ACCUMULATOR_ABSOLUTE,
			0x04,
			0x02,
			Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
			0x05,
			Opcodes.STORE_ACCUMULATOR_ABSOLUTE,
			0x05,
			0x02,
			Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
			0x06,
			Opcodes.STORE_ACCUMULATOR_ABSOLUTE,
			0x06,
			0x02,

			Opcodes.LOAD_ACCUMULATOR_IMMEDIATE,
			0xFE,
			Opcodes.STORE_ACCUMULATOR_ABSOLUTE,
			0xFF,
			0x05,
		])
		this._processor.load_program(program)
	}

	run = function () {
		_run_loop(this)
	}

	_redraw_screen = function() {
		const memory = this._processor.memory
		for (var i = 0; i < (256 * 4); ++i) {
			const pixel = this._screen_pixels[i]
			const value = memory[this._screen_memory_offset + i]
			pixel.style.backgroundColor = this._value_to_colour(value)
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
		return this._colours[index]
	}

	_append_console = function(output: string) {
		this._console.innerHTML += output + "\n"
	}
}

function _run_loop(ui: UI) {
	var proceed = false

	try {
		proceed = ui._processor.advance()
	}
	catch (error) {
		ui._append_console(error.message)
		return
	}

	ui._redraw_screen()

	if (proceed) {
		setTimeout(function () {
			_run_loop(ui)
		}, 100)
	}
	else {
		ui._append_console("Done.")
	}
}

function _hex(number: number) {
	const raw = number.toString(16).toUpperCase()
	const padded = raw.length % 2 == 0
		? raw
		: '0' + raw
	return "$" + padded
}


const ui = new UI()

ui.load_program()
ui.run()
