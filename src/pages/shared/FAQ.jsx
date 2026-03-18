import React, { useState, useEffect } from "react";
import SidebarLayout from "../../layouts/SidebarLayout";
import "./FAQ.css";

// Define the Q&A data array
const qaData = [
  {
    question: "What are the visiting hours at the hospital?",
    date: "Mar 15, 2025",
    answer:
      "Visiting hours are from 8 AM to 8 PM every day. Some departments may have additional restrictions, so please check in advance.",
  },
  {
    question: "How do I schedule an appointment with a specialist?",
    date: "Mar 14, 2025",
    answer:
      "You can easily book an appointment online through the hospital's website or by calling the main line. Our staff will assist you with scheduling.",
  },
  {
    question: "Is there a pharmacy inside the hospital?",
    date: "Mar 13, 2025",
    answer:
      "Yes, the hospital has a 24-hour pharmacy located on the first floor.",
  },
  {
    question: "Does the hospital provide emergency services?",
    date: "Mar 12, 2025",
    answer:
      "Yes, the hospital offers 24/7 emergency services for all medical emergencies.",
  },
  {
    question: "What insurance plans are accepted?",
    date: "Mar 11, 2025",
    answer:
      "The hospital accepts a wide range of major insurance plans, including Aetna, BlueCross, and Cigna.",
  },
];

const ViewActions = () => {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const filteredData = qaData.filter(
    (item) =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.date.includes(searchTerm)
  );

  return (
      <div className="content">
        <h2>Frequently Asked Questions</h2>

        <div className="searchbar">
          <i className="ri-search-line"></i>
          <input
            type="text"
            placeholder="Search here..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <i
              className="ri-close-line"
              onClick={() => setSearchTerm("")}
            ></i>
          )}
        </div>

        <ul className="qaList">
          {filteredData.length > 0 ? (
            filteredData.map((item, index) => (
              <li key={index} className="list">
                <strong>{item.question}</strong>
                <p className="answer">{item.answer}</p>
                <p className="date">{item.date}</p>
              </li>
            ))
          ) : (
            <p>No results found.</p>
          )}
        </ul>
      </div> 
  );
};

export default ViewActions;
