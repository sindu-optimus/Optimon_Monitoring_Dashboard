import { useState } from "react";
import SidebarLayout from "../../layouts/SidebarLayout";
import TlineGraph from "../../components/charts/TlineGraph";

export default function MessageTrend() {
  const [timeSlot, setTimeSlot] = useState(5);
  const [timeRange, setTimeRange] = useState(1);

  return (
    <div className="content">
      <div className="range">
        <h2>Message Trend</h2>

        <label>Select Time Slot: </label>
        <select
          value={timeSlot}
          onChange={(e) => setTimeSlot(Number(e.target.value))}
        >
          <option value={1}>1 min</option>
          <option value={5}>5 min</option>
          <option value={10}>10 min</option>
          <option value={20}>20 min</option>
          <option value={30}>30 min</option>
        </select>

        &nbsp;&nbsp;

        <label>Select Time Range: </label>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
        >
          <option value={1}>Last 1 hour</option>
          <option value={6}>Last 6 hours</option>
          <option value={12}>Last 12 hours</option>
          <option value={24}>Last 24 hours</option>
        </select>
      </div>

      <TlineGraph timeSlot={timeSlot} timeRange={timeRange} />
    </div>
  );
}
