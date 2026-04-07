// Server.jsx
import React, { useMemo } from "react";
import ServerCard from "./ServerCard";
import "./Server.css";

export default function Server({
  serverName,
  bgColor,
  inbound = [],
  queue = [],
  queueWarningLimit = 100,
  serviceDelayLimit = 100,
  onHoverStart,
  onHoverEnd,
}) {

  const QUEUE_GREEN_LIMIT = 50;
  const QUEUE_TREND_KEY = "queue_trends";

  const getQueueTrends = () => {
    return JSON.parse(sessionStorage.getItem(QUEUE_TREND_KEY)) || {};
  };

  const setQueueTrends = (data) => {
    sessionStorage.setItem(QUEUE_TREND_KEY, JSON.stringify(data));
  };

  const computeQueueCritical = (pending, limit) => {
    const p = Number(String(pending).replace(/[^\d]/g, "")) || 0;
    return p >= limit;
  };

  const computeEndpointCritical = (delay, limit) => {
    const d = Number(delay) || 0;
    return d > limit;
  };

  const getQueueTrend = (trendKey, currentCount) => {
    const count =
      Number(String(currentCount).replace(/[^\d]/g, "")) || 0;

    const trends = getQueueTrends();

    // Reset trend when below green threshold
    if (count < QUEUE_GREEN_LIMIT) {
      delete trends[trendKey];
      setQueueTrends(trends);
      return null;
    }

    const prev = trends[trendKey]?.lastCount;

    let trend = null;
    // if (prev !== undefined) {
    //   if (count >= prev) trend = "up";
    //   else if (count < prev) trend = "down";
    // }
    if (prev !== undefined) {
      if (count < prev) {
        trend = "down";
      } else {
        // count >= prev
        trend = "up";
      }
    }

    const color = trend === "up" ? "red" : "green";

    trends[trendKey] = {
      lastCount: count,
      updatedAt: Date.now(),
    };

    setQueueTrends(trends);

    return trend ? { direction: trend, color } : null;
  };

  // const getQueueTrend = (trendKey, currentCount, limit) => {
  //   const count = Number(String(currentCount).replace(/[^\d]/g, "")) || 0;

  //   // Only track RED queues
  //   if (count <= limit) return null;

  //   const trends = getQueueTrends();
  //   const prev = trends[trendKey]?.lastCount;

  //   let trend = null;
  //   if (prev !== undefined) {
  //     if (count > prev) trend = "up";
  //     else if (count < prev) trend = "down";
  //   }

  //   trends[trendKey] = {
  //     lastCount: count,
  //     updatedAt: Date.now(),
  //   };

  //   setQueueTrends(trends);
  //   return trend;
  // };

  const queues = useMemo(() => {
    return queue
      .map((q) => {
        // const pending = q.pendingQueueCount ?? "0";
        const pending = q.pendingQueueCount ?? "";
        const critical = computeQueueCritical(
          pending,
          queueWarningLimit
        );

        const trendKey = `${q.trustId}_${q.queueName}`;

        return {
          id: q.id,
          trustId: q.trustId,
          name: q.queueName ?? "Unknown",
          pending,
          critical,
          trend: getQueueTrend(
            trendKey, 
            pending
          ),
        };
      })
      .sort(
        (a, b) =>
          b.critical - a.critical ||
          Number(b.pending.replace(/\D/g, "")) -
            Number(a.pending.replace(/\D/g, ""))
      );
  }, [queue, queueWarningLimit]);

  const hasBackendNoPending = queue.some((q) => {
    const val = String(q.pendingQueueCount || "").toLowerCase();
    return val.includes("no pending");
  });

  const hasBackendNoPendingServices = inbound.some((ep) => {
    const delayValue = String(ep.timeDelay || "").toLowerCase();
    return delayValue.includes("no pending services");
  });

  const endpoints = useMemo(() => {
    return inbound
      .map((ep) => ({
        id: ep.id,
        name: ep.serviceName ?? "Unknown",
        idleTime: ep.timeDelay ?? "0",
        critical: computeEndpointCritical(
          ep.timeDelay,
          serviceDelayLimit
        ),
      }))
      .sort(
        (a, b) =>
          b.critical - a.critical ||
          Number(b.idleTime) - Number(a.idleTime)
      );
  }, [inbound, serviceDelayLimit]);

  const lastUpdated = useMemo(() => {
    const times = [];

    inbound.forEach((i) => i.createdOn && times.push(new Date(i.createdOn)));
    queue.forEach((q) => q.createdOn && times.push(new Date(q.createdOn)));

    if (times.length === 0) return null;
    return new Date(Math.max(...times.map((t) => t.getTime())));
  }, [inbound, queue]);

  const lastUpdatedText = lastUpdated
  ? lastUpdated.toLocaleString("en-US", {
      timeZone: "Europe/London",
      month: "short",     
      day: "2-digit",     
      year: "numeric",     
      hour: "numeric",     
      minute: "2-digit",   
      hour12: true,        
    })
  : "";

  return (
    <div
      className="serverWrapper"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <ServerCard
        serverName={serverName}
        bgColor={bgColor}
        queues={queues}
        endpoints={endpoints}
        noQueues={hasBackendNoPending}
        noPendingServices={hasBackendNoPendingServices}
        lastUpdated={lastUpdated}
        lastUpdatedText={lastUpdatedText}
      />
    </div>
  );
}
