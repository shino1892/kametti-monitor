/**
 * Logger 인터페이스
 *
 * 애플리케이션 전체에서 일관된 로깅을 제공합니다.
 * 프로덕션/개발 환경에 따라 다른 구현체를 주입할 수 있습니다.
 */
export interface ILogger {
  /**
   * 디버그 레벨 로그
   * 개발 환경에서만 출력됩니다.
   */
  debug(message: string, ...args: any[]): void

  /**
   * 정보 레벨 로그
   * 일반적인 정보성 메시지를 출력합니다.
   */
  info(message: string, ...args: any[]): void

  /**
   * 경고 레벨 로그
   * 주의가 필요한 상황을 출력합니다.
   */
  warn(message: string, ...args: any[]): void

  /**
   * 에러 레벨 로그
   * 오류 상황을 출력합니다.
   */
  error(message: string, error?: Error | any, ...args: any[]): void
}

/**
 * 로그 레벨
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}
