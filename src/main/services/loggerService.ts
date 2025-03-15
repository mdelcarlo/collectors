import { BrowserWindow } from 'electron';

export class Logger {
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow?: BrowserWindow) {
    if (mainWindow) {
      this.setMainWindow(mainWindow);
    }
  }

  setMainWindow(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  log(message: string, data?: any) {
    console.log(message, data || '');
    this.sendToRenderer('log', message, data);
  }

  info(message: string, data?: any) {
    console.info(message, data || '');
    this.sendToRenderer('info', message, data);
  }

  warn(message: string, data?: any) {
    console.warn(message, data || '');
    this.sendToRenderer('warn', message, data);
  }

  error(message: string, data?: any) {
    console.error(message, data || '');
    this.sendToRenderer('error', message, data);
  }

  private sendToRenderer(level: string, message: string, data?: any) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    try {
      const logdata = {
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      }
      console.log('Sending log to renderer:', logdata);
      this.mainWindow.webContents.send('log', logdata);
    } catch (error) {
      console.error('Failed to send log to renderer:', error);
    }
  }
}

export const logger = new Logger();