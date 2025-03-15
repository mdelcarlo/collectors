/**
 * Logger utility that works with Electron's contextBridge
 */

/**
 * Log a message - writes to console and to main process
 */
export function log(message: string): void {
    console.log(message);
    if (window.electronAPI?.logger?.log) {
      window.electronAPI.logger.log(message);
    }
  }
  
  /**
   * Log an error - writes to console and to main process
   */
  export function error(message: string | Error): void {
    const errorMessage = message instanceof Error ? message.message : message;
    console.error(errorMessage);
    if (window.electronAPI?.logger?.error) {
      window.electronAPI.logger.error(errorMessage);
    }
  }
  
  /**
   * Log info - writes to console and to main process
   */
  export function info(message: string): void {
    console.info(message);
    if (window.electronAPI?.logger?.info) {
      window.electronAPI.logger.info(message);
    }
  }
  
  /**
   * Log warning - writes to console and to main process
   */
  export function warn(message: string): void {
    console.warn(message);
    if (window.electronAPI?.logger?.warn) {
      window.electronAPI.logger.warn(message);
    }
  }
  
  // Export default logger object
  export default {
    log,
    error,
    info,
    warn
  };