import React, { useRef, useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBold,
  faItalic,
  faUnderline,
  faListOl,
  faListUl,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { getTrusts } from "../../api/trustService";
import {
  createCriticalInterface,
  getCriticalInboundReceivers,
  getCriticalInterfaces,
} from "../../api/criticalInterfacesService";

import "./SendMail.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPE_OPTIONS = {
  QUEUE: "QUEUE",
  IDLE_TIME: "IDLE_TIME",
};
const OTHER_INTERFACE_VALUE = "__OTHER__";
const INTERFACE_TYPE_BY_EMAIL_TYPE = {
  [TYPE_OPTIONS.IDLE_TIME]: "INBOUND",
  [TYPE_OPTIONS.QUEUE]: "OTHER",
};
const DUMMY_TO_EMAILS = [
  "optimus.support@example.com",
  "interface.team@example.com",
  "integration.ops@example.com",
  "middleware.support@example.com",
  "service.owner@example.com",
];

const unwrapApiData = (response) => response?.data ?? response;

const getListFromApiResponse = (response) => {
  const data = unwrapApiData(response);
  const list =
    data?.data ??
    data?.content ??
    data?.items ??
    data?.criticalInterfaces ??
    data?.criticalInterfaceList ??
    data?.criticalInboundReceivers ??
    data?.criticalInboundReceiverList ??
    data;

  return Array.isArray(list) ? list : [];
};

