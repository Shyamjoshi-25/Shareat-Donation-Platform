export const validDonationStatuses = Object.freeze([
  'Pending', 'Accepted', 'Pickup scheduled', 'Collected', 'Distributed', 'Rejected'
]);

export const donationTransitions = Object.freeze({
  Pending: Object.freeze(['Accepted', 'Rejected']),
  Accepted: Object.freeze(['Pickup scheduled']),
  'Pickup scheduled': Object.freeze(['Collected']),
  Collected: Object.freeze(['Distributed']),
  Distributed: Object.freeze([]),
  Rejected: Object.freeze([])
});

export function canTransitionDonation(currentStatus, requestedStatus) {
  return donationTransitions[currentStatus]?.includes(requestedStatus) ?? false;
}
