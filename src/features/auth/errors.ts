export function authErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return '오류가 발생했습니다. 다시 시도해 주세요.';

  const msg = error.message.toLowerCase();

  if (msg.includes('already registered') || msg.includes('user already exists')) {
    return '이미 가입된 이메일입니다.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (msg.includes('email not confirmed')) {
    return '이메일 인증이 필요합니다.';
  }
  if (msg.includes('password')) {
    return '비밀번호는 6자 이상이어야 합니다.';
  }

  return '오류가 발생했습니다. 다시 시도해 주세요.';
}
