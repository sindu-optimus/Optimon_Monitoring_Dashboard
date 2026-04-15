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

export const filterTrustsByAccess = (trusts = [], userProfile) => {
  const allowedTrustIds = getAllowedTrustIds(userProfile);
  const activeTrusts = (Array.isArray(trusts) ? trusts : []).filter(isTrustActive);

  if (allowedTrustIds.length === 0) {
    return activeTrusts;
  }

  return activeTrusts.filter((trust) =>
    allowedTrustIds.includes(Number(trust?.id))
  );
};
