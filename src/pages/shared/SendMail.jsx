import React, { useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBold,
  faItalic,
  faUnderline,
  faListOl,
  faListUl,
} from "@fortawesome/free-solid-svg-icons";

import "./SendMail.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SendMail = () => {
  const location = useLocation();
  const { interfaceId } = location.state || {};

  const editorRef = useRef(null);
  const toInputRef = useRef(null);
  const ccInputRef = useRef(null);

  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [subject, setSubject] = useState("");
  const [bodyValue, setBodyValue] = useState("");

  const [emailList, setEmailList] = useState([]);
  const [filteredEmails, setFilteredEmails] = useState([]);
  const [toInputValue, setToInputValue] = useState("");
  const [ccInputValue, setCcInputValue] = useState("");
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showCcDropdown, setShowCcDropdown] = useState(false);

  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  const [responseMessage, setResponseMessage] = useState("");
  const [responseType, setResponseType] = useState("success");

  /* ================= FETCH EMAILS ================= */
  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const res = await fetch(
          `https://neevapi.ddns.net/api/nim/emailids/v1?InterfaceId=${interfaceId}`
        );
        const data = await res.json();
        setEmailList(data.emailList || []);
        setFilteredEmails(data.emailList || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchEmails();
  }, [interfaceId]);

  useEffect(() => {
    const selected = [...to, ...cc];
    setFilteredEmails(
      emailList.filter((email) => !selected.includes(email))
    );
  }, [to, cc, emailList]);

  /* ================= VALIDATION ================= */
  const getEditorText = () => editorRef.current?.innerText?.trim() || "";

  const parseEmailInput = (value) =>
    value
      .split(/[;,]/)
      .map((email) => email.trim())
      .filter(Boolean);

  const hasOnlyValidEmails = (emails = []) =>
    emails.every((email) => EMAIL_REGEX.test(email));

  const getDraftToEmails = () => [...to, ...parseEmailInput(toInputValue)];

  const getDraftCcEmails = () => [...cc, ...parseEmailInput(ccInputValue)];

  const validateUpTo = (field) => {
    const newErrors = {};
    const draftTo = getDraftToEmails();
    const draftCc = getDraftCcEmails();

    if (draftTo.length === 0) {
      newErrors.to = "At least one recipient is required";
    } else if (!hasOnlyValidEmails(draftTo)) {
      newErrors.to = "Enter a valid email address in To";
    }
    if (field === "to") {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    if (draftCc.length > 0 && !hasOnlyValidEmails(draftCc)) {
      newErrors.cc = "Enter a valid email address in CC";
    }
    if (field === "cc") {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    if (!subject.trim()) {
      newErrors.subject = "Subject is required";
    }
    if (field === "subject") {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    if (!getEditorText()) {
      newErrors.body = "Email body is required";
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
  };

  const validateAll = () => {
    const newErrors = {};
    const draftTo = getDraftToEmails();
    const draftCc = getDraftCcEmails();

    if (draftTo.length === 0) {
      newErrors.to = "At least one recipient is required";
    } else if (!hasOnlyValidEmails(draftTo)) {
      newErrors.to = "Enter a valid email address in To";
    }

    if (draftCc.length > 0 && !hasOnlyValidEmails(draftCc)) {
      newErrors.cc = "Enter a valid email address in CC";
    }

    if (!subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!getEditorText()) {
      newErrors.body = "Email body is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const draftTo = getDraftToEmails();
    const draftCc = getDraftCcEmails();

    setIsFormValid(
      draftTo.length > 0 &&
        hasOnlyValidEmails(draftTo) &&
        hasOnlyValidEmails(draftCc) &&
        subject.trim() &&
        bodyValue.trim()
    );
  }, [to, cc, toInputValue, ccInputValue, subject, bodyValue]);

  /* ================= FORMAT ================= */
  const handleFormat = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateAll()) return;

    const finalTo = getDraftToEmails();
    const finalCc = getDraftCcEmails();
    const body = editorRef.current?.innerHTML || "";

    const payload = {
      to: finalTo.join(", "),
      cc: finalCc.join(", "),
      subject,
      body,
    };

    try {
      const res = await fetch(
        "https://neevapi.ddns.net/api/nim/sendemail/v1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error();

      setResponseMessage("Email sent successfully.");
      setResponseType("success");

      setTo([]);
      setCc([]);
      setSubject("");
      setBodyValue("");
      setToInputValue("");
      setCcInputValue("");
      setErrors({});
      editorRef.current.innerHTML = "";
    } catch {
      setResponseMessage("Failed to send email.");
      setResponseType("error");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ================= OUTSIDE CLICK ================= */
  useEffect(() => {
    const handler = (e) => {
      if (toInputRef.current && !toInputRef.current.contains(e.target)) {
        setShowToDropdown(false);
      }
      if (ccInputRef.current && !ccInputRef.current.contains(e.target)) {
        setShowCcDropdown(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="content">
      <h2>Compose Mail</h2>

      {responseMessage && (
        <div className={`response-message ${responseType}`}>
          {responseMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form" noValidate>
        {/* TO */}
        <div className="form-group">
          <label>To:</label>
          <div className="dropdown-input" ref={toInputRef}>
            {to.map((email, i) => (
              <span key={i} className="selected-email">
                {email}
                <button
                  type="button"
                  onClick={() => setTo(to.filter((e) => e !== email))}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={toInputValue}
              className={errors.to ? "input-invalid" : ""}
              onFocus={() => setShowToDropdown(true)}
              onChange={(e) => {
                setToInputValue(e.target.value);
                if (errors.to) {
                  setErrors((prev) => ({ ...prev, to: null }));
                }
              }}
              onBlur={() => validateUpTo("to")}
              placeholder="Enter email"
            />
            {showToDropdown && (
              <div className="dropdown-list">
                {filteredEmails.map((email, i) => (
                  <div
                    key={i}
                    className="dropdown-item"
                    onClick={() => {
                      setTo([...to, email]);
                      setToInputValue("");
                      setShowToDropdown(false);
                      if (errors.to) {
                        setErrors((prev) => ({ ...prev, to: null }));
                      }
                    }}
                  >
                    {email}
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.to && <span className="input-error">{errors.to}</span>}
        </div>

        {/* CC */}
        <div className="form-group">
          <label>CC:</label>
          <div className="dropdown-input" ref={ccInputRef}>
            {cc.map((email, i) => (
              <span key={i} className="selected-email">
                {email}
                <button
                  type="button"
                  onClick={() => setCc(cc.filter((e) => e !== email))}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={ccInputValue}
              className={errors.cc ? "input-invalid" : ""}
              onFocus={() => setShowCcDropdown(true)}
              onChange={(e) => {
                setCcInputValue(e.target.value);
                if (errors.cc) {
                  setErrors((prev) => ({ ...prev, cc: null }));
                }
              }}
              onBlur={() => validateUpTo("cc")}
              placeholder="Enter email"
            />
          </div>
          {errors.cc && <span className="input-error">{errors.cc}</span>}
        </div>

        {/* SUBJECT */}
        <div className="form-group">
          <label>Subject:</label>
          <input
            type="text"
            value={subject}
            className={errors.subject ? "input-invalid" : ""}
            onFocus={() => validateUpTo("cc")}
            onChange={(e) => {
              setSubject(e.target.value);
              if (errors.subject) {
                setErrors((prev) => ({ ...prev, subject: null }));
              }
            }}
            onBlur={() => validateUpTo("subject")}
            placeholder="Enter subject"
          />
          {errors.subject && (
            <span className="input-error">{errors.subject}</span>
          )}
        </div>

        {/* TOOLBAR */}
        <div className="toolbar">
          <button type="button" onClick={() => handleFormat("bold")}>
            <FontAwesomeIcon icon={faBold} />
          </button>
          <button type="button" onClick={() => handleFormat("italic")}>
            <FontAwesomeIcon icon={faItalic} />
          </button>
          <button type="button" onClick={() => handleFormat("underline")}>
            <FontAwesomeIcon icon={faUnderline} />
          </button>
          <button
            type="button"
            onClick={() => handleFormat("insertOrderedList")}
          >
            <FontAwesomeIcon icon={faListOl} />
          </button>
          <button
            type="button"
            onClick={() => handleFormat("insertUnorderedList")}
          >
            <FontAwesomeIcon icon={faListUl} />
          </button>
        </div>

        {/* EDITOR */}
        <div
          ref={editorRef}
          contentEditable
          className={`editor ${errors.body ? "input-invalid" : ""}`}
          onFocus={() => validateUpTo("subject")}
          onInput={() => {
            setBodyValue(getEditorText());
            if (errors.body) {
              setErrors((prev) => ({ ...prev, body: null }));
            }
          }}
          onBlur={validateAll}
        />
        {errors.body && <span className="input-error">{errors.body}</span>}

        <button type="submit" className="btn" disabled={!isFormValid}>
          Send Mail
        </button>
      </form>
    </div>
  );
};

export default SendMail;
