//! AI Module
//!
//! Provides AI-powered features for Noteece:
//! - RAG (Retrieval-Augmented Generation) for "Chat with your Vault"
//! - Document analysis and summarization
//! - Smart suggestions and completions
//!
//! SPDX-License-Identifier: AGPL-3.0-or-later
//! Copyright (c) 2024-2025 Amirreza 'Farnam' Taheri <taherifarnam@gmail.com>

pub mod rag;

pub use rag::{
    DocumentChunk, RagConfig, RagError, RagPipeline, RagQuery, RagResponse, RagStats,
    SearchResult,
};

