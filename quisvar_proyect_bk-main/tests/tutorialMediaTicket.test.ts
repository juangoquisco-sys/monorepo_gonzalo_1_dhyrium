import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTutorialMediaTicket,
  verifyTutorialMediaTicket,
} from '@/services/tutorialMediaTicket.service';

test('creates a ticket scoped to one user and one tutorial', () => {
  const ticket = createTutorialMediaTicket(17, 29);

  assert.deepEqual(verifyTutorialMediaTicket(ticket), {
    userId: 17,
    videoId: 29,
  });
});

test('rejects malformed or modified tutorial media tickets', () => {
  const ticket = createTutorialMediaTicket(17, 29);
  const modifiedTicket = `${ticket.slice(0, -1)}${
    ticket.endsWith('a') ? 'b' : 'a'
  }`;

  assert.throws(
    () => verifyTutorialMediaTicket(modifiedTicket),
    (error: unknown) =>
      error instanceof Error &&
      'statusCode' in error &&
      error.statusCode === 401
  );
  assert.throws(() => verifyTutorialMediaTicket('not-a-token'));
});
