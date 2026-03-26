import React from "react";
import SettingsPanel from "../../components/SettingsPanel";
import "./SettingsPage.css";

export default function SettingsPage({
  refreshTime,
  onRefreshTimeChange,
  gridCount,
  onGridCountChange,
  maxGridCount,
  selectedTrustIds,
  onTrustChange,
  queueWarningLimit,
  onQueueWarningLimitChange,
  serviceDelayLimit,
  onServiceDelayLimitChange,
}) {
  return (
    <div className="content">
      <h2 className="settings-head">Application Settings</h2>

      <div className="settings-page-card">
        <SettingsPanel
          refreshTime={refreshTime}
          onRefreshTimeChange={onRefreshTimeChange}
          gridCount={gridCount}
          onGridCountChange={onGridCountChange}
          maxGridCount={maxGridCount}
          selectedTrustIds={selectedTrustIds}
          onTrustChange={onTrustChange}
          queueWarningLimit={queueWarningLimit}
          onQueueWarningLimitChange={onQueueWarningLimitChange}
          serviceDelayLimit={serviceDelayLimit}
          onServiceDelayLimitChange={onServiceDelayLimitChange}
        />
      </div>
    </div>
  );
}
