export function getTrustMeta(data) {
  const inbound =
    data?.inboundDetails?.find((item) => item?.trustId != null) || null;
  const queue =
    data?.queueDetails?.find((item) => item?.trustId != null) || null;
  const source = inbound || queue;

  if (!source) {
    return {
      trustId: null,
      trustName: null,
    };
  }

  const parsedTrustId = Number(source.trustId);
  const trustId = Number.isFinite(parsedTrustId) ? parsedTrustId : null;

  return {
    trustId,
    trustName: source.trustName || (trustId != null ? `Trust ${trustId}` : null),
  };
}
