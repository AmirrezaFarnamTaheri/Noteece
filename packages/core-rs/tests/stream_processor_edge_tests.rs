#[test]
fn test_stream_processor_edge_cases() {
    use core_rs::social::stream_processor::StreamProcessor;

    let mut processor = StreamProcessor::new();

    // Empty input
    processor.ingest("");
    assert!(processor.get_latest_candidate().is_none());

    // Partial input (not enough lines)
    processor.ingest("@handle\n2m");
    assert!(processor.get_latest_candidate().is_none());

    // Input with valid handle but invalid time
    processor.ingest("@handle\nInvalidTime\nContent");
    assert!(processor.get_latest_candidate().is_none());

    // Input with valid time but invalid handle
    processor.ingest("NotAHandle\n2m\nContent");
    assert!(processor.get_latest_candidate().is_none());

    // Valid input
    // Content must be > 20 chars
    processor.ingest("@handle\n2m\nValid Content Here That Is Definitely Long Enough");
    assert!(processor.get_latest_candidate().is_some());

    // Duplicate input
    processor.ingest("@handle\n2m\nValid Content Here That Is Definitely Long Enough");
    // Should still be the same candidate, but let's check if it updates or stays
    // The logic updates if dedup check passes. If content is same, dedup filter blocks it?
    // The bloom filter checks content_text.
    // First ingest adds it to bloom filter. Second ingest should find it in bloom filter and NOT update latest_candidate?
    // Wait, if it's the *same* candidate, does it matter?
    // Let's reset latest_candidate to None to verify it DOESNT set it again.

    // Actually, `latest_candidate` is just a stored Option.
    // If I want to test dedup, I need to see if `latest_candidate` changes timestamp or something.
    // But `CapturedPost` has a timestamp generated inside.

    let first_capture = processor.get_latest_candidate().unwrap();
    // sleep for 1 sec to ensure timestamp diff if it were to re-capture
    std::thread::sleep(std::time::Duration::from_secs(1));

    processor.ingest("@handle\n2m\nValid Content Here That Is Definitely Long Enough");
    let second_capture = processor.get_latest_candidate().unwrap();

    // Timestamps should be equal if dedup worked (because it didn't create a new capture)
    assert_eq!(first_capture.captured_at, second_capture.captured_at);
}
