import React from "react";
import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";
import "./GraphStyles.css";

// Generate sample data (every minute for the last 24 hours)
const fullData = [];
const startDate = new Date();
startDate.setHours(startDate.getHours() - 24); // Start from 24 hours ago

for (let i = 0; i < 24 * 60; i++) {
  fullData.push({
    time: new Date(startDate.getTime() + i * 60000).toISOString(),
    count: Math.floor(Math.random() * 20), // Random count between 0-20
  });
}

export default function TlineGraph({ timeSlot, timeRange }) {
  // Get the current time and calculate the cutoff timestamp based on timeRange
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - timeRange * 60 * 60 * 1000);

  // Filter data based on selected time range
  let filteredData = fullData.filter(({ time }) => new Date(time) >= cutoffTime);

  if (timeSlot > 1) {
    // Perform cumulative sum **only for time slots greater than 1 minute**
    let cumulativeData = [];
    for (let i = 0; i < filteredData.length; i += timeSlot) {
      let sum = filteredData
        .slice(i, i + timeSlot)
        .reduce((acc, curr) => acc + curr.count, 0);
      cumulativeData.push({
        time: filteredData[i].time,
        count: sum,
      });
    }
    filteredData = cumulativeData;
  }

  useEffect(() => {
    window.scrollTo(0, 0); 
  }, []);

  return (
    <div className="graph-container">
      <h3>Message Trend`` ({timeSlot} min intervals, Last {timeRange} hours)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
