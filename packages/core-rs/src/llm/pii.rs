use regex::Regex;

/// Redacts Personally Identifiable Information (PII) from the input text.
///
/// Handles:
/// - Emails
/// - Phone numbers
/// - Credit card numbers
/// - IP addresses
pub fn redact_pii(text: &str) -> String {
    let email_regex = Regex::new(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b").unwrap();
    let phone_regex = Regex::new(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b").unwrap();
    let ip_regex = Regex::new(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b").unwrap();

    // Simple credit card regex (Luhn algorithm check would be better but this is a heuristic)
    let cc_regex = Regex::new(r"\b(?:\d{4}[- ]?){3}\d{4}\b").unwrap();

    let text = email_regex.replace_all(text, "[EMAIL]");
    let text = phone_regex.replace_all(&text, "[PHONE]");
    let text = ip_regex.replace_all(&text, "[IP]");
    let text = cc_regex.replace_all(&text, "[CREDIT_CARD]");

    text.to_string()
}
