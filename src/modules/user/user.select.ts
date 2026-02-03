const getUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  avatar: true,
  isEmailVerified: true,
  fcmToken: true,
  phoneNumber: true,
  countryCode: true,
  isRestricted: true,
  restrictionReason: true,
  bio: true,
  isOnline: true,
  lastSeen: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  clinicMemberships: {
    select: {
      role: true,
      clinic: {
        select: {
          permissions: true,
        },
      },
    },
  },
  ownedClinics: {
    select: {
      permissions: true,
    },
  },
};

export default { getUserSelect };