const getFirstValue = (item, keys, fallback = "") => {
  for (const key of keys) {
    const value = item?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return fallback;
};

const getCreatedInterfaceFromApiResponse = (response) => {
  const data = unwrapApiData(response);
  return data?.data ?? data?.criticalInboundReceiver ?? data?.criticalInterface ?? data;
};

const buildAutomaticSubject = ({ trustName, selectedType, interfaceName }) => {
  if (!trustName || !selectedType || !interfaceName) {
    return "";
  }

  if (selectedType === TYPE_OPTIONS.IDLE_TIME) {
    return `${trustName} Live - Idle time observation on ${interfaceName}`;
  }

  return `${trustName} Live - ${interfaceName} listener down`;
};

const buildAutomaticBody = ({ selectedType, interfaceName }) => {
  if (!selectedType || !interfaceName) {
    return "";
  }

  if (selectedType === TYPE_OPTIONS.IDLE_TIME) {
    return `Dear Team,

We are observing that no messages are being received in the ${interfaceName} inbound.

Could you please check the outbound at your end and restart it if required?

Thanks & Regards,
Madhu`;
  }

  return `Dear Team,

We have been observing that, messages are queueing in the ${interfaceName}. We have restarted the listener still the queue is not going down.

Could you check the listener and restart if required please?

Thanks,
Optimus Support`;
};

const SendMail = () => {
  const editorRef = useRef(null);
  const toInputRef = useRef(null);
  const ccInputRef = useRef(null);
  const interfaceInputRef = useRef(null);
  const customInterfaceSaveKeyRef = useRef("");
  const lastAutomaticBodyRef = useRef("");

  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [subject, setSubject] = useState("");
  const [bodyValue, setBodyValue] = useState("");

  const [toInputValue, setToInputValue] = useState("");
  const [ccInputValue, setCcInputValue] = useState("");
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showCcDropdown, setShowCcDropdown] = useState(false);
  const [trustOptions, setTrustOptions] = useState([]);
  const [selectedTrustId, setSelectedTrustId] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [interfaceOptions, setInterfaceOptions] = useState([]);
  const [selectedInterfaceId, setSelectedInterfaceId] = useState("");
  const [customInterfaceName, setCustomInterfaceName] = useState("");
  const [interfaceSearchValue, setInterfaceSearchValue] = useState("");
  const [showInterfaceDropdown, setShowInterfaceDropdown] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [customInterfaceSaving, setCustomInterfaceSaving] = useState(false);

  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  const [responseMessage, setResponseMessage] = useState("");
  const [responseType, setResponseType] = useState("success");
  const [showBodyTooltip, setShowBodyTooltip] = useState(false);

  /* ================= FETCH LOOKUPS ================= */
  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const res = await getTrusts();
        setTrustOptions(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchLookupData();
  }, []);

  useEffect(() => {
    const fetchInterfaces = async () => {
      if (!selectedTrustId || !selectedType) {
        setInterfaceOptions([]);
        return;
      }

      try {
        setLookupLoading(true);

        const response =
          selectedType === TYPE_OPTIONS.IDLE_TIME
            ? await getCriticalInboundReceivers({ trustId: selectedTrustId })
            : await getCriticalInterfaces({ trustId: selectedTrustId });

        const items = getListFromApiResponse(response);
        const mappedItems = items
          .map((item, index) => ({
            id: item?.id ?? `${selectedType}-${index}`,
            name:
              selectedType === TYPE_OPTIONS.IDLE_TIME
                ? getFirstValue(item, [
                    "serviceName",
                    "interfaceName",
                    "interface_name",
                    "name",
                  ])
                : getFirstValue(item, [
                    "endpointName",
                    "interfaceName",
                    "interface_name",
                    "queueName",
                    "serviceName",
                    "name",
                  ]),
          }))
          .filter((item) => item.name)
          .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );

        setInterfaceOptions(mappedItems);
      } catch (err) {
        console.error(err);
        setInterfaceOptions([]);
      } finally {
        setLookupLoading(false);
      }
    };

    fetchInterfaces();
  }, [selectedTrustId, selectedType]);

  useEffect(() => {
    setSelectedInterfaceId("");
    setCustomInterfaceName("");
    setInterfaceSearchValue("");
    setShowInterfaceDropdown(false);
  }, [selectedTrustId, selectedType]);

  /* ================= VALIDATION ================= */
  const getEditorText = () => editorRef.current?.innerText?.trim() || "";

  const parseEmailInput = (value) =>
    value
      .split(/[;,]/)
      .map((email) => email.trim())
      .filter(Boolean);

  const hasOnlyValidEmails = (emails = []) =>
    emails.every((email) => EMAIL_REGEX.test(email));

  const getDraftToEmails = () => [...to];

  const getDraftCcEmails = () => [...cc, ...parseEmailInput(ccInputValue)];
  const isOtherInterface = selectedInterfaceId === OTHER_INTERFACE_VALUE;
  const hasSelectedInterface = isOtherInterface
    ? customInterfaceName.trim().length > 0
    : Boolean(selectedInterfaceId);
  const filteredInterfaceOptions = interfaceOptions.filter((item) =>
    item.name.toLowerCase().includes(interfaceSearchValue.trim().toLowerCase())
  );
  const selectedTrust = trustOptions.find(
    (trust) => String(trust.id) === String(selectedTrustId)
  );
  const selectedTrustName = selectedTrust?.name || "";
  const selectedInterfaceName = isOtherInterface
    ? customInterfaceName.trim()
    : interfaceSearchValue.trim();
  const filteredToEmails = DUMMY_TO_EMAILS.filter((email) =>
    email.toLowerCase().includes(toInputValue.trim().toLowerCase())
  );

  useEffect(() => {
    const nextSubject = buildAutomaticSubject({
      trustName: selectedTrustName,
      selectedType,
      interfaceName: selectedInterfaceName,
    });

    setSubject(nextSubject);
    if (nextSubject && errors.subject) {
      setErrors((prev) => ({ ...prev, subject: null }));
    }
  }, [selectedTrustName, selectedType, selectedInterfaceName, errors.subject]);

  useEffect(() => {
    const nextBody = buildAutomaticBody({
      selectedType,
      interfaceName: selectedInterfaceName,
    });
    const currentBody = editorRef.current?.innerText?.trim() || bodyValue.trim();
    const previousAutomaticBody = lastAutomaticBodyRef.current.trim();
    const canReplaceBody = !currentBody || currentBody === previousAutomaticBody;

    if (canReplaceBody) {
      if (editorRef.current) {
        editorRef.current.innerText = nextBody;
      }

      setBodyValue(nextBody);
      if (nextBody && errors.body) {
        setErrors((prev) => ({ ...prev, body: null }));
      }
    }

    lastAutomaticBodyRef.current = nextBody;
  }, [selectedType, selectedInterfaceName, errors.body]);

  const createCustomInterfacePayload = () => {
    const trustId = Number(selectedTrustId);
    const interfaceName = customInterfaceName.trim();

    if (selectedType === TYPE_OPTIONS.IDLE_TIME) {
      return {
        serviceName: interfaceName,
        trustId,
        trustName: selectedTrustName,
        dayIdleTime: 30,
        nightIdleTime: 30,
        weDayIdleTime: 30,
        weNightIdleTime: 30,
        isMondayIgnore: false,
        isCritical: true,
        deleted: false,
      };
    }

    return {
      endpointName: interfaceName,
      interfaceName,
      isCritical: true,
      deleted: false,
      trustId,
      trustName: selectedTrustName,
    };
  };

  const ensureCustomInterfaceCreated = async () => {
    const trimmedInterfaceName = customInterfaceName.trim();

    if (
      !isOtherInterface ||
      !selectedTrustId ||
      !selectedType ||
      !trimmedInterfaceName ||
      customInterfaceSaving
    ) {
      return;
    }

    const saveKey = [
      selectedTrustId,
      selectedType,
      trimmedInterfaceName.toLowerCase(),
    ].join("|");

    if (customInterfaceSaveKeyRef.current === saveKey) {
      return;
    }

    try {
      setCustomInterfaceSaving(true);
      customInterfaceSaveKeyRef.current = saveKey;

      const response = await createCriticalInterface({
        interfaceType: INTERFACE_TYPE_BY_EMAIL_TYPE[selectedType],
        payload: createCustomInterfacePayload(),
      });
      const createdInterface = getCreatedInterfaceFromApiResponse(response);
      const createdId =
        createdInterface?.id ??
        createdInterface?.interfaceId ??
        createdInterface?.interface_id;

      if (createdId !== undefined && createdId !== null) {
        const nextInterface = {
          id: String(createdId),
          name: trimmedInterfaceName,
        };

        setSelectedInterfaceId(nextInterface.id);
        setInterfaceSearchValue(nextInterface.name);
        setCustomInterfaceName("");
        setInterfaceOptions((prev) => {
          const withoutDuplicate = prev.filter(
            (item) => String(item.id) !== nextInterface.id
          );

          return [...withoutDuplicate, nextInterface].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );
        });
      }
    } catch (err) {
      console.error("Custom interface create failed:", err);
      customInterfaceSaveKeyRef.current = "";
      setErrors((prev) => ({
        ...prev,
        interfaceName: err.message || "Failed to create custom interface",
      }));
    } finally {
      setCustomInterfaceSaving(false);
    }
  };

  const validateUpTo = (field) => {
    const newErrors = {};
    const draftTo = getDraftToEmails();
    const draftCc = getDraftCcEmails();

    if (!selectedTrustId) {
      newErrors.trust = "Trust is required";
    }
    if (field === "trust") {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    if (!selectedType) {
      newErrors.type = "Type is required";
    }
    if (field === "type") {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    if (!selectedInterfaceId) {
      newErrors.interfaceName = "Interface is required";
    } else if (isOtherInterface && !customInterfaceName.trim()) {
      newErrors.interfaceName = "Custom interface name is required";
    }
    if (field === "interfaceName") {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

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

    if (!selectedTrustId) {
      newErrors.trust = "Trust is required";
    }

    if (!selectedType) {
      newErrors.type = "Type is required";
    }

    if (!selectedInterfaceId) {
      newErrors.interfaceName = "Interface is required";
    } else if (isOtherInterface && !customInterfaceName.trim()) {
      newErrors.interfaceName = "Custom interface name is required";
    }

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
        Boolean(selectedTrustId) &&
        Boolean(selectedType) &&
        hasSelectedInterface &&
        subject.trim() &&
        bodyValue.trim()
    );
  }, [
    to,
    cc,
    toInputValue,
    ccInputValue,
    selectedTrustId,
    selectedType,
    selectedInterfaceId,
    customInterfaceName,
    subject,
    bodyValue,
    hasSelectedInterface,
  ]);

  /* ================= FORMAT ================= */
  const handleFormat = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
  };

  const handleToFocus = () => {
    setShowToDropdown(true);
    ensureCustomInterfaceCreated();
  };

  const handleToOptionToggle = (email) => {
    setTo((prev) =>
      prev.includes(email)
        ? prev.filter((selectedEmail) => selectedEmail !== email)
        : [...prev, email]
    );
    setToInputValue("");
    if (errors.to) {
      setErrors((prev) => ({ ...prev, to: null }));
    }
  };

  const handleBodyFocus = () => {
    validateUpTo("subject");
    setShowBodyTooltip(true);
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
      setSelectedTrustId("");
      setSelectedType("");
      setSelectedInterfaceId("");
      setCustomInterfaceName("");
      setInterfaceOptions([]);
      setInterfaceSearchValue("");
      setShowInterfaceDropdown(false);
      lastAutomaticBodyRef.current = "";
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
      if (
        interfaceInputRef.current &&
        !interfaceInputRef.current.contains(e.target)
      ) {
        setShowInterfaceDropdown(false);
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
        <div className="form-group">
          <label>Trust:</label>
          <select
            value={selectedTrustId}
            className={errors.trust ? "input-invalid" : ""}
            onChange={(e) => {
              setSelectedTrustId(e.target.value);
              if (errors.trust) {
                setErrors((prev) => ({ ...prev, trust: null }));
              }
            }}
            onBlur={() => validateUpTo("trust")}
          >
            <option value="">Select trust</option>
            {trustOptions.map((trust) => (
              <option key={trust.id} value={trust.id}>
                {trust.name}
              </option>
            ))}
          </select>
          {errors.trust && <span className="input-error">{errors.trust}</span>}
        </div>

        <div className="form-group">
          <label>Type:</label>
          <select
            value={selectedType}
            className={errors.type ? "input-invalid" : ""}
            onChange={(e) => {
              setSelectedType(e.target.value);
              if (errors.type) {
                setErrors((prev) => ({ ...prev, type: null }));
              }
            }}
            onBlur={() => validateUpTo("type")}
            disabled={!selectedTrustId}
          >
            <option value="">
              {selectedTrustId ? "Select type" : "Select trust first"}
            </option>
            <option value={TYPE_OPTIONS.QUEUE}>Queue</option>
            <option value={TYPE_OPTIONS.IDLE_TIME}>Idle time</option>
          </select>
          {errors.type && <span className="input-error">{errors.type}</span>}
        </div>

        <div className="form-group">
          <label>Interface:</label>
          <div className="dropdown-input" ref={interfaceInputRef}>
            <input
              type="text"
              value={interfaceSearchValue}
              className={errors.interfaceName ? "input-invalid" : ""}
              onFocus={() => {
                if (selectedTrustId && selectedType) {
                  setShowInterfaceDropdown(true);
                }
              }}
              onChange={(e) => {
                setInterfaceSearchValue(e.target.value);
                setSelectedInterfaceId("");
                setCustomInterfaceName("");
                if (selectedTrustId && selectedType) {
                  setShowInterfaceDropdown(true);
                }
                if (errors.interfaceName) {
                  setErrors((prev) => ({ ...prev, interfaceName: null }));
                }
              }}
              onBlur={() => validateUpTo("interfaceName")}
              placeholder={
                !selectedTrustId || !selectedType
                  ? "Select trust and type first"
                  : lookupLoading
                  ? "Loading..."
                  : "Search interface"
              }
              disabled={!selectedTrustId || !selectedType || lookupLoading}
            />

            {showInterfaceDropdown && selectedTrustId && selectedType && (
              <div className="dropdown-list">
                {filteredInterfaceOptions.map((item) => (
                  <div
                    key={item.id}
                    className="dropdown-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedInterfaceId(String(item.id));
                      setInterfaceSearchValue(item.name);
                      setCustomInterfaceName("");
                      setShowInterfaceDropdown(false);
                      if (errors.interfaceName) {
                        setErrors((prev) => ({
                          ...prev,
                          interfaceName: null,
                        }));
                      }
                    }}
                  >
                    {item.name}
                  </div>
                ))}

                <div
                  className="dropdown-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelectedInterfaceId(OTHER_INTERFACE_VALUE);
                    setInterfaceSearchValue("Others");
                    setShowInterfaceDropdown(false);
                    if (errors.interfaceName) {
                      setErrors((prev) => ({
                        ...prev,
                        interfaceName: null,
                      }));
                    }
                  }}
                >
                  Others
                </div>

                {!filteredInterfaceOptions.length && (
                  <div className="dropdown-item dropdown-item-disabled">
                    No interfaces found
                  </div>
                )}
              </div>
            )}
          </div>
          {errors.interfaceName && (
            <span className="input-error">{errors.interfaceName}</span>
          )}
        </div>

        {isOtherInterface && (
          <div className="form-group">
            <label>Custom Interface Name:</label>
            <input
              type="text"
              value={customInterfaceName}
              className={errors.interfaceName ? "input-invalid" : ""}
              onChange={(e) => {
                setCustomInterfaceName(e.target.value);
                if (errors.interfaceName) {
                  setErrors((prev) => ({ ...prev, interfaceName: null }));
                }
              }}
              onBlur={() => validateUpTo("interfaceName")}
              placeholder="Enter interface name"
            />
          </div>
        )}

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
              onFocus={handleToFocus}
              onClick={() => setShowToDropdown(true)}
              onChange={(e) => {
                setToInputValue(e.target.value);
                if (errors.to) {
                  setErrors((prev) => ({ ...prev, to: null }));
                }
              }}
              onBlur={() => validateUpTo("to")}
              placeholder={
                customInterfaceSaving
                  ? "Creating interface..."
                  : to.length
                  ? "Search recipients"
                  : "Select recipients"
              }
            />
            {showToDropdown && (
              <div className="dropdown-list multi-select-list">
                {filteredToEmails.map((email) => (
                  <label
                    key={email}
                    className="dropdown-item multi-select-item"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <input
                      type="checkbox"
                      checked={to.includes(email)}
                      onChange={() => handleToOptionToggle(email)}
                    />
                    <span>{email}</span>
                  </label>
                ))}

                {!filteredToEmails.length && (
                  <div className="dropdown-item dropdown-item-disabled">
                    No recipients found
                  </div>
                )}
              </div>
            )}
          </div>
          {errors.to && <span className="input-error">{errors.to}</span>}
        </div>

        {/* CC */}
        <div className="form-group">
          <label>CC (Optional):</label>
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
            readOnly
            onBlur={() => validateUpTo("subject")}
            placeholder="Subject will be generated automatically"
          />
          {errors.subject && (
            <span className="input-error">{errors.subject}</span>
          )}
        </div>

        <div className="body-editor-header">
          <label>Body:</label>
          <div className="body-helper">
            <button
              type="button"
              className="body-helper-icon"
              aria-label="Body customization help"
              onClick={() => setShowBodyTooltip((prev) => !prev)}
            >
              <FontAwesomeIcon icon={faCircleInfo} />
            </button>
            {showBodyTooltip && (
              <div className="body-tooltip" role="tooltip">
                This body is auto-filled from the selected type and interface.
                You can customize it before sending.
              </div>
            )}
          </div>
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
          onFocus={handleBodyFocus}
          onClick={() => setShowBodyTooltip(true)}
          onInput={() => {
            setBodyValue(getEditorText());
            if (errors.body) {
              setErrors((prev) => ({ ...prev, body: null }));
            }
          }}
          onBlur={() => {
            validateAll();
            setShowBodyTooltip(false);
          }}
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
