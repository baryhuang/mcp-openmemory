export class Logger {
  constructor(name) {
    this.name = name;
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : '';
    return `${timestamp} - ${this.name} - ${level} - ${message}${formattedArgs}`;
  }

  info(message, ...args) {
    console.error(this.formatMessage('INFO', message, ...args));
  }

  warn(message, ...args) {
    console.error(this.formatMessage('WARN', message, ...args));
  }

  error(message, ...args) {
    console.error(this.formatMessage('ERROR', message, ...args));
  }

  debug(message, ...args) {
    if (process.env.DEBUG === 'true' || process.env.LOG_LEVEL === 'debug') {
      console.error(this.formatMessage('DEBUG', message, ...args));
    }
  }
} 