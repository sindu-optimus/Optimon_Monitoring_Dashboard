import React from "react";
import LoginNavbar from "../../components/LoginNavbar";
import whyChooseUsImg from "../../assets/why-choose-us.webp";
import "./About.css";

const About = () => {
  return (
    <div className="about-container">
      <LoginNavbar />

      {/* Hero Section */}
      <section className="about-hero">
        <h1>About Optimus IT Infra</h1>
        <p>
          Empowering healthcare organisations through reliable and innovative
          IT integration solutions.
        </p>
      </section>

      {/* Who We Are */}
      <section className="about-section">
        <h2>Who We Are</h2>
        <p>
          Optimus IT Infra is a technology partner specialising in healthcare
          integration and digital transformation. With over 12 years of
          experience, we support NHS and private healthcare organisations in
          building secure, scalable, and interoperable systems.
        </p>
      </section>

      {/* What We Do */}
      <section className="about-section gray-bg">
        <h2 className="center">What We Do</h2>

        <div className="services-grid">
          {[
            {
              title: "Healthcare Integration",
              desc: "Seamless data flow between healthcare systems.",
            },
            {
              title: "HL7 & FHIR Solutions",
              desc: "Industry-standard interoperability services.",
            },
            {
              title: "Cloud Migration",
              desc: "Secure and scalable cloud infrastructure.",
            },
            {
              title: "24/7 Monitoring & Support",
              desc: "Always-on system monitoring and maintenance.",
            },
            {
              title: "Consulting & Advisory",
              desc: "Strategic digital transformation guidance.",
            },
          ].map((item, index) => (
            <div className="service-card" key={index}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Our Approach */}
      <section className="about-section">
        <h2>Our Approach</h2>
        <p>
          We follow a collaborative and customer-first approach to deliver
          secure, flexible, and future-ready IT solutions using industry
          best practices.
        </p>
      </section>

      {/* Why Choose Us */}
      <section className="about-section gray-bg">

        <div className="why-us-container">

          {/* Image */}
          <div className="why-us-image">
            <img src={whyChooseUsImg} alt="Why Choose Us" />
          </div>

          {/* Content */}
          <div className="why-us-content">

            <h2>Why Choose Us</h2>

            <p className="why-intro">
              Trusted by healthcare organisations for secure, scalable,
              and future-ready IT solutions.
            </p>

            <div className="why-grid">

              {[
                {
                  title: "Deep Healthcare Expertise",
                  desc: "Over a decade of NHS and private healthcare experience.",
                },
                {
                  title: "Proven Integration",
                  desc: "HL7 and FHIR-based interoperability solutions.",
                },
                {
                  title: "24/7 Support",
                  desc: "Continuous monitoring and rapid response.",
                },
                {
                  title: "Secure Systems",
                  desc: "Compliance-focused and future-ready platforms.",
                },
                {
                  title: "Client Partnership",
                  desc: "Transparent and collaborative engagement.",
                },
                {
                  title: "Industry Trust",
                  desc: "Proven delivery across UK healthcare.",
                },
              ].map((item, index) => (
                <div className="why-item" key={index}>
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              ))}

            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="about-section about-mission">
        <h2>Our Mission</h2>
        <p>
          Empowering healthcare providers through innovative,
          interoperable, and dependable IT solutions.
        </p>
      </section>

    </div>
  );
};

export default About;
