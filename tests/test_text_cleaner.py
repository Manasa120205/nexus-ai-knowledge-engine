import pytest
from backend.app.ingestion.text_cleaner import clean_extracted_text, extract_focused_keyword_snippet


def test_clean_extracted_text_fixes_spacing_symbols_ligatures():
    # Ligatures
    raw = "The speci\ufb01c and e\ufb00ective algo\ufb02w."
    cleaned = clean_extracted_text(raw)
    assert "specific and effective" in cleaned

    # Punctuation missing spaces
    raw_punc = "The database uses WAL.Next,it checkpoints.Finally:finished"
    cleaned_punc = clean_extracted_text(raw_punc)
    assert "WAL. Next, it checkpoints. Finally: finished" in cleaned_punc

    # Missing space before and after parenthesis
    raw_paren = "table(user_id)has index"
    cleaned_paren = clean_extracted_text(raw_paren)
    assert "table (user_id) has index" in cleaned_paren

    # Broken symbols and unprintable chars
    raw_symbols = "Section \uf0b7 Item \u2022 \x00\x1f Data \ufffd values"
    cleaned_symbols = clean_extracted_text(raw_symbols)
    assert "\uf0b7" not in cleaned_symbols
    assert "\ufffd" not in cleaned_symbols
    assert "Section Item Data values" in cleaned_symbols


def test_extract_focused_keyword_snippet_extracts_only_relevant_info():
    long_doc = (
        "The system architecture incorporates several foundational principles established during the initial research phase. "
        "For example, Database Internals: Storage Engines outlines how the Write-Ahead Log (WAL) ensures ACID durability across transient hardware failures and node crashes. "
        "In addition, secondary indexes are maintained asynchronously to prevent write stalls. "
        "Finally, checkpointing truncates obsolete log segments periodically to manage disk space consumption over extended lifetimes."
    )

    # Search for "WAL" or "ACID durability"
    snippet = extract_focused_keyword_snippet(long_doc, "WAL durability", max_chars=180)
    assert "Write-Ahead Log (WAL) ensures ACID durability" in snippet
    # Ensure it didn't dump the irrelevant preamble or trailing parts
    assert "initial research phase" not in snippet
    assert "extended lifetimes" not in snippet
