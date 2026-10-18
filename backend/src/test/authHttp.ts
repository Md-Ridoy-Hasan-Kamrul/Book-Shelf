export function cookieFromSetCookie(header: string | null): string {
  if (!header) return '';
  const first = header.split(',')[0]?.trim() ?? '';
  return first.split(';')[0] ?? '';
}

export async function signUpAndSignIn(
  baseUrl: string,
  email: string,
  password = 'password123',
  name = 'Test User',
): Promise<string> {
  await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  const signIn = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return cookieFromSetCookie(signIn.headers.get('set-cookie'));
}
