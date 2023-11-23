import { Processor } from './processor'
import { compile } from './compiler'

class UI {
	readonly _processor = new Processor()
	readonly _program_start_address = 0x06_00

	readonly _screen_memory_offset = 0x200
	readonly _screen_width = 32
	readonly _screen_height = 32
	readonly _screen = this._get_element("Screen") as HTMLCanvasElement
	readonly _screen_context = this._get_2d_context(this._screen)

	readonly _console = this._get_element("Console") as HTMLTextAreaElement

	readonly _editor = this._get_element("Editor") as HTMLTextAreaElement

	readonly _compile = this._get_element("Compile") as HTMLButtonElement
	readonly _play_pause = this._get_element("PlayPause") as HTMLButtonElement

	readonly _frame_time_length_ms: number = (1000 / 60)

	_running = false

	constructor() {
		this._compile.onclick = () => this._on_compile()
		this._play_pause.onclick = () => this._on_play_pause()
		this._set_running(false)
		this._redraw_screen()
	}

	set_source(source: string) {		
		this._editor.value = source
	}

	_get_element(id: string) {
		return document.getElementById(id) ?? _throwForNull()
	}

	_get_2d_context(canvas: HTMLCanvasElement) {
		return canvas.getContext("2d") ?? _throwForNull()
	}

	_on_compile() {
		const source = this._editor.value

		try {
			this._processor.reset()

			const program = compile(source, this._program_start_address)
			this._processor.load_program(program, this._program_start_address)

			this._append_console(`Compiled ${program.length} bytes`)
		}
		catch (error: any) {
			this._append_console(error.message)
		}

		this._redraw_screen()
	}

	_on_play_pause() {
		const running = !this._running

		this._set_running(running)

		const message = running
			? "Running..."
			: "Paused"
		this._append_console(message)

		if (running) {
			this._run_in_loop()
		}
	}

	_run_in_loop() {
		var proceed = false
		var now = performance.now()
		var next_frame_time = now + this._frame_time_length_ms

		this._redraw_screen()

		while (now < next_frame_time) {
			try {
				proceed = this._processor.advance()
			}
			catch (error: any) {
				this._append_console(error.message)
				return
			}

			if (!proceed) {
				this._append_console("Done")
				this._set_running(false)
				return
			}

			now = performance.now()
		}

		if (this._running) {
			setTimeout(() => this._run_in_loop(), 0)
		}
	}

	_set_running(running: boolean) {
		this._running = running
		this._play_pause.textContent = running
			? String.fromCodePoint(0x23F8)
			: String.fromCodePoint(0x25B6)
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

	_value_to_colour(value: number) {
		const index = (value & 0x0F)
		return "#" + this._colours[index]
	}

	readonly _colours = [
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

	_append_console(output: string) {
		const console_ = this._console
		const separator = console_.value
			? "\n"
			: ""
		console_.value += separator + output
		this._scroll_to_bottom(console_)
	}

	_scroll_to_bottom(text_area: HTMLTextAreaElement) {
		text_area.scrollTop = text_area.scrollHeight
	}
}

function _throwForNull(): never {
	throw new Error("Unexpected null")
}


const ui = new UI()

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
ui.set_source(source)
