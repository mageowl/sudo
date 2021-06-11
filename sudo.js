/**
 * Insert a string into a string.
 *
 * @param {string} str The original string
 * @param {string} insert The string to insert
 * @param {number} i The index to insert at
 * @return {string}
 */
function insert(str, insert, i) {
	return str.slice(0, i) + insert + str.slice(i);
}

/**
 * Insert an item into an array.
 *
 * @param {array} arr The original array
 * @param {any} insert The item to insert
 * @param {number} i The index to insert at
 * @return {string}
 */
function insertArr(arr, insert, i) {
	return [arr.slice(0, i), insert, arr.slice(i)].flat();
}

/**
 * Delete a charecter from a string
 *
 * @param {string} str
 * @param {number} i
 * @return {string}
 */
function removeChar(str, i) {
	return str.slice(0, i) + str.slice(i + 1);
}

/**
 * Get HTML-safe version of text.
 *
 * @param {string} str
 * @returns {string}
 */
function safe(str) {
	const el = document.createElement("div");
	el.innerText = str;
	let result = el.innerHTML;
	el.remove();
	return result;
}

class SudoEdit extends HTMLElement {
	content = [""];
	cache = null;
	line = 0;
	char = 0;
	leftMargin = null;
	topMargin = null;
	charWidth = null;
	lineHeight = null;

	/**
	 * @type {HTMLSpanElement}
	 *
	 * @memberof SudoEdit
	 */
	cursor = null;
	/**
	 * @type {HTMLDivElement}
	 *
	 * @memberof SudoEdit
	 */
	contentDiv = null;

	constructor() {
		super();

		this.style.display = "block";
		this.style.position = "relative";
		this.style.userSelect = "none";
		this.tabIndex = 0;

		this.cursor = document.createElement("span");
		this.cursor.innerHTML = "&nbsp;";
		this.cursor.style.position = "absolute";
		this.cursor.style.userSelect = "none";
		this.cursor.classList.add("sudo-cursor");
		this.appendChild(this.cursor);

		this.contentDiv = document.createElement("div");
		this.appendChild(this.contentDiv);

		this.addEventListener("keydown", this.keyPress);
		this.addEventListener("click", this.setCursorPos);

		this.updateContent();
	}

	/**
	 * Handle key press
	 *
	 * @param {KeyboardEvent} e
	 * @memberof SudoEdit
	 */
	async keyPress(e) {
		const key = e.key;
		/** @type {"current" | "all" | "cursor"} */
		let update = "current";

		if (key.length === 1 && !e.metaKey) {
			this.content[this.line] = insert(this.content[this.line], key, this.char);
			this.char++;
		} else if (key === "Backspace") {
			this.content[this.line] = e.metaKey
				? this.content[this.line].slice(this.char)
				: removeChar(this.content[this.line], this.char - 1);
			this.char = e.metaKey && this.char !== 0 ? 0 : this.char - 1;
			if (this.char < 0) {
				if (this.line > 0) {
					this.content.splice(this.line, 1);
					this.line--;
					update = "all";
					this.char = this.content[this.line].length;
				} else this.char = 0;
			}
		} else if (key === "ArrowLeft") {
			update = "cursor";
			this.char = e.metaKey ? 0 : this.char - 1;
			if (this.char < 0) {
				this.line--;
				this.char = this.content[this.line].length;
				if (this.line < 0) this.line = 0;
			}
		} else if (key === "ArrowRight") {
			update = "cursor";
			this.char = e.metaKey ? this.content[this.line].length : this.char + 1;
			if (this.char > this.content[this.line].length) {
				this.char = 0;
				this.line++;
				if (this.line > this.content.length - 1) {
					this.line = this.content.length - 1;
					this.char = this.content[this.line].length;
				}
			}
		} else if (key === "ArrowUp") {
			update = "cursor";
			this.line = e.metaKey ? 0 : this.line - 1;

			if (this.line < 0) {
				this.line = 0;
				this.char = 0;
			} else if (this.char > this.content[this.line].length) {
				this.char = this.content[this.line].length;
			}
		} else if (key === "ArrowDown") {
			update = "cursor";
			this.line = e.metaKey ? this.content.length - 1 : this.line + 1;

			if (this.line > this.content.length - 1) {
				this.line = this.content.length - 1;
				this.char = this.content[this.line].length;
			} else if (this.char > this.content[this.line].length) {
				this.char = this.content[this.line].length;
			}
		} else if (key === "Enter") {
			this.line++;
			this.char = 0;
			this.content = insertArr(this.content, "", this.line);
			update = "all";
		} else if (key === "v" && e.metaKey) {
			const text = (await navigator.clipboard.readText()).split("\n");
			text.forEach((txt, i) => {
				this.content[this.line] = insert(
					this.content[this.line],
					txt,
					this.char
				);
				this.char += txt.length;
				if (i < text.length) {
					this.line++;
					this.char = 0;
					this.content = insertArr(this.content, "", this.line);
					update = "all";
				}
			});
		}

		if (update === "current") this.updateContent(this.line);
		else if (update === "cursor") this.updateCursor();
		else if (update === "all") this.updateContent();
	}

	/**
	 * Set cursor position
	 *
	 * @param {MouseEvent} e
	 * @memberof SudoEdit
	 */
	setCursorPos(e) {
		const x = e.clientX + window.scrollX;
		const y = e.clientY + window.scrollY;

		this.line = Math.max(
			Math.min(
				Math.floor((y - this.topMargin) / this.lineHeight),
				this.content.length - 1
			),
			0
		);

		this.char = Math.max(
			Math.min(
				Math.floor((x - this.leftMargin + 2) / this.charWidth),
				this.content[this.line].length
			),
			0
		);

		this.updateCursor();
	}

	formatContent(lines) {
		const result = [
			...(this.cache?.length && lines.length ? this.cache : [""])
		];
		(lines.length
			? lines
			: Object.keys(this.content).map((v) => parseInt(v))
		).forEach((index) => {
			const line = this.content[index];
			result[index] = `<div class="sudo-line" style="height:${
				this.lineHeight
			}px;">${safe(line)}</div>`;
		});

		this.cache = result;

		return result.join("");
	}

	updateProportions() {
		const txt = document.createElement("span");
		txt.innerText = "M";
		this.contentDiv.querySelector(".sudo-line").prepend(txt);
		const rect = txt.getBoundingClientRect();
		const selfRect = this.getBoundingClientRect();
		this.leftMargin = rect.left - selfRect.left;
		this.topMargin = rect.top - selfRect.top;
		this.charWidth = rect.width;
		this.lineHeight = rect.height * this.dataset.lineHeight;
		txt.remove();
	}

	updateCursor() {
		if (this.leftMargin === null) this.updateProportions();
		this.cursor.style.left = `${
			this.char * this.charWidth + this.leftMargin
		}px`;
		this.cursor.style.top = `${this.line * this.lineHeight + this.topMargin}px`;
	}

	updateContent(...lines) {
		this.contentDiv.innerHTML = this.formatContent(lines);
		this.updateCursor();
	}
}

customElements.define("sudo-edit", SudoEdit);
