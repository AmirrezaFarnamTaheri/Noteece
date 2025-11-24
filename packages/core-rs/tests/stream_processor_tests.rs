#[test]
fn test_stream_processor_logic() {
    use core_rs::social::stream_processor::StreamProcessor;

    let mut processor = StreamProcessor::new();

    // Simulate input stream
    // Text: handle\ntime\ncontent
    let input = "@someuser\n2h\nThis is a test post that is long enough to be content.";
    processor.ingest(input);

    // Verify candidate was found
    let candidate = processor.get_latest_candidate();
    assert!(candidate.is_some(), "Should have found a candidate");
    let c = candidate.unwrap();
    assert_eq!(c.author_handle, Some("@someuser".to_string()));
    assert_eq!(
        c.content_text,
        "This is a test post that is long enough to be content."
    );

    // Simulate new content replacing old one
    let input2 = "@other\n5m\nNew content here with sufficient length.";
    processor.ingest(input2);

    let candidate2 = processor.get_latest_candidate();
    assert!(candidate2.is_some());
    let c2 = candidate2.unwrap();
    assert_eq!(c2.author_handle, Some("@other".to_string()));
}
