const { execSync } = require('child_process');

if (process.env.NODE_ENV !== 'production') {
  console.log(
    `NODE_ENV is ${
      process.env.NODE_ENV || 'development'
    }. Running husky install...`
  );
  execSync('npx husky install', { stdio: 'inherit' });
} else {
  console.log('NODE_ENV is production. Skipping husky install.');
}
