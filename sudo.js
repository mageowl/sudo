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

class SudoEdit extends HTMLElement {
	content = [""];
	cache = null;
	line = 0;
	char = 0;
	leftMargin = null;

	/**
	 * @type {HTMLSpanElement}
	 *
	 * @memberof SudoEdit
	 */
	cursor = null;
	contentDiv = null;

	constructor() {
		super();

		this.style.display = "block";
		this.style.position = "relative";
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

		this.updateContent();
	}

	keyPress(e) {
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
		}

		if (update === "current") this.updateContent(this.line);
		else if (update === "cursor") this.updateCursor();
		else if (update === "all") this.updateContent();
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
			result[
				index
			] = `<div class="sudo-line" style="height:${this.dataset.lineHeight}em;">${line}</div>`;
		});

		this.cache = result;

		return result.join("");
	}

	updateMargin() {
		const txt = document.createElement("span");
		this.contentDiv.querySelector(".sudo-line").appendChild(txt);
		this.leftMargin =
			txt.getBoundingClientRect().left - this.getBoundingClientRect().left;
		this.topMargin =
			txt.getBoundingClientRect().top - this.getBoundingClientRect().top;
		txt.remove();
	}

	updateCursor() {
		if (this.leftMargin === null) this.updateMargin();
		this.cursor.style.left = `calc(${this.char * 0.615}em + ${
			this.leftMargin
		}px)`;
		this.cursor.style.top = `calc(${this.line * this.dataset.lineHeight}em + ${
			this.topMargin
		}px)`;
	}

	updateContent(...lines) {
		this.contentDiv.innerHTML = this.formatContent(lines);
		this.updateCursor();
	}
}

customElements.define("sudo-edit", SudoEdit);
