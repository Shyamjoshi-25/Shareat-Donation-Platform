import test from 'node:test';
import assert from 'node:assert/strict';
import { validDonationStatuses, canTransitionDonation } from '../src/domain/donationWorkflow.js';

test('donation lifecycle allows each expected forward step', () => {
  assert.equal(canTransitionDonation('Pending', 'Accepted'), true);
  assert.equal(canTransitionDonation('Accepted', 'Pickup scheduled'), true);
  assert.equal(canTransitionDonation('Pickup scheduled', 'Collected'), true);
  assert.equal(canTransitionDonation('Collected', 'Distributed'), true);
});

test('pending donations can be rejected', () => {
  assert.equal(canTransitionDonation('Pending', 'Rejected'), true);
});

test('donation lifecycle blocks skipped and backwards steps', () => {
  assert.equal(canTransitionDonation('Pending', 'Distributed'), false);
  assert.equal(canTransitionDonation('Accepted', 'Collected'), false);
  assert.equal(canTransitionDonation('Distributed', 'Collected'), false);
  assert.equal(canTransitionDonation('Rejected', 'Accepted'), false);
});

test('status list contains only supported states', () => {
  assert.deepEqual(validDonationStatuses, ['Pending', 'Accepted', 'Pickup scheduled', 'Collected', 'Distributed', 'Rejected']);
});
