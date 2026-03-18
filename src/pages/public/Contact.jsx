import LoginNavbar from "../../components/LoginNavbar";
import "./Contact.css";

export default function Contact() {
  return (
    <div className="contact-page">

      {/* LOGIN PAGE NAVBAR */}
      <LoginNavbar />

      {/* Top Section */}
      <div className="contact-info">
        <div className="contact-top">
          <div className="contact-left">
            <h1>Get In Touch</h1>
            <p>
              We’d love to hear from you. Whether you have questions or need support,
              our team is here to help.
            </p>
          </div>

          <div className="contact-right">
            <div className="contact-card">
              <div className="icon-box">
                <i className="ri-map-pin-line"></i>
              </div>
              <h4>Our Address</h4>
              <p>
                Unit 1.10, The Light Box<br />
                111 Power Road, Chiswick<br />
                W4 5PY, London
              </p>
            </div>

            <div className="contact-card">
              <div className="icon-box">
                <i className="ri-phone-line"></i>
              </div>
              <h4>Our Contact Info</h4>
              <a href="tel:+442036098831">+44 203 609 8831</a>
              <a href="mailto:info@yourcompany.co.uk">
                info@yourcompany.co.uk
              </a>
            </div>
          </div>
        </div>

        <div className="map-section">
          <a
            href="https://www.google.com/maps?q=Unit+1.10,+The+Light+Box,+111+Power+Road,+Chiswick,+W4+5PY,+London"
            target="_blank"
            rel="noopener noreferrer"
            className="direction-btn"
          >
            Get Directions →
          </a>

          <iframe
            title="Office Location"
            src="https://www.google.com/maps?q=Unit+1.10,+The+Light+Box,+111+Power+Road,+Chiswick,+W4+5PY,+London&output=embed"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
