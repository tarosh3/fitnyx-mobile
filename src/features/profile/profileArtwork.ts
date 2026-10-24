/** Bundled transparent artwork: offline, with no image request on profile load. */
export const profileArtwork = {
  strength: require('../../../assets/images/profile/strength.png'),
  movement: require('../../../assets/images/profile/movement.png'),
  consistency: require('../../../assets/images/profile/consistency.png'),
  training: require('../../../assets/images/profile/training.png'),
};

export function milestoneArtwork(id: string) {
  if (id.startsWith('streak-')) return profileArtwork.consistency;
  if (id === 'first-roam' || id.startsWith('km-') || id === 'sub-25-5k') return profileArtwork.movement;
  return profileArtwork.strength;
}
