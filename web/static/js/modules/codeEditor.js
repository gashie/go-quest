export class CodeEditor {
    constructor(elementId, options = {}) {
        const el = document.getElementById(elementId);
        if (!el) return;

        this.editor = CodeMirror(el, {
            mode: options.mode || 'text/x-go',
            theme: options.theme || 'dracula',
            lineNumbers: true,
            tabSize: 4,
            indentWithTabs: true,
            value: options.initialValue || '',
            readOnly: options.readOnly || false,
            lineWrapping: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            viewportMargin: Infinity,
        });
    }

    getValue() {
        return this.editor ? this.editor.getValue() : '';
    }

    setValue(code) {
        if (this.editor) this.editor.setValue(code);
    }

    onChange(callback) {
        if (this.editor) this.editor.on('change', callback);
    }

    focus() {
        if (this.editor) this.editor.focus();
    }

    refresh() {
        if (this.editor) {
            setTimeout(() => this.editor.refresh(), 10);
        }
    }
}
