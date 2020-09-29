const colorCodes =
{
    "red": "31",
    "green": "32",
    "yellow": "33",
    "blue": "34",
    "magenta": "35",
    "cyan": "36",
    "white": "37",
    "grey": "90",
    "bRed": "91",
    "bGreen": "92",
    "bYellow": "93",
    "bCyan": "96",
    "bWhite": "97"
}

global[`Debugger`] = class {
    timestamp = 0n;
    _log(args, color) {
        process.stdout.write(`\x1b[${color}m[DEBUG]:\x1b[0m `);
        console.log(...args);
    }
    startTime() {
        this.timestamp = process.hrtime.bigint();
    }
    endTime() {
        const e = process.hrtime.bigint();
        const s = this.timestamp;
        return Number(e - s)/1e+6;
    }
    endTimemS() {
        const e = process.hrtime.bigint();
        const s = this.timestamp;
        return Number(e - s)/1000;
    }
    info(...args) {
        this._log(args, colorCodes.bCyan);
    }
    warn(...args) {
        this._log(args, colorCodes.bYellow);
    }
    error(...args) {
        this._log(args, colorCodes.bRed);
    }
    success(...args) {
        this._log(args, colorCodes.bGreen);
    }
    auto(...args) {
        if (args[0] instanceof Error) {
            this._log(args, colorCodes.bRed);
        }
        else {
            this._log(args, colorCodes.bCyan);
        }
    }
    setTerminalHeader(title) {
        process.stdout.write(String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7));
    }
    clearTerminal() {
        console.clear();
    }
}