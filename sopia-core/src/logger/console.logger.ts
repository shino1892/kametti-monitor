import type { ILogger } from './logger.interface'
import { LogLevel } from './logger.interface'

/**
 * 콘솔 기반 Logger 구현체
 *
 * 개발 환경에서는 모든 로그를 출력하고,
 * 프로덕션 환경에서는 설정된 레벨 이상의 로그만 출력합니다.
 */
export class ConsoleLogger implements ILogger {
  constructor(
    private minLevel: LogLevel = LogLevel.DEBUG,
    private prefix: string = '[SOPIA]'
  ) {}

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString()
    return `${this.prefix} [${timestamp}] [${level}] ${message}`
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message), ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message), ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), ...args)
    }
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), error, ...args)
    }
  }
}

/**
 * 아무것도 출력하지 않는 Silent Logger
 *
 * 프로덕션 환경이나 테스트 환경에서 로그를 완전히 끌 때 사용합니다.
 */
export class SilentLogger implements ILogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
