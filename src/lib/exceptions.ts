export class AppException extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

// OAuth / connections
export class TokenExchangeFailedException extends AppException {}
export class NoYouTubeChannelException extends AppException {}
export class SpotifyProfileFetchFailedException extends AppException {}
export class AccountConflictException extends AppException {}
