import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNextTechnicalReviewPercentage,
  resolveTechnicalReviewSubmissionState,
} from '@/services/technicalReviewSubmissions.policy';

test('allows only a strictly higher accumulated percentage for the next submission', () => {
  assert.doesNotThrow(() => assertNextTechnicalReviewPercentage(95, 60));

  for (const percentage of [60, 59, 0, 101, 60.5]) {
    assert.throws(() => assertNextTechnicalReviewPercentage(percentage, 60));
  }
});

test('prioritizes replaced submissions over their previous review state', () => {
  assert.equal(
    resolveTechnicalReviewSubmissionState({
      replacedAt: new Date(),
      status: false,
      type: 'HOLDING',
    }),
    'REPLACED'
  );
  assert.equal(
    resolveTechnicalReviewSubmissionState({
      replacedAt: null,
      status: false,
      type: 'HOLDING',
    }),
    'PENDING'
  );
  assert.equal(
    resolveTechnicalReviewSubmissionState({
      replacedAt: null,
      status: true,
      type: 'ACCEPTED',
    }),
    'APPROVED'
  );
  assert.equal(
    resolveTechnicalReviewSubmissionState({
      replacedAt: null,
      status: true,
      type: 'REJECTED',
    }),
    'OBSERVED'
  );
});
