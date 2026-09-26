import { validateApiEnvironment } from '@nexustrade/config';

describe('validateApiEnvironment', () => {
  it('applies safe local defaults', () => {
    expect(validateApiEnvironment({})).toMatchObject({
      NODE_ENV: 'development',
      API_PORT: 3000,
      DATABASE_POOL_MAX: 10,
    });
  });

  it('coerces numeric environment values', () => {
    expect(
      validateApiEnvironment({
        API_PORT: '3100',
        DATABASE_POOL_MAX: '20',
      }),
    ).toMatchObject({
      API_PORT: 3100,
      DATABASE_POOL_MAX: 20,
    });
  });

  it('rejects an invalid port', () => {
    expect(() => validateApiEnvironment({ API_PORT: '70000' })).toThrow('Invalid API environment');
  });
});
