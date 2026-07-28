export const getAllowedTrustIds = (userProfile) => {
  const trustIds =
    userProfile?.trusts
      ?.map((trust) => Number(trust?.id))
      .filter((id) => Number.isInteger(id)) || [];

  return Array.from(new Set(trustIds));
};

const isTrustActive = (trust) => {
  const value = trust?.isEnabled;

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
};

export const filterTrustsByUserAccess = (trusts = [], userProfile) => {
  const allowedTrustIds = getAllowedTrustIds(userProfile);
  const trustList = Array.isArray(trusts) ? trusts : [];

  if (allowedTrustIds.length === 0) {
    return trustList;
  }

  return trustList.filter((trust) =>
    allowedTrustIds.includes(Number(trust?.id))
  );
};

export const filterTrustsByAccess = (trusts = [], userProfile) =>
  filterTrustsByUserAccess(trusts, userProfile).filter(isTrustActive);
