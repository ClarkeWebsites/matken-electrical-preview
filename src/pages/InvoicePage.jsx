import { useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  EnvelopeSimple,
  Info,
  LockKey,
  Phone,
  Receipt,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Link } from "react-router";
import { business } from "../data/site.js";
import "./InvoicePage.css";
import {
  providerConfig,
  requestInvoiceAccess,
} from "../lib/providerConfig.js";

export function InvoicePage() {
  const [invoiceReference, setInvoiceReference] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (invoiceReference.trim().length < 5) {
      nextErrors.invoiceReference = "Enter the reference shown on the invoice.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Enter the email address associated with the invoice.";
    }
    setErrors(nextErrors);
    setMessage(null);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const result = await requestInvoiceAccess({
        invoiceReference: invoiceReference.trim(),
        email: email.trim(),
      });
      setMessage(result);
    } catch (error) {
      setMessage({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "If the details match an invoice, a secure access link will be sent.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="invoice-hero">
        <div className="shell invoice-hero-grid">
          <div>
            <span className="section-index section-index-light">
              Secure invoice access
            </span>
            <h1>Pay through a private link—not a public invoice page.</h1>
            <p>
              Enter the reference and billing email. When the payment provider
              is connected, matching customers receive a private hosted payment
              link.
            </p>
            {providerConfig.paymentMode === "preview" ? (
              <div className="provider-preview-banner" role="status">
                <Info size={20} weight="fill" aria-hidden="true" />
                <p>
                  Preview only. This page does not look up invoices, email a
                  payment link, or accept payment.
                </p>
              </div>
            ) : null}
            <div className="invoice-trust-list">
              <span>
                <LockKey size={19} aria-hidden="true" />
                No card details handled by this website
              </span>
              <span>
                <ShieldCheck size={19} aria-hidden="true" />
                No public invoice-number lookup
              </span>
              <span>
                <Receipt size={19} aria-hidden="true" />
                Provider-hosted payment and receipt
              </span>
            </div>
          </div>
          <form className="invoice-access-card" onSubmit={handleSubmit} noValidate>
            <div className="invoice-card-heading">
              <Receipt size={28} weight="duotone" aria-hidden="true" />
              <div>
                <h2>Find your secure payment link</h2>
                <p>Use the details from the invoice message.</p>
              </div>
            </div>

            <label className="field">
              <span>Invoice reference</span>
              <input
                value={invoiceReference}
                onChange={(event) => {
                  setInvoiceReference(event.target.value);
                  setErrors((current) => ({
                    ...current,
                    invoiceReference: undefined,
                  }));
                }}
                placeholder="Example: MKN-INV-0000"
                autoComplete="off"
                aria-invalid={Boolean(errors.invoiceReference)}
                aria-describedby={
                  errors.invoiceReference
                    ? "invoice-reference-error"
                    : undefined
                }
              />
              {errors.invoiceReference ? (
                <small
                  className="field-error"
                  id="invoice-reference-error"
                  role="alert"
                >
                  {errors.invoiceReference}
                </small>
              ) : null}
            </label>

            <label className="field">
              <span>Billing email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((current) => ({
                    ...current,
                    email: undefined,
                  }));
                }}
                autoComplete="email"
                placeholder="name@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? "billing-email-error" : undefined
                }
              />
              {errors.email ? (
                <small
                  className="field-error"
                  id="billing-email-error"
                  role="alert"
                >
                  {errors.email}
                </small>
              ) : null}
            </label>

            <button
              className="button button-sun button-full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Checking securely…" : "Request secure access"}
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </button>

            <p className="privacy-line">
              We return the same response whether an invoice matches or not,
              helping prevent invoice enumeration.
            </p>

            {message ? (
              <div
                className={`invoice-message${message.ok ? " success" : ""}`}
                role="status"
              >
                <Info size={20} weight="fill" aria-hidden="true" />
                <p>
                  {message.message}
                  {message.mode === "preview" ? (
                    <>
                      {" "}
                      Call <a href={`tel:${business.phoneHref}`}>{business.phoneDisplay}</a>{" "}
                      for current payment instructions.
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}

            {providerConfig.paymentMode === "preview" ? (
              <div className="provider-state">
                Prototype state · payment provider selection pending
              </div>
            ) : null}
          </form>
        </div>
      </section>

      <section className="section invoice-process">
        <div className="shell">
          <div className="section-heading">
            <span className="section-index">How invoice payment will work</span>
            <h2>A short path with a clear authority.</h2>
          </div>
          <div className="invoice-process-grid">
            <article>
              <EnvelopeSimple size={27} weight="duotone" aria-hidden="true" />
              <span>01</span>
              <h3>Receive the invoice</h3>
              <p>
                Matken sends a finalized invoice through the selected billing
                provider—not a hand-edited website total.
              </p>
            </article>
            <article>
              <LockKey size={27} weight="duotone" aria-hidden="true" />
              <span>02</span>
              <h3>Open a private link</h3>
              <p>
                The customer opens a provider-hosted page tied to that invoice
                and customer.
              </p>
            </article>
            <article>
              <ShieldCheck size={27} weight="duotone" aria-hidden="true" />
              <span>03</span>
              <h3>Pay on the provider</h3>
              <p>
                Card or other payment details remain on the eligible processor
                surface.
              </p>
            </article>
            <article>
              <CheckCircle size={27} weight="duotone" aria-hidden="true" />
              <span>04</span>
              <h3>Receive confirmation</h3>
              <p>
                Payment status and receipts come from verified provider events,
                never from the browser redirect alone.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section invoice-help">
        <div className="shell invoice-help-card">
          <div>
            <span className="section-index section-index-light">
              Need help with an invoice?
            </span>
            <h2>Use the verified phone number.</h2>
            <p>
              Do not send card numbers, bank credentials, one-time codes, or
              identity documents through a general request form.
            </p>
          </div>
          <a className="button button-sun" href={`tel:${business.phoneHref}`}>
            <Phone size={19} weight="fill" aria-hidden="true" />
            Call {business.phoneDisplay}
          </a>
          <Link className="button button-light" to="/request">
            General project request
          </Link>
        </div>
      </section>
    </>
  );
}
