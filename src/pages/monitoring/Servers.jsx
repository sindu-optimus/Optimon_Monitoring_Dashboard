import React, { useEffect, useMemo, useState, useRef } from "react";
import Server from "./Server";
import "remixicon/fonts/remixicon.css";
import bgVideo from "../../assets/servers-bg.mp4";
import { getTrustMeta } from "../../utils/trustData";
import "./Servers.css";

function extractServersFromData(dataList, colorMapRef) {
  if (!Array.isArray(dataList)) return [];

  const colors = [
    "#ffcccb",
    "#e6e6fa",
    "#f5f5dc",
    "#ddbbc9ff",
    "#ffe0cc",
    "#d3c4a7ff",
    "#f8d7da",
    "#fff3cd",
    "#cce5ff",
    "#e6ccbaff",
  ];

  return dataList.reduce((acc, data) => {
    const { trustId, trustName } = getTrustMeta(data);
    if (trustId == null) return acc;

    // assign stable color per trust
    if (!colorMapRef.current[trustId]) {
      const usedColors = Object.values(colorMapRef.current);
      colorMapRef.current[trustId] =
        colors.find((c) => !usedColors.includes(c)) || colors[0];
    }

    acc.push({
      trustId,
      serverName: `${trustName || `Trust-${trustId}`}`,
      bgColor: colorMapRef.current[trustId],
      inbound: data.inboundDetails || [],
      queue: data.queueDetails || [],
    });

    return acc;
  }, []);
}

const chunkByThree = (arr) => {
  const pages = [];
  for (let i = 0; i < arr.length; i += 3) {
    pages.push(arr.slice(i, i + 3));
  }
  return pages;
};

export default function Servers({
  gridCount,
  queueWarningLimit,
  serviceDelayLimit,
  jsonData = [],
  selectedTrustIds,
}) {
  
  const containerRef = useRef(null);
  const manualTimeoutRef = useRef(null);
  const colorMapRef = useRef({});

  const isMobile = window.matchMedia("(max-width: 767px)").matches;

  /* ================= SERVER LIST ================= */
  const serverList = useMemo(() => {
    const allServers = extractServersFromData(jsonData, colorMapRef);

    if (
      !selectedTrustIds ||
      selectedTrustIds.length === 0 ||
      selectedTrustIds.includes("ALL")
    ) {
      return allServers;
    }

    return allServers.filter((s) =>
      selectedTrustIds.includes(String(s.trustId))
    );
  }, [jsonData, selectedTrustIds]);

  /* ================= STATE ================= */
  const [activePage, setActivePage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [manualNav, setManualNav] = useState(false);

  /* ================= INSTANT TRUST SWITCH ================= */
  useEffect(() => {
    setActivePage(0);
    setManualNav(false);

    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
    }
  }, [selectedTrustIds]);

  /* ================= GRID / PAGING ================= */
  const effectiveGridCount = Math.min(
    serverList.length,
    Math.max(1, Number(gridCount) || 1)
  );

  const columnsPerPage = useMemo(() => {
    if (effectiveGridCount === 1) return 1;
    if (effectiveGridCount === 2) return 2;
    return 3;
  }, [effectiveGridCount]);

  const visibleServers = serverList.slice(0, effectiveGridCount);


  const realPages = useMemo(
    () => chunkByThree(visibleServers),
    [visibleServers]
  );

  const scrollPages = useMemo(() => {
    if (realPages.length <= 1 || isMobile) return realPages;
    return [...realPages, realPages[0]];
  }, [realPages, isMobile]);

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    if (isMobile || realPages.length <= 1 || isHovered || manualNav) return;

    const id = setInterval(() => {
      setActivePage((p) => p + 1);
    }, 3000);

    return () => clearInterval(id);
  }, [realPages.length, isHovered, isMobile, manualNav]);

  /* ================= SCROLL LOGIC ================= */
  useEffect(() => {
    if (isMobile) return;

    const container = containerRef.current;
    if (!container || scrollPages.length <= 1) return;

    const width = container.clientWidth;

    container.scrollTo({
      left: width * activePage,
      behavior: "smooth",
    });

    const handleScroll = () => {
      if (
        activePage === scrollPages.length - 1 &&
        container.scrollLeft >= width * (scrollPages.length - 1) - 5
      ) {
        container.style.scrollBehavior = "auto";
        container.scrollLeft = 0;
        container.style.scrollBehavior = "smooth";
        setActivePage(0);
        setManualNav(false);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activePage, scrollPages.length, isMobile]);

  /* ================= RESET ON GRID CHANGE ================= */
  useEffect(() => {
    setActivePage(0);
    if (containerRef.current) containerRef.current.scrollLeft = 0;
  }, [gridCount]);

  /* ================= PAGINATION ================= */
  const totalPages = isMobile ? 1 : realPages.length;
  const displayPage = activePage >= totalPages ? 1 : activePage + 1;

  const resumeAutoScroll = () => {
    clearTimeout(manualTimeoutRef.current);
    manualTimeoutRef.current = setTimeout(() => {
      setManualNav(false);
    }, 4000);
  };

  const goPrev = () => {
    setManualNav(true);
    setActivePage((p) => Math.max(p - 1, 0));
    resumeAutoScroll();
  };

  const goNext = () => {
    setManualNav(true);
    setActivePage((p) => Math.min(p + 1, totalPages - 1));
    resumeAutoScroll();
  };

  const hasAnyPendingQueue = visibleServers.some(
    (server) => server.queue && server.queue.length > 0
  );

  const showEmptyState =
    visibleServers.length > 0 && !hasAnyPendingQueue;

  /* ================= RENDER ================= */
  return (
  <div className="Servers videoWrapper">
    {/* Background video */}
    <video
      className="bgVideo"
      autoPlay
      muted
      loop
      playsInline
    >
      <source src={bgVideo} type="video/mp4" />
    </video>

    <div className="videoOverlay" />

    {/* Main Content */}
    <div className="serversContent">

      {!showEmptyState && (
        <>
          <div className="cardsContainer" ref={containerRef}>
            {scrollPages.map((page, index) => (
              <div
                className="serverPage"
                key={index}
                style={{
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : `repeat(${Math.min(columnsPerPage, page.length)}, 1fr)`,
                }}
              >
                {page.map((server) => (
                  <Server
                    key={server.trustId}
                    {...server}
                    queueWarningLimit={queueWarningLimit}
                    serviceDelayLimit={serviceDelayLimit}
                    onHoverStart={() => setIsHovered(true)}
                    onHoverEnd={() => setIsHovered(false)}
                  />
                ))}
              </div>
            ))}
          </div>

          {!isMobile && totalPages > 1 && (
            <>
              <button
                className="floatingNav left"
                onClick={goPrev}
                disabled={displayPage === 1}
              >
                <i className="ri-arrow-left-s-line" />
              </button>

              <button
                className="floatingNav right"
                onClick={goNext}
                disabled={displayPage === totalPages}
              >
                <i className="ri-arrow-right-s-line" />
              </button>
            </>
          )}

          {!isMobile && totalPages > 1 && (
            <div className="pagination">
              <button
                className="pageBtn iconBtn"
                onClick={goPrev}
                disabled={displayPage === 1}
              >
                <i className="ri-arrow-left-s-line" />
              </button>

              <span className="pageInfo">
                Page <b>{displayPage}</b> of {totalPages}
              </span>

              <button
                className="pageBtn iconBtn"
                onClick={goNext}
                disabled={displayPage === totalPages}
              >
                <i className="ri-arrow-right-s-line" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  </div>
);

}
