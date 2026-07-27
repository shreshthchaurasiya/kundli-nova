#!/bin/bash
set -e

# Create new directory
mkdir -p src/astrologer-workspace

# Move files
mv src/features/astrologer/dashboard src/astrologer-workspace/
mv src/features/astrologer/chat src/astrologer-workspace/
mv src/features/astrologer/workspace src/astrologer-workspace/
mv src/features/astrologer/profile src/astrologer-workspace/profile-editor

# Create index.ts for astrologer-workspace
cat << 'INDEX' > src/astrologer-workspace/index.ts
export * from './dashboard';
export * from './chat';
export * from './profile-editor';
INDEX

# Update index.ts for features/astrologer
cat << 'FEATURES_INDEX' > src/features/astrologer/index.ts
export * from './partner/AstrologerPartnerContext';
export * from './partner/astrologerPartnerService';
export * from './partner/types';
export * from './shared/constants';

export { AstrologerApplicationScreen, AstrologerPartnershipScreen } from './application';
export { PublicAstrologerProfileScreen } from './public-profile';
FEATURES_INDEX

echo "Files moved successfully."
