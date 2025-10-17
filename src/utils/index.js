const fs = require('fs-extra');
const path = require('path');

// Utility functions for file operations
class FileUtils {
  // Ensure directory exists
  static async ensureDir(dirPath) {
    await fs.ensureDir(dirPath);
  }
  
  // Write file with proper encoding
  static async writeFile(filePath, content, encoding = 'utf8') {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, encoding);
  }
  
  // Read file with proper encoding
  static async readFile(filePath, encoding = 'utf8') {
    return await fs.readFile(filePath, encoding);
  }
  
  // Remove directory recursively
  static async removeDir(dirPath) {
    await fs.remove(dirPath);
  }
  
  // Check if file exists
  static async fileExists(filePath) {
    return await fs.pathExists(filePath);
  }
  
  // Get file stats
  static async getStats(filePath) {
    return await fs.stat(filePath);
  }
}

// Utility functions for data processing
class DataUtils {
  // Parse data URI
  static parseDataUri(dataUri) {
    const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid data URI format');
    }
    
    return {
      mimeType: matches[1],
      data: Buffer.from(matches[2], 'base64')
    };
  }
  
  // Generate unique identifier
  static generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  
  // Sanitize filename
  static sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
  
  // Validate URL
  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

// Utility functions for time operations
class TimeUtils {
  // Get current timestamp
  static getTimestamp() {
    return new Date().toISOString();
  }
  
  // Sleep for specified milliseconds
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Format duration
  static formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Utility functions for logging
class Logger {
  static info(message, data = null) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
  
  static error(message, error = null) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.error(error);
    }
  }
  
  static warn(message, data = null) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    if (data) {
      console.warn(JSON.stringify(data, null, 2));
    }
  }
  
  static debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`);
      if (data) {
        console.debug(JSON.stringify(data, null, 2));
      }
    }
  }
}

module.exports = {
  FileUtils,
  DataUtils,
  TimeUtils,
  Logger
};
