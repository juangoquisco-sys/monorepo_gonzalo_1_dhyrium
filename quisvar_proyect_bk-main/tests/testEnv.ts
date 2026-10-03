process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/dhyrium_test';
process.env.SECRET = 'test-secret-not-for-production';
process.env.JWT_RESET = 'test-reset-secret-not-production';
process.env.IV = '0123456789abcdef0123456789abcdef';
process.env.SECRET_CODE = 'test-code-not-for-production';

export {};
